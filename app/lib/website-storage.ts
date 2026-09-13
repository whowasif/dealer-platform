import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

// -----------------------------------------------------------------------------
// PUBLIC image storage for the marketing website.
//
// Unlike lib/storage.ts (private documents served through an authed route),
// website images must be publicly served by the separate "website" Next app.
// We therefore write uploaded images into the website's own public/ directory
// under /uploads, and store the public path ("/uploads/<uuid>.<ext>") in the DB.
// The website serves that path directly (next/image local path).
//
// The website's public directory is configurable via WEBSITE_PUBLIC_DIR so this
// keeps working if the website moves; it defaults to the sibling project path.
// -----------------------------------------------------------------------------

const DEFAULT_WEBSITE_PUBLIC_DIR = "D:\\Office\\Dealer\\website\\public";

/** Absolute path to the website's public/ directory. */
export function websitePublicDir(): string {
  const dir = process.env.WEBSITE_PUBLIC_DIR?.trim();
  return dir && dir.length > 0 ? dir : DEFAULT_WEBSITE_PUBLIC_DIR;
}

const ALLOWED_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB

export interface SaveImageInput {
  buffer: Buffer;
  mimeType: string | null;
}

/**
 * Persist a public image into {WEBSITE_PUBLIC_DIR}/uploads/{uuid}.{ext} and
 * return the public path ("/uploads/{uuid}.{ext}") to store in the DB and
 * render on the website. Throws on an unsupported type or oversize file.
 */
export async function saveWebsiteImage(input: SaveImageInput): Promise<string> {
  const mime = (input.mimeType || "").toLowerCase();
  const ext = ALLOWED_EXT[mime];
  if (!ext) {
    throw new Error(
      "Unsupported image type. Use JPG, PNG, WEBP, GIF, or AVIF."
    );
  }
  if (input.buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 6 MB).");
  }

  const fileName = `${randomUUID()}.${ext}`;
  const uploadsDir = path.join(websitePublicDir(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, fileName), input.buffer);

  // Public path served by the website.
  return `/uploads/${fileName}`;
}

/**
 * Best-effort removal of a previously uploaded website image. Only touches
 * files under /uploads (never external URLs or other public assets). Never
 * throws — the DB row is the source of truth.
 */
export async function deleteWebsiteImage(publicPath: string): Promise<void> {
  try {
    if (!publicPath || !publicPath.startsWith("/uploads/")) return;
    const name = path.basename(publicPath); // strips any directory components
    if (!name || name.includes("..")) return;
    const abs = path.join(websitePublicDir(), "uploads", name);
    await fs.unlink(abs);
  } catch {
    // ignore missing file
  }
}

/**
 * Validate/normalize an image reference coming from the admin form. Accepts
 * either an existing public "/uploads/..." path or an http(s) URL. Returns the
 * trimmed value, or throws if it is neither.
 */
export function normalizeImageRef(value: string): string {
  const v = value.trim();
  if (v.startsWith("/uploads/")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  throw new Error(
    "Image must be an uploaded file or a full http(s) image URL."
  );
}
