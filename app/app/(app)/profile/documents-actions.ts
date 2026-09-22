"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { createPersonalDocument, deletePersonalDocument } from "@/lib/personal-documents";
import { saveFile } from "@/lib/storage";

export interface PersonalDocumentActionState { error?: string; success?: string; documentId?: string; }

export async function uploadPersonalDocumentAction(
  _prev: PersonalDocumentActionState,
  formData: FormData
): Promise<PersonalDocumentActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  const userId = String(formData.get("user_id") ?? "");
  const documentType = String(formData.get("document_type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const file = formData.get("file");
  if (!userId || !documentType || title.length < 2) return { error: "User, document type, and title are required." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (file.size > 15 * 1024 * 1024) return { error: "File is too large (max 15MB)." };
  try {
    const saved = await saveFile({
      buffer: Buffer.from(await file.arrayBuffer()),
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
    });
    const documentId = await createPersonalDocument({
      userId, documentType, title, storageKey: saved.storageKey,
      fileSize: saved.fileSize, mimeType: file.type || "application/octet-stream",
      notes, uploadedBy: actor.id,
    }, actor);
    revalidatePath("/profile");
    revalidatePath(`/profile/documents/${userId}`);
    return { success: "Personal document saved.", documentId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save personal document." };
  }
}

export async function deletePersonalDocumentAction(
  _prev: PersonalDocumentActionState,
  formData: FormData
): Promise<PersonalDocumentActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  const id = String(formData.get("document_id") ?? "");
  try {
    await deletePersonalDocument(id, actor);
    revalidatePath("/profile");
    return { success: "Personal document deleted." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not delete personal document." };
  }
}