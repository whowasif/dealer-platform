"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  createDocument,
  getDocument,
  canViewDocument,
  canUploadForRepresentative,
  resolveOwnerScope,
  verifyDocument,
  deleteDocument,
} from "@/lib/documents";
import { saveFile } from "@/lib/storage";
import type { DocumentRelatedType } from "@/lib/types";

// -----------------------------------------------------------------------------
// Server actions for the documents feature. Every action re-checks
// authorization server-side (never relying on hidden UI). The upload action
// handles multipart/form-data: it reads the File from FormData, validates type
// and size, persists the bytes via the storage abstraction, then inserts the
// row. The server-action body limit is raised to 15mb in next.config.mjs.
// -----------------------------------------------------------------------------

export interface ActionState {
  error?: string;
  success?: string;
  documentId?: string;
}

// Allowed upload MIME types (validated server-side). Extensible.
const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const uploadSchema = z.object({
  category_id: z.string().uuid("Pick a category."),
  related_type: z
    .enum(["representative", "project", "order", "customer", "none"])
    .default("none"),
  related_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  title: z.string().trim().min(2, "Title is required."),
  document_number: optionalText,
  document_date: optionalDate,
  amount: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  expiry_date: optionalDate,
  tags: optionalText,
  notes: optionalText,
});

/** Parse a comma-separated tag string into a clean string[] (jsonb array). */
function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .slice(0, 30)
    )
  );
}

export async function uploadDocumentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const parsed = uploadSchema.safeParse({
    category_id: formData.get("category_id"),
    related_type: formData.get("related_type") ?? "none",
    related_id: formData.get("related_id"),
    title: formData.get("title"),
    document_number: formData.get("document_number"),
    document_date: formData.get("document_date"),
    amount: formData.get("amount"),
    expiry_date: formData.get("expiry_date"),
    tags: formData.get("tags"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid document details." };
  }
  const input = parsed.data;

  // --- file validation ---
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "File is too large (max 15MB)." };
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mimeType)) {
    return {
      error:
        "Unsupported file type. Allowed: PDF, images, Word/Excel, or text/CSV.",
    };
  }

  // --- amount validation (optional) ---
  let amount: number | null = null;
  if (input.amount != null) {
    const n = Number(input.amount);
    if (!Number.isFinite(n) || n < 0) {
      return { error: "Amount must be a non-negative number." };
    }
    amount = Math.round(n * 100) / 100;
  }

  // --- authorization + link resolution ---
  const relatedType =
    input.related_type === "none"
      ? null
      : (input.related_type as DocumentRelatedType);
  const relatedId = input.related_id ?? null;

  let representativeId: string | null = null;
  let projectId: string | null = null;

  if (relatedType && relatedId) {
    const owner = await resolveOwnerScope(relatedType, relatedId);
    if (!owner.label) {
      return { error: "The selected linked item was not found." };
    }
    // If the link resolves to an owning rep, the uploader must be allowed to
    // upload for that rep. If it resolves to no rep (e.g. a non-rep user),
    // restrict to HQ.
    if (owner.representative_id) {
      const allowed = await canUploadForRepresentative(
        actor,
        owner.representative_id
      );
      if (!allowed) {
        return {
          error: "You are not authorized to upload documents for that item.",
        };
      }
      representativeId = owner.representative_id;
      projectId = owner.project_id;
    } else if (!isHQ(actor)) {
      return {
        error: "Only HQ can upload documents that are not tied to a representative.",
      };
    }
  } else if (relatedType && !relatedId) {
    return { error: "Choose the specific item to link this document to." };
  }
  // Unlinked document: any authenticated user may upload (owned by uploader).

  // --- persist the file, then the row ---
  let documentId: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveFile({
      buffer,
      originalName: file.name,
      mimeType,
    });

    documentId = await createDocument({
      categoryId: input.category_id,
      relatedType,
      relatedId,
      representativeId,
      projectId,
      title: input.title,
      storageKey: saved.storageKey,
      fileSize: saved.fileSize,
      mimeType,
      documentNumber: input.document_number ?? null,
      documentDate: input.document_date ?? null,
      amount,
      expiryDate: input.expiry_date ?? null,
      tags: parseTags(input.tags),
      notes: input.notes ?? null,
      uploadedBy: actor.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not upload document.";
    return { error: msg };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  return { success: "Document uploaded.", documentId };
}

// ------------------------------- Verify (HQ) ---------------------------------

export async function verifyDocumentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor)) return { error: "Only HQ can verify documents." };

  const id = String(formData.get("document_id") ?? "");
  if (!id) return { error: "Missing document." };

  const doc = await getDocument(id);
  if (!doc) return { error: "Document not found." };

  try {
    await verifyDocument(id, actor);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not verify document.";
    return { error: msg };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  return { success: "Document verified." };
}

// ------------------------------- Delete (HQ) ---------------------------------

export async function deleteDocumentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor)) return { error: "Only HQ can delete documents." };

  const id = String(formData.get("document_id") ?? "");
  if (!id) return { error: "Missing document." };

  const doc = await getDocument(id);
  if (!doc) return { error: "Document not found." };
  // Defense-in-depth: HQ may view anything, but keep the check consistent.
  if (!canViewDocument(actor, doc)) {
    return { error: "You are not authorized for this document." };
  }

  try {
    await deleteDocument(id, actor);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not delete document.";
    return { error: msg };
  }

  revalidatePath("/documents");
  return { success: "Document deleted." };
}
