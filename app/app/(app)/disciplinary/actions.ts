"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import {
  createDisciplinary,
  resolveDisciplinary,
  canManageDisciplinary,
} from "@/lib/disciplinary";

// -----------------------------------------------------------------------------
// Server actions for disciplinary records. Every action re-checks authorization
// server-side: only HQ + divisional_head may issue or resolve (the lib layer
// re-checks and also enforces the div-head division constraint).
// -----------------------------------------------------------------------------

export interface ActionState {
  error?: string;
  success?: string;
}

const createSchema = z
  .object({
    representative_id: z.string().uuid("Pick a representative."),
    action_type: z.enum(["written_warning", "suspension", "termination"]),
    reason: z.string().trim().min(1, "A reason is required."),
    issued_date: z.string().trim().min(1, "Pick an issue date."),
    effective_from: z.string().trim().min(1, "Pick an effective date."),
    effective_to: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
  })
  .refine(
    (v) => !v.effective_to || v.effective_to >= v.effective_from,
    { message: "Effective-to cannot be before effective-from.", path: ["effective_to"] }
  );

export async function createDisciplinaryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!canManageDisciplinary(actor)) {
    return { error: "You are not authorized to issue disciplinary actions." };
  }

  const parsed = createSchema.safeParse({
    representative_id: formData.get("representative_id"),
    action_type: formData.get("action_type"),
    reason: formData.get("reason"),
    issued_date: formData.get("issued_date"),
    effective_from: formData.get("effective_from"),
    effective_to: formData.get("effective_to"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }
  const c = parsed.data;

  try {
    await createDisciplinary(
      {
        representativeId: c.representative_id,
        actionType: c.action_type,
        reason: c.reason,
        issuedDate: c.issued_date,
        effectiveFrom: c.effective_from,
        effectiveTo: c.effective_to ?? null,
      },
      actor
    );
    revalidatePath("/disciplinary");
    revalidatePath(`/representatives/${c.representative_id}`);
    return { success: "Disciplinary action recorded and the representative notified." };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Could not record the action.";
    return { error: msg };
  }
}

const resolveSchema = z.object({
  id: z.string().uuid(),
  resolution_notes: z.string().trim().min(1, "Resolution notes are required."),
});

export async function resolveDisciplinaryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!canManageDisciplinary(actor)) {
    return { error: "You are not authorized to resolve disciplinary actions." };
  }

  const parsed = resolveSchema.safeParse({
    id: formData.get("id"),
    resolution_notes: formData.get("resolution_notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  try {
    await resolveDisciplinary(parsed.data.id, parsed.data.resolution_notes, actor);
    revalidatePath("/disciplinary");
    return { success: "Disciplinary record resolved." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not resolve.";
    return { error: msg };
  }
}
