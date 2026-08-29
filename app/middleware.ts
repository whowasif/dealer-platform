import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// -----------------------------------------------------------------------------
// Route protection middleware (Edge runtime).
// Verifies the session JWT signature/expiry only — it does NOT hit the DB.
// Full authorization (roles, scope) is enforced server-side in pages/actions.
// -----------------------------------------------------------------------------

const SESSION_COOKIE = "dealer_session";

// Paths that never require authentication.
const PUBLIC_PATHS = ["/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await hasValidSession(token);

  // Authenticated users hitting /login go straight to the dashboard.
  if (isPublic(pathname)) {
    if (authed && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Everything else requires a valid session.
  if (!authed) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect all routes except Next internals and static/api assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
