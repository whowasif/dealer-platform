import "server-only";
import bcrypt from "bcryptjs";
import { query, queryOne } from "./db";

// -----------------------------------------------------------------------------
// Profile — a user's own account data + self-service edits and password change.
// All functions operate on the *current* user id (no cross-user access here).
// -----------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  full_name: string;
  phone: string;
  personal_email: string | null;
  official_email: string | null;
  nid_number: string | null;
  father_name: string | null;
  mother_name: string | null;
  address: string | null;
  avatar_url: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_branch: string | null;
  mobile_banking_no: string | null;
  nominee_name: string | null;
  nominee_phone: string | null;
  nominee_relation: string | null;
  status: string | null;
  created_at: string;
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  return queryOne<ProfileRow>(
    `SELECT id, full_name, phone, personal_email, official_email, nid_number,
            father_name, mother_name, address, avatar_url,
            bank_name, bank_account_no, bank_branch, mobile_banking_no,
            nominee_name, nominee_phone, nominee_relation, status, created_at
       FROM users
      WHERE id = $1`,
    [userId]
  );
}

export interface ProfileUpdate {
  personal_email: string | null;
  address: string | null;
  father_name: string | null;
  mother_name: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_branch: string | null;
  mobile_banking_no: string | null;
  nominee_name: string | null;
  nominee_phone: string | null;
  nominee_relation: string | null;
}

/** Update the editable, non-sensitive fields of the user's own profile. */
export async function updateProfile(
  userId: string,
  data: ProfileUpdate
): Promise<void> {
  await query(
    `UPDATE users SET
        personal_email = $2,
        address = $3,
        father_name = $4,
        mother_name = $5,
        bank_name = $6,
        bank_account_no = $7,
        bank_branch = $8,
        mobile_banking_no = $9,
        nominee_name = $10,
        nominee_phone = $11,
        nominee_relation = $12,
        updated_at = NOW()
      WHERE id = $1`,
    [
      userId,
      data.personal_email,
      data.address,
      data.father_name,
      data.mother_name,
      data.bank_name,
      data.bank_account_no,
      data.bank_branch,
      data.mobile_banking_no,
      data.nominee_name,
      data.nominee_phone,
      data.nominee_relation,
    ]
  );
}

/**
 * Change the user's password after verifying the current one.
 * Returns null on success, or an error message string.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<string | null> {
  const row = await queryOne<{ password_hash: string | null }>(
    `SELECT password_hash FROM users WHERE id = $1`,
    [userId]
  );
  if (!row?.password_hash) {
    return "No password is set on this account.";
  }
  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) {
    return "Current password is incorrect.";
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await query(
    `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
    [userId, hash]
  );
  return null;
}
