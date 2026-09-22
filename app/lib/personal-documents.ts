import "server-only";
import { query, queryOne, withTransaction } from "./db";
import { isHQ } from "./rbac";
import { deleteFile } from "./storage";
import type { PersonalDocumentRow, SessionUser } from "./types";

export async function listPersonalDocuments(
  ownerId: string,
  actor: SessionUser
): Promise<PersonalDocumentRow[]> {
  if (ownerId !== actor.id && !isHQ(actor)) {
    throw new Error("You are not authorized to view these personal documents.");
  }
  return query<PersonalDocumentRow>(
    `SELECT d.id, d.user_id, u.full_name AS user_name, d.document_type,
            d.title, d.file_url, d.file_size, d.mime_type, d.notes,
            d.uploaded_by, au.full_name AS uploaded_by_name,
            d.created_at, d.updated_at
       FROM personal_documents d
       JOIN users u ON u.id = d.user_id
       JOIN users au ON au.id = d.uploaded_by
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC`,
    [ownerId]
  );
}

export async function getPersonalDocument(
  id: string,
  actor: SessionUser
): Promise<PersonalDocumentRow | null> {
  const row = await queryOne<PersonalDocumentRow>(
    `SELECT d.id, d.user_id, u.full_name AS user_name, d.document_type,
            d.title, d.file_url, d.file_size, d.mime_type, d.notes,
            d.uploaded_by, au.full_name AS uploaded_by_name,
            d.created_at, d.updated_at
       FROM personal_documents d
       JOIN users u ON u.id = d.user_id
       JOIN users au ON au.id = d.uploaded_by
      WHERE d.id = $1`,
    [id]
  );
  if (!row) return null;
  if (row.user_id !== actor.id && !isHQ(actor)) {
    throw new Error("You are not authorized to view this personal document.");
  }
  return row;
}

export interface CreatePersonalDocumentInput {
  userId: string;
  documentType: string;
  title: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  notes: string | null;
  uploadedBy: string;
}

export async function createPersonalDocument(
  input: CreatePersonalDocumentInput,
  actor: SessionUser
): Promise<string> {
  if (!isHQ(actor)) throw new Error("Only HQ/admin can edit personal documents.");
  const result = await queryOne<{ id: string }>(
    `INSERT INTO personal_documents
        (user_id, document_type, title, file_url, file_size, mime_type, notes, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [input.userId, input.documentType, input.title, input.storageKey, input.fileSize, input.mimeType, input.notes, input.uploadedBy]
  );
  if (!result) throw new Error("Could not save personal document.");
  return result.id;
}

export async function deletePersonalDocument(
  id: string,
  actor: SessionUser
): Promise<void> {
  if (!isHQ(actor)) throw new Error("Only HQ/admin can edit personal documents.");
  const storageKey = await withTransaction(async (client) => {
    const result = await client.query<{ file_url: string }>(
      `DELETE FROM personal_documents WHERE id = $1 RETURNING file_url`,
      [id]
    );
    return result.rows[0]?.file_url ?? null;
  });
  if (storageKey) await deleteFile(storageKey);
}

export async function listAllPersonalDocuments(
  actor: SessionUser
): Promise<PersonalDocumentRow[]> {
  if (!isHQ(actor)) throw new Error("Only HQ/admin can view all personal documents.");
  return query<PersonalDocumentRow>(
    `SELECT d.id, d.user_id, u.full_name AS user_name, d.document_type,
            d.title, d.file_url, d.file_size, d.mime_type, d.notes,
            d.uploaded_by, au.full_name AS uploaded_by_name,
            d.created_at, d.updated_at
       FROM personal_documents d
       JOIN users u ON u.id = d.user_id
       JOIN users au ON au.id = d.uploaded_by
      ORDER BY u.full_name ASC, d.created_at DESC`
  );
}