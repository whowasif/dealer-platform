"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import {
  createComplaint,
  assignComplaint,
  updateComplaintStatus,
} from "@/lib/complaints";

// -----------------------------------------------------------------------------
// Server actions for complaints. Filing is open to any authenticated user;
// assigning is HQ-only; status updates are HQ or the assignee. The lib layer
// re-checks all of these authorizations server-side.
// -----------------------------------------------------------------------------

export interface ActionState {
  error?: string;
  success?: string;
}

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const fileSchema = z.object({
  subject: z.string().trim().min(1, "A subject is required."),
  description: z.string().trim().min(1, "A description is required."),
  category: optionalText,
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  complainant_name: optionalText,
  complainant_phone: optionalText,
});

export async function fileComplaintAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const parsed = fileSchema.safeParse({
    subject: formData.get("subject"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority") || "medium",
    complainant_name: formData.get("complainant_name"),
    complainant_phone: formData.get("complainant_phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }
  const c = parsed.data;

  try {
    const { complaint_number } = await createComplaint(
      {
        subject: c.subject,
        description: c.description,
        category: c.category ?? null,
        priority: c.priority,
        complainantName: c.complainant_name ?? null,
        complainantPhone: c.complainant_phone ?? null,
      },
      actor
    );
    revalidatePath("/complaints");
    return { success: `Complaint ${complaint_number} filed.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not file complaint.";
    return { error: msg };
  }
}

const assignSchema = z.object({
  id: z.string().uuid(),
  assignee_user_id: z.string().uuid("Pick an assignee."),
});

export async function assignComplaintAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const parsed = assignSchema.safeParse({
    id: formData.get("id"),
    assignee_user_id: formData.get("assignee_user_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  try {
    await assignComplaint(parsed.data.id, parsed.data.assignee_user_id, actor);
    revalidatePath("/complaints");
    return { success: "Complaint assigned." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not assign.";
    return { error: msg };
  }
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  resolution_notes: optionalText,
});

export async function updateComplaintStatusAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    resolution_notes: formData.get("resolution_notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  try {
    await updateComplaintStatus(
      parsed.data.id,
      parsed.data.status,
      parsed.data.resolution_notes ?? null,
      actor
    );
    revalidatePath("/complaints");
    return { success: "Complaint updated." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not update.";
    return { error: msg };
  }
}
