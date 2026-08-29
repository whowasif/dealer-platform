"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { queryOne } from "./db";
import { createSession, destroySession } from "./session";
import type { UserRow } from "./types";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Phone or email is required"),
  password: z.string().min(1, "Password is required"),
});

export interface LoginState {
  error?: string;
}

/**
 * Server action: authenticate a user by phone OR official_email + password.
 * On success, issues a JWT httpOnly cookie and redirects to /dashboard.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const { identifier, password } = parsed.data;

  // Look up by phone or official_email. Parameterized — no string concatenation.
  const user = await queryOne<UserRow>(
    `SELECT id, password_hash, full_name, phone, official_email, status
       FROM users
      WHERE phone = $1 OR official_email = $1
      LIMIT 1`,
    [identifier]
  );

  // Generic error message to avoid leaking which field was wrong.
  const invalid: LoginState = { error: "Invalid credentials" };

  if (!user || !user.password_hash) return invalid;
  if (user.status && user.status !== "active") {
    return { error: "This account is not active. Contact an administrator." };
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return invalid;

  await createSession({
    sub: user.id,
    name: user.full_name,
    phone: user.phone,
  });

  redirect("/dashboard");
}

/** Server action: clear the session cookie and return to /login. */
export async function logoutAction(): Promise<void> {
  destroySession();
  redirect("/login");
}
