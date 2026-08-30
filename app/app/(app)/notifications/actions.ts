"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { markRead, markAllRead } from "@/lib/notifications";

// -----------------------------------------------------------------------------
// Server actions for notifications. Each acts only on the current user's own
// notifications (enforced in the lib layer by matching user_id).
// -----------------------------------------------------------------------------

export interface ActionState {
  error?: string;
  success?: string;
}

export async function markReadAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing notification." };

  try {
    await markRead(id, actor);
    revalidatePath("/notifications");
    return { success: "Marked read." };
  } catch {
    return { error: "Could not update notification." };
  }
}

export async function markAllReadAction(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  try {
    const n = await markAllRead(actor);
    revalidatePath("/notifications");
    return { success: `Marked ${n} notification${n === 1 ? "" : "s"} read.` };
  } catch {
    return { error: "Could not update notifications." };
  }
}
