"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { updateProfile, changePassword } from "@/lib/profile";
import { recordAudit } from "@/lib/audit";

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const profileSchema = z.object({
  personal_email: optionalString,
  address: optionalString,
  father_name: optionalString,
  mother_name: optionalString,
  bank_name: optionalString,
  bank_account_no: optionalString,
  bank_branch: optionalString,
  mobile_banking_no: optionalString,
  nominee_name: optionalString,
  nominee_phone: optionalString,
  nominee_relation: optionalString,
});

export interface ProfileState {
  error?: string;
  success?: string;
}

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = profileSchema.safeParse({
    personal_email: formData.get("personal_email"),
    address: formData.get("address"),
    father_name: formData.get("father_name"),
    mother_name: formData.get("mother_name"),
    bank_name: formData.get("bank_name"),
    bank_account_no: formData.get("bank_account_no"),
    bank_branch: formData.get("bank_branch"),
    mobile_banking_no: formData.get("mobile_banking_no"),
    nominee_name: formData.get("nominee_name"),
    nominee_phone: formData.get("nominee_phone"),
    nominee_relation: formData.get("nominee_relation"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  try {
    await updateProfile(user.id, {
      personal_email: parsed.data.personal_email ?? null,
      address: parsed.data.address ?? null,
      father_name: parsed.data.father_name ?? null,
      mother_name: parsed.data.mother_name ?? null,
      bank_name: parsed.data.bank_name ?? null,
      bank_account_no: parsed.data.bank_account_no ?? null,
      bank_branch: parsed.data.bank_branch ?? null,
      mobile_banking_no: parsed.data.mobile_banking_no ?? null,
      nominee_name: parsed.data.nominee_name ?? null,
      nominee_phone: parsed.data.nominee_phone ?? null,
      nominee_relation: parsed.data.nominee_relation ?? null,
    });
    await recordAudit(null, {
      userId: user.id,
      action: "update",
      tableName: "users",
      recordId: user.id,
      newValue: { self_profile_update: true },
    });
  } catch {
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/settings");
  return { success: "Profile updated." };
}

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "New password and confirmation do not match",
    path: ["confirm_password"],
  });

export interface PasswordState {
  error?: string;
  success?: string;
}

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = passwordSchema.safeParse({
    current_password: formData.get("current_password"),
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const err = await changePassword(
    user.id,
    parsed.data.current_password,
    parsed.data.new_password
  );
  if (err) return { error: err };

  await recordAudit(null, {
    userId: user.id,
    action: "update",
    tableName: "users",
    recordId: user.id,
    newValue: { password_changed: true },
  });

  return { success: "Password changed successfully." };
}
