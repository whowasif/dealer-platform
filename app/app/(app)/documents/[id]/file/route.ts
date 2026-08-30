import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getDocument, canViewDocument } from "@/lib/documents";
import { readFileBytes } from "@/lib/storage";

// -----------------------------------------------------------------------------
// Secure download / inline-view route for a document's underlying file.
//
// Because uploads live OUTSIDE the Next.js public/ folder, the raw bytes are
// never statically served. This Route Handler is the ONLY way to reach them:
//   1. Require an authenticated session.
//   2. Load the document and enforce the SAME scope rules as viewing it
//      (canViewDocument) — server-side, not hidden UI.
//   3. Resolve the on-disk path exclusively via the stored storageKey joined to
//      UPLOAD_DIR (lib/storage.getFilePath), which rejects "..", absolute paths,
//      and anything that would escape the base directory. The path is NEVER
//      built from request/user input, so path traversal is not possible.
//   4. Stream the bytes with the correct Content-Type and a Content-Disposition
//      of `inline` for images/PDF (so they preview) or `attachment` otherwise.
//
// Force the Node.js runtime (filesystem + pg access).
// -----------------------------------------------------------------------------

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Build an RFC 5987-safe filename for the Content-Disposition header. */
function safeDownloadName(title: string, mime: string | null): string {
  const extFromMime: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  const ext = mime ? extFromMime[mime] : undefined;
  const base = title
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._ -]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "")
    .slice(0, 80);
  const stem = base.length > 0 ? base : "document";
  return ext && !stem.toLowerCase().endsWith(`.${ext}`) ? `${stem}.${ext}` : stem;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const doc = await getDocument(params.id);
  if (!doc) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Same scope enforcement as viewing the document's detail page.
  if (!canViewDocument(user, doc)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let bytes: Buffer;
  try {
    // getFilePath (inside readFileBytes) guards against traversal / absolute
    // keys and confirms the resolved path stays inside UPLOAD_DIR.
    bytes = await readFileBytes(doc.file_url);
  } catch {
    return new NextResponse("File unavailable", { status: 404 });
  }

  const mime = doc.mime_type || "application/octet-stream";
  const inline = mime.startsWith("image/") || mime === "application/pdf";
  const filename = safeDownloadName(doc.title, doc.mime_type);
  const disposition = `${inline ? "inline" : "attachment"}; filename="${filename}"`;

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      "Content-Disposition": disposition,
      // These are private, authorized files — never cache in shared caches.
      "Cache-Control": "private, no-store",
    },
  });
}
