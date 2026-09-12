"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { isSuperAdmin } from "@/lib/rbac";
import {
  createExecutive,
  updateExecutive,
  deleteExecutive,
} from "@/lib/hq-executives";

// -----------------------------------------------------------------------------
// Server actions for HQ Executives. Only the super admin may add / edit / remove
// executives (they reference user accounts and drive money distribution).
// -----------------------------------------------------------------------------

export interface ExecActionState {
  error?: string;
  success?: string;
}

const createSchema = z.object({
  user_id: z.string().uuid("Pick a user."),
  designation: z.string().trim().min(1, "Designation is required."),
  role_weight: z.coerce.number().min(0, "Weight cannot be negative."),
  is_ceo: z.coerce.boolean().optional(),
});

export async function createExecutiveAction(
  _prev: ExecActionState,
  formData: FormData
): Promise<ExecActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isSuperAdmin(actor))
    return { error: "Only the super admin can manage HQ executives." };

  const parsed = createSchema.safeParse({
    user_id: formData.get("user_id"),
    designation: formData.get("designation"),
    role_weight: formData.get("role_weight"),
    is_ceo: formData.get("is_ceo") === "on" || formData.get("is_ceo") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  try {
    await createExecutive(
      {
        user_id: parsed.data.user_id,
        designation: parsed.data.designation,
        role_weight: parsed.data.role_weight,
        is_ceo: parsed.data.is_ceo ?? false,
      },
      actor.id
    );
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Could not add executive.",
    };
  }

  revalidatePath("/executives");
  return { success: "Executive added." };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  designation: z.string().trim().min(1, "Designation is required."),
  role_weight: z.coerce.number().min(0, "Weight cannot be negative."),
  is_ceo: z.coerce.boolean().optional(),
  is_active: z.coerce.boolean().optional(),
});

export async function updateExecutiveAction(
  _prev: ExecActionState,
  formData: FormData
): Promise<ExecActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isSuperAdmin(actor))
    return { error: "Only the super admin can manage HQ executives." };

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    designation: formData.get("designation"),
    role_weight: formData.get("role_weight"),
    is_ceo: formData.get("is_ceo") === "on" || formData.get("is_ceo") === "true",
    is_active:
      formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  try {
    await updateExecutive(
      parsed.data.id,
      {
        designation: parsed.data.designation,
        role_weight: parsed.data.role_weight,
        is_ceo: parsed.data.is_ceo ?? false,
        is_active: parsed.data.is_active ?? false,
      },
      actor.id
    );
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Could not update executive.",
    };
  }

  revalidatePath("/executives");
  return { success: "Executive updated." };
}

export async function deleteExecutiveAction(
  _prev: ExecActionState,
  formData: FormData
): Promise<ExecActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isSuperAdmin(actor))
    return { error: "Only the super admin can manage HQ executives." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing executive id." };

  try {
    await deleteExecutive(id, actor.id);
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Could not remove executive.",
    };
  }

  revalidatePath("/executives");
  return { success: "Executive removed." };
}
