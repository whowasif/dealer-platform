import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getPersonalDocument } from "@/lib/personal-documents";
import { readFileBytes } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getSessionUser();
  if (!actor) return new NextResponse("Unauthorized", { status: 401 });
  const document = await getPersonalDocument(params.id, actor);
  if (!document) return new NextResponse("Not found", { status: 404 });
  try {
    const bytes = await readFileBytes(document.file_url);
    const mime = document.mime_type || "application/octet-stream";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename="${document.title.replace(/[^a-zA-Z0-9._ -]+/g, "_")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("File unavailable", { status: 404 });
  }
}