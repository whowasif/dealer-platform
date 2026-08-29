import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { SessionTokenPayload, SessionUser, UserRoleAssignment } from "./types";
import { query, queryOne } from "./db";
import type { UserRow } from "./types";

export const SESSION_COOKIE = "dealer_session";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to .env.local.");
  }
  return new TextEncoder().encode(secret);
}

function maxAgeSeconds(): number {
  const raw = process.env.SESSION_MAX_AGE;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8 * 60 * 60;
}

/** Sign a JWT and store it in an httpOnly cookie. */
export async function createSession(payload: SessionTokenPayload): Promise<void> {
  const maxAge = maxAgeSeconds();
  const token = await new SignJWT({ name: payload.name, phone: payload.phone })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecret());

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/** Clear the session cookie (logout). */
export function destroySession(): void {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Verify the raw token string and return its payload, or null if invalid. */
export async function verifyToken(
  token: string | undefined
): Promise<SessionTokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      name: (payload.name as string) ?? "",
      phone: (payload.phone as string) ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the full session user (with roles + scopes) from the cookie.
 * Returns null when unauthenticated or the user no longer exists / is inactive.
 * This runs in server components and server actions (Node runtime, DB access).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await queryOne<UserRow>(
    `SELECT id, full_name, phone, official_email, status
       FROM users
      WHERE id = $1`,
    [payload.sub]
  );
  if (!user || (user.status && user.status !== "active")) return null;

  const roles = await query<UserRoleAssignment>(
    `SELECT r.id            AS role_id,
            r.name          AS role_name,
            r.display_name  AS role_display_name,
            r.level         AS level,
            ur.scope_division_id,
            ur.scope_district_id,
            ur.scope_upazila_id
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.level ASC`,
    [user.id]
  );

  // Highest authority = lowest level number. Default to representative level.
  const highestLevel = roles.length
    ? Math.min(...roles.map((r) => r.level))
    : 5;
  const primary =
    roles.find((r) => r.level === highestLevel)?.role_name ??
    "upazila_representative";

  return {
    id: user.id,
    full_name: user.full_name,
    phone: user.phone,
    official_email: user.official_email,
    roles,
    highestLevel,
    primaryRole: primary,
  };
}

/** Like getSessionUser but throws/redirect-friendly for protected pages. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    // Callers in server components should redirect; middleware already guards
    // most routes, but this is a defense-in-depth safeguard.
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
