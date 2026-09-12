import { NextResponse } from "next/server";

// Public contact / enquiry intake endpoint.
//
// This standalone marketing site does not write directly to the internal
// platform database. Submissions are validated and logged here; wire this up
// to email, a CRM, or the platform's inquiry table later (e.g. via a webhook
// or a queued job) without changing the front-end.

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

  // Placeholder for delivery. Replace with real integration.
  console.log("[contact-enquiry]", {
    fullName,
    businessName: (body.businessName || "").trim(),
    email,
    mobile,
    details: (body.details || "").trim(),
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
