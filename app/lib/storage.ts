import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

// -----------------------------------------------------------------------------
// Swappable file-storage abstraction.
//
// Feature code (server actions, route handlers, lib/documents.ts) only talks to
// the exported functions below — never to the filesystem directly. That keeps
// the local-disk specifics isolated so a cloud backend (S3, Supabase Storage,
// GCS, ...) can replace this module later WITHOUT touching any feature code:
// re-implement saveFile / getFilePath / deleteFile against the cloud SDK and
// keep the same shapes.
//
// LOCAL IMPLEMENTATION
//   Base directory comes from the UPLOAD_DIR env var (default
//   "D:\\Office\\database files"). This directory lives OUTSIDE the Next.js
//   public/ folder, so files are NOT directly web-accessible — they can only be
//   reached through the authenticated download route (documents/[id]/file).
//
//   Files are laid out as  {UPLOAD_DIR}/{yyyy}/{mm}/{uuid}-{sanitizedName}.
//   Only the RELATIVE path ("2026/08/uuid-name.pdf") is returned as the
//   `storageKey` and persisted in documents.file_url. Because the absolute base
//   dir is never stored, it can change (or move to the cloud) later without a
//   data migration.
// -----------------------------------------------------------------------------

/** Default base directory when UPLOAD_DIR is not set. */
const DEFAULT_UPLOAD_DIR = "D:\\Office\\database files";

/** Resolve the configured base upload directory (absolute). */
export function uploadBaseDir(): string {
  const dir = process.env.UPLOAD_DIR?.trim();
  return dir && dir.length > 0 ? dir : DEFAULT_UPLOAD_DIR;
}

export interface SaveFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string | null;
}

export interface SavedFile {
  /** Relative path stored in the DB (documents.file_url). Backend-agnostic. */
  storageKey: string;
  /** An app-relative URL for viewing/downloading via the secure route. */
  fileUrl: string;
  /** Size in bytes of the written file. */
  fileSize: number;
}

/**
 * Sanitize a user-supplied filename to a safe, ASCII-ish basename. Strips any
 * directory components and collapses anything unusual to underscores so it can
 * never introduce path separators or traversal.
 */
export function sanitizeFilename(name: string): string {
  // Drop any path components a browser might send (defense-in-depth).
  const base = name.replace(/^.*[\\/]/, "");
  // Split extension so we can keep it readable.
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot + 1) : "";
  const cleanStem = stem
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "")
    .slice(0, 80);
  const cleanExt = ext.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 12).toLowerCase();
  const stemFinal = cleanStem.length > 0 ? cleanStem : "file";
  return cleanExt ? `${stemFinal}.${cleanExt}` : stemFinal;
}

/**
 * Reject a storageKey that could escape the base dir (path traversal) or that
 * is an absolute path. Returns true when the key is safe to join to the base.
 */
export function isSafeStorageKey(storageKey: string): boolean {
  if (!storageKey || typeof storageKey !== "string") return false;
  // Normalize separators so both '/' and '\' variants are inspected.
  const normalized = storageKey.replace(/\\/g, "/");
  if (normalized.includes("..")) return false;
  if (normalized.startsWith("/")) return false;
  // Windows absolute paths like C:\ or C:/.
  if (/^[a-zA-Z]:/.test(normalized)) return false;
  // Reject leading separators / empty segments handled by the checks above.
  return true;
}

/**
 * Persist a file to the local disk under {yyyy}/{mm}/{uuid}-{name} and return
 * the relative storageKey + size. Creates intermediate directories as needed.
 */
export async function saveFile(input: SaveFileInput): Promise<SavedFile> {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const safeName = sanitizeFilename(input.originalName);
  const storedName = `${randomUUID()}-${safeName}`;

  // storageKey uses POSIX separators for portability across backends.
  const storageKey = `${yyyy}/${mm}/${storedName}`;

  const base = uploadBaseDir();
  const targetDir = path.join(base, yyyy, mm);
  await fs.mkdir(targetDir, { recursive: true });

  const absPath = path.join(targetDir, storedName);
  await fs.writeFile(absPath, input.buffer);

  return {
    storageKey,
    fileUrl: storageKey,
    fileSize: input.buffer.length,
  };
}

/**
 * Resolve the absolute on-disk path for a stored key. Guards against path
 * traversal and absolute keys, and verifies the resolved path stays inside the
 * base directory. Throws on an unsafe key.
 */
export function getFilePath(storageKey: string): string {
  if (!isSafeStorageKey(storageKey)) {
    throw new Error("Invalid storage key.");
  }
  const base = path.resolve(uploadBaseDir());
  // Convert the POSIX-style key to OS separators before joining.
  const relative = storageKey.replace(/\//g, path.sep);
  const resolved = path.resolve(base, relative);

  // Final containment check: the resolved path must live under the base dir.
  const withSep = base.endsWith(path.sep) ? base : base + path.sep;
  if (resolved !== base && !resolved.startsWith(withSep)) {
    throw new Error("Resolved path escapes the storage base directory.");
  }
  return resolved;
}

/** Read a stored file's bytes from disk. */
export async function readFileBytes(storageKey: string): Promise<Buffer> {
  const absPath = getFilePath(storageKey);
  return fs.readFile(absPath);
}

/**
 * Delete a stored file (best-effort). Never throws for a missing file so callers
 * can treat file removal as a soft side-effect of deleting the DB row.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  try {
    const absPath = getFilePath(storageKey);
    await fs.unlink(absPath);
  } catch {
    // Missing file / unsafe key: ignore. The DB row is the source of truth.
  }
}
