"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { approve, type ApprovableKind } from "@/lib/approvals";

export interface ApprovalActionState {
  error?: string;
  success?: string;
}

const schema = z.object({
  kind: z.enum(["order", "project"]),
  id: z.string().uuid(),
});

export async function approveAction(
  _prev: ApprovalActionState,
  formData: FormData
): Promise<ApprovalActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = schema.safeParse({
    kind: formData.get("kind"),
    id: formData.get("id"),
  });
  if (!parsed.success) return { error: "Invalid approval request." };

  const kind = parsed.data.kind as ApprovableKind;
  const id = parsed.data.id;

  try {
    const res = await approve(kind, id, user);
    const path = kind === "order" ? `/orders/${id}` : `/projects/${id}`;
    revalidatePath(path);
    revalidatePath(kind === "order" ? "/orders" : "/projects");
    return {
      success: res.fullyApproved
        ? "Fully approved — item is now active."
        : `Recorded your ${res.stage === "division" ? "divisional" : "HQ"} approval.`,
    };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Could not record approval.",
    };
  }
}
