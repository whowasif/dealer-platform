import { NextResponse } from "next/server";
import { mustQuery } from "@/lib/db";

// Public contact / enquiry intake endpoint.
//
// Submissions are validated and persisted to website_contact_messages in the
// shared platform database, where the admin app's super admin can read them
// under Website Content → Contact Messages.

export const runtime = "nodejs";

interface ApplyPayload {
  fullName?: string;
  businessName?: string;
  email?: string;
  mobile?: string;
  details?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: ApplyPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fullName = (body.fullName || "").trim();
  const email = (body.email || "").trim();
  const mobile = (body.mobile || "").trim();

  if (!fullName || fullName.length < 2) {
    return NextResponse.json(
      { error: "Please enter your full name." },
      { status: 422 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 422 }
    );
  }
  if (!mobile || mobile.replace(/\D/g, "").length < 7) {
    return NextResponse.json(
      { error: "Please enter a valid mobile number." },
      { status: 422 }
    );
  }

  const businessName = (body.businessName || "").trim() || null;
  const details = (body.details || "").trim() || null;

  try {
    await mustQuery(
      `INSERT INTO website_contact_messages
          (full_name, business_name, email, mobile, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [fullName, businessName, email, mobile, details]
    );
  } catch (err) {
    console.error("[contact-enquiry] failed to save:", err);
    return NextResponse.json(
      { error: "Could not send your message right now. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
