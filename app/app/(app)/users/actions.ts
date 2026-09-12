"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { canMutateUsers } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

// Optional string that becomes null when blank.
const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const bankAccountType = z
  .enum(["savings", "current", "other"])
  .nullable()
  .optional();

const createUserSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  personal_email: optionalString,
  official_email: optionalString,
  nid_number: optionalString,
  password: z.string().min(6, "Password must be at least 6 characters"),
  // Bank
  bank_name: optionalString,
  bank_account_no: optionalString,
  bank_account_type: bankAccountType,
  bank_branch: optionalString,
  bank_routing_no: optionalString,
  mobile_banking_no: optionalString,
  // Nominee
  nominee_name: optionalString,
  nominee_nid: optionalString,
  nominee_phone: optionalString,
  nominee_address: optionalString,
  nominee_relation: optionalString,
  // Role: exactly one role, with a single scope group.
  role_id: z.string().uuid("Select a role"),
});

export interface CreateUserState {
  error?: string;
  success?: string;
}

function scopeToUuidOrNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  // Server-side authorization: super admin only for mutations.
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!canMutateUsers(actor)) {
    return { error: "Only the super admin can create users." };
  }

  const parsed = createUserSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    personal_email: formData.get("personal_email"),
    official_email: formData.get("official_email"),
    nid_number: formData.get("nid_number"),
    password: formData.get("password"),
    bank_name: formData.get("bank_name"),
    bank_account_no: formData.get("bank_account_no"),
    bank_account_type: (formData.get("bank_account_type") as string) || null,
    bank_branch: formData.get("bank_branch"),
    bank_routing_no: formData.get("bank_routing_no"),
    mobile_banking_no: formData.get("mobile_banking_no"),
    nominee_name: formData.get("nominee_name"),
    nominee_nid: formData.get("nominee_nid"),
    nominee_phone: formData.get("nominee_phone"),
    nominee_address: formData.get("nominee_address"),
    nominee_relation: formData.get("nominee_relation"),
    role_id: formData.get("role_id"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;
  const passwordHash = await bcrypt.hash(d.password, 10);

  // Single scope group for the selected role.
  const scope = {
    division: scopeToUuidOrNull(formData.get("scope_division")),
    district: scopeToUuidOrNull(formData.get("scope_district")),
    upazila: scopeToUuidOrNull(formData.get("scope_upazila")),
  };

  let newUserId = "";
  try {
    await withTransaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO users (
            password_hash, full_name, phone, personal_email, official_email,
            nid_number, bank_name, bank_account_no, bank_account_type,
            bank_branch, bank_routing_no, mobile_banking_no,
            nominee_name, nominee_nid, nominee_phone, nominee_address,
            nominee_relation, status
         ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'active'
         )
         RETURNING id`,
        [
          passwordHash,
          d.full_name,
          d.phone,
          d.personal_email,
          d.official_email,
          d.nid_number,
          d.bank_name,
          d.bank_account_no,
          d.bank_account_type,
          d.bank_branch,
          d.bank_routing_no,
          d.mobile_banking_no,
          d.nominee_name,
          d.nominee_nid,
          d.nominee_phone,
          d.nominee_address,
          d.nominee_relation,
        ]
      );
      const userId = inserted.rows[0].id;
      newUserId = userId;

      await client.query(
        `INSERT INTO user_roles (
            user_id, role_id, scope_division_id, scope_district_id,
            scope_upazila_id, assigned_by
         ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          userId,
          d.role_id,
          scope.division,
          scope.district,
          scope.upazila,
          actor.id,
        ]
      );

      await recordAudit(client, {
        userId: actor.id,
        action: "create",
        tableName: "users",
        recordId: userId,
        newValue: { full_name: d.full_name, phone: d.phone, role_id: d.role_id },
      });
    });
  } catch (err: unknown) {
    // Surface unique-constraint violations in a friendly way.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("users_phone_key")) {
      return { error: "A user with this phone number already exists." };
    }
    if (message.includes("users_official_email_key")) {
      return { error: "A user with this official email already exists." };
    }
    if (message.includes("users_nid_number_key")) {
      return { error: "A user with this NID number already exists." };
    }
    return { error: "Could not create user. Please check the inputs and try again." };
  }

  revalidatePath("/users");
  return { success: `User "${d.full_name}" created successfully.` };
}
