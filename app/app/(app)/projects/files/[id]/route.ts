import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getProjectFile } from "@/lib/project-workflow";
import { readFileBytes } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getSessionUser();
  if (!actor) return new NextResponse("Unauthorized", { status: 401 });
  const file = await getProjectFile(params.id, actor);
  if (!file || !file.file_url) return new NextResponse("Not found", { status: 404 });
  try {
    const bytes = await readFileBytes(file.file_url);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mime_type || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${file.title.replace(/[^a-zA-Z0-9._ -]+/g, "_")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("File unavailable", { status: 404 });
  }
}