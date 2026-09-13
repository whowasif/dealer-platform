"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { isSuperAdmin } from "@/lib/rbac";
import {
  createInsightCard,
  updateInsightCard,
  deleteInsightCard,
  createNetworkCard,
  updateNetworkCard,
  deleteNetworkCard,
  setContactMessageRead,
  deleteContactMessage,
} from "@/lib/website-content";
import {
  saveWebsiteImage,
  deleteWebsiteImage,
  normalizeImageRef,
} from "@/lib/website-storage";

// -----------------------------------------------------------------------------
// Server actions for public-website content management. SUPER-ADMIN ONLY — every
// action re-checks authorization server-side. Image handling accepts either an
// uploaded file (multipart) written to the website's public/uploads, or an
// existing "/uploads/.." path / external http(s) URL kept as-is.
// -----------------------------------------------------------------------------

export interface WebsiteActionState {
  error?: string;
  success?: string;
}

async function requireSuperAdmin() {
  const actor = await getSessionUser();
  if (!actor) return { actor: null, error: "Not authenticated." as const };
  if (!isSuperAdmin(actor))
    return {
      actor: null,
      error: "Only the super admin can manage website content." as const,
    };
  return { actor, error: null };
}

/**
 * Resolve the image for a card: if a new file was uploaded, save it and return
 * its public path (deleting the previous uploaded file when replacing);
 * otherwise fall back to the provided existing image reference.
 */
async function resolveImage(
  formData: FormData,
  existingRef: string,
  previousUploadedPath: string | null
): Promise<string> {
  const file = formData.get("image_file");
  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveWebsiteImage({ buffer, mimeType: file.type || null });
    // Clean up the old uploaded image if we're replacing one.
    if (previousUploadedPath) await deleteWebsiteImage(previousUploadedPath);
    return saved;
  }
  // No new file — keep/normalize the existing reference (path or URL).
  return normalizeImageRef(existingRef);
}

// ============================ Insight cards ==================================

const insightSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  date_label: z.string().trim().max(60).optional().default(""),
  excerpt: z.string().trim().min(1, "Excerpt is required."),
  image_ref: z.string().trim().default(""),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.boolean().optional().default(true),
});

export async function createInsightAction(
  _prev: WebsiteActionState,
  formData: FormData
): Promise<WebsiteActionState> {
  const { actor, error } = await requireSuperAdmin();
  if (error) return { error };

  const parsed = insightSchema.safeParse({
    title: formData.get("title"),
    date_label: formData.get("date_label") ?? "",
    excerpt: formData.get("excerpt"),
    image_ref: formData.get("image_ref") ?? "",
    sort_order: formData.get("sort_order") ?? 0,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  try {
    const image_url = await resolveImage(formData, parsed.data.image_ref, null);
    await createInsightCard(
      {
        title: parsed.data.title,
        date_label: parsed.data.date_label,
        excerpt: parsed.data.excerpt,
        image_url,
        sort_order: parsed.data.sort_order,
        is_active: parsed.data.is_active,
      },
      actor!.id
    );
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not add card." };
  }

  revalidatePath("/website/insights");
  return { success: "Insight card added." };
}

export async function updateInsightAction(
  _prev: WebsiteActionState,
  formData: FormData
): Promise<WebsiteActionState> {
  const { actor, error } = await requireSuperAdmin();
  if (error) return { error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing card id." };

  const parsed = insightSchema.safeParse({
    title: formData.get("title"),
    date_label: formData.get("date_label") ?? "",
    excerpt: formData.get("excerpt"),
    image_ref: formData.get("image_ref") ?? "",
    sort_order: formData.get("sort_order") ?? 0,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  try {
    const prevUploaded = parsed.data.image_ref.startsWith("/uploads/")
      ? parsed.data.image_ref
      : null;
    const image_url = await resolveImage(
      formData,
      parsed.data.image_ref,
      prevUploaded
    );
    await updateInsightCard(
      id,
      {
        title: parsed.data.title,
        date_label: parsed.data.date_label,
        excerpt: parsed.data.excerpt,
        image_url,
        sort_order: parsed.data.sort_order,
        is_active: parsed.data.is_active,
      },
      actor!.id
    );
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not update card." };
  }

  revalidatePath("/website/insights");
  return { success: "Insight card updated." };
}

export async function deleteInsightAction(
  _prev: WebsiteActionState,
  formData: FormData
): Promise<WebsiteActionState> {
  const { error } = await requireSuperAdmin();
  if (error) return { error };

  const id = String(formData.get("id") ?? "");
  const imageRef = String(formData.get("image_ref") ?? "");
  if (!id) return { error: "Missing card id." };

  try {
    await deleteInsightCard(id);
    if (imageRef.startsWith("/uploads/")) await deleteWebsiteImage(imageRef);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not delete card." };
  }

  revalidatePath("/website/insights");
  return { success: "Insight card deleted." };
}

// ============================ Network cards ==================================

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const networkSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  caption: z.string().trim().max(300).optional().default(""),
  accent_color: z
    .string()
    .trim()
    .regex(HEX_RE, "Accent colour must be a hex value like #F9D616.")
    .default("#F9D616"),
  image_ref: z.string().trim().default(""),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.boolean().optional().default(true),
});

export async function createNetworkAction(
  _prev: WebsiteActionState,
  formData: FormData
): Promise<WebsiteActionState> {
  const { actor, error } = await requireSuperAdmin();
  if (error) return { error };

  const parsed = networkSchema.safeParse({
    title: formData.get("title"),
    caption: formData.get("caption") ?? "",
    accent_color: formData.get("accent_color") || "#F9D616",
    image_ref: formData.get("image_ref") ?? "",
    sort_order: formData.get("sort_order") ?? 0,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  try {
    const image_url = await resolveImage(formData, parsed.data.image_ref, null);
    await createNetworkCard(
      {
        title: parsed.data.title,
        caption: parsed.data.caption,
        accent_color: parsed.data.accent_color,
        image_url,
        sort_order: parsed.data.sort_order,
        is_active: parsed.data.is_active,
      },
      actor!.id
    );
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not add card." };
  }

  revalidatePath("/website/network");
  return { success: "Network card added." };
}

export async function updateNetworkAction(
  _prev: WebsiteActionState,
  formData: FormData
): Promise<WebsiteActionState> {
  const { actor, error } = await requireSuperAdmin();
  if (error) return { error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing card id." };

  const parsed = networkSchema.safeParse({
    title: formData.get("title"),
    caption: formData.get("caption") ?? "",
    accent_color: formData.get("accent_color") || "#F9D616",
    image_ref: formData.get("image_ref") ?? "",
    sort_order: formData.get("sort_order") ?? 0,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  try {
    const prevUploaded = parsed.data.image_ref.startsWith("/uploads/")
      ? parsed.data.image_ref
      : null;
    const image_url = await resolveImage(
      formData,
      parsed.data.image_ref,
      prevUploaded
    );
    await updateNetworkCard(
      id,
      {
        title: parsed.data.title,
        caption: parsed.data.caption,
        accent_color: parsed.data.accent_color,
        image_url,
        sort_order: parsed.data.sort_order,
        is_active: parsed.data.is_active,
      },
      actor!.id
    );
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not update card." };
  }

  revalidatePath("/website/network");
  return { success: "Network card updated." };
}

export async function deleteNetworkAction(
  _prev: WebsiteActionState,
  formData: FormData
): Promise<WebsiteActionState> {
  const { error } = await requireSuperAdmin();
  if (error) return { error };

  const id = String(formData.get("id") ?? "");
  const imageRef = String(formData.get("image_ref") ?? "");
  if (!id) return { error: "Missing card id." };

  try {
    await deleteNetworkCard(id);
    if (imageRef.startsWith("/uploads/")) await deleteWebsiteImage(imageRef);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not delete card." };
  }

  revalidatePath("/website/network");
  return { success: "Network card deleted." };
}

// ========================== Contact messages ================================

export async function markMessageReadAction(
  _prev: WebsiteActionState,
  formData: FormData
): Promise<WebsiteActionState> {
  const { actor, error } = await requireSuperAdmin();
  if (error) return { error };

  const id = String(formData.get("id") ?? "");
  const read = formData.get("read") === "true";
  if (!id) return { error: "Missing message id." };

  try {
    await setContactMessageRead(id, read, actor!.id);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not update message." };
  }

  revalidatePath("/website/messages");
  return { success: read ? "Marked as read." : "Marked as unread." };
}

export async function deleteMessageAction(
  _prev: WebsiteActionState,
  formData: FormData
): Promise<WebsiteActionState> {
  const { error } = await requireSuperAdmin();
  if (error) return { error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing message id." };

  try {
    await deleteContactMessage(id);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not delete message." };
  }

  revalidatePath("/website/messages");
  return { success: "Message deleted." };
}
