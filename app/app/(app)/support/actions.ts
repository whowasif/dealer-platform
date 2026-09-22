"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { replyToSupportMessage, sendSupportMessage } from "@/lib/project-workflow";

export interface SupportActionState { error?: string; success?: string; }

export async function sendSupportMessageAction(_prev: SupportActionState, formData: FormData): Promise<SupportActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  try {
    if (actor.roles.some((role) => role.role_name.startsWith("hq") || role.role_name === "super_admin")) {
      await replyToSupportMessage(String(formData.get("recipient_id") ?? ""), String(formData.get("body") ?? ""), actor);
    } else {
      await sendSupportMessage(String(formData.get("recipient_id") ?? ""), String(formData.get("body") ?? ""), actor);
    }
    revalidatePath("/support");
    return { success: "Support message sent." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send support message." };
  }
}