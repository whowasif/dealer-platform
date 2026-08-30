import "server-only";
import { query, queryOne, withTransaction } from "./db";
import { isHQ } from "./rbac";
import { repScopeForUser } from "./representatives";
import { deleteFile } from "./storage";
import type {
  DocumentCategoryRow,
  DocumentDetail,
  DocumentListItem,
  DocumentRelatedType,
  SessionUser,
} from "./types";

// -----------------------------------------------------------------------------
// Documents: soft-copy files of any type, polymorphically linked to a rep,
// project, order, customer, or user. Files live on disk via lib/storage.ts; the
// documents table only stores the backend-agnostic storageKey (in file_url).
//
// SCOPE MODEL (enforced server-side in pages AND actions/route handlers):
//   * When a document is tied to a representative (directly, or via a linked
//     project/order/customer that resolves to an owning rep), visibility uses
//     the existing repScopeForUser rules:
//       HQ                     -> all
//       divisional_head        -> reps in their division
//       district_head          -> reps in their district
//       upazila_representative  -> only their own
//   * When a document is NOT tied to a rep (e.g. related_type 'user' with no
//     rep, or ownership cannot be resolved): HQ only, plus the linked user
//     themselves (for related_type 'user').
//   * Verifying + deleting are HQ-only.
//
// Uploading: any authenticated user who can access the related entity may
// upload for it (see canUploadForRepresentative + the related-entity checks in
// the upload action). HQ can upload anything.
// -----------------------------------------------------------------------------

// ------------------------------- Categories ----------------------------------

/** Active document categories, ordered for display. */
export async function listCategories(): Promise<DocumentCategoryRow[]> {
  return query<DocumentCategoryRow>(
    `SELECT id, name, bn_name, description, is_active, sort_order, created_at
       FROM document_categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, name ASC`
  );
}

// --------------------------- Owner-scope resolver -----------------------------

export interface OwnerScope {
  rep_id: string | null;
  rep_user_id: string | null;
  division_id: string | null;
  district_id: string | null;
  /** For related_type 'user': the linked user (may view their own docs). */
  linked_user_id: string | null;
  /** Human label for the linked entity, e.g. "Project PRJ-2026-000012". */
  label: string | null;
  /** Auto-fill values for documents.representative_id / project_id. */
  representative_id: string | null;
  project_id: string | null;
}

/**
 * Resolve the owning representative (+ its geography) for a related entity, plus
 * a display label and the representative_id/project_id to auto-fill on insert.
 * Returns null-ish scope when the entity is not tied to a rep.
 */
export async function resolveOwnerScope(
  relatedType: DocumentRelatedType,
  relatedId: string
): Promise<OwnerScope> {
  const empty: OwnerScope = {
    rep_id: null,
    rep_user_id: null,
    division_id: null,
    district_id: null,
    linked_user_id: null,
    label: null,
    representative_id: null,
    project_id: null,
  };

  if (relatedType === "representative") {
    const row = await queryOne<{
      rep_id: string;
      rep_user_id: string;
      division_id: string;
      district_id: string;
      full_name: string;
    }>(
      `SELECT rep.id AS rep_id, rep.user_id AS rep_user_id,
              d.division_id, d.id AS district_id, u.full_name
         FROM representatives rep
         JOIN users u     ON u.id = rep.user_id
         JOIN upazilas up ON up.id = rep.upazila_id
         JOIN districts d ON d.id = up.district_id
        WHERE rep.id = $1`,
      [relatedId]
    );
    if (!row) return empty;
    return {
      rep_id: row.rep_id,
      rep_user_id: row.rep_user_id,
      division_id: row.division_id,
      district_id: row.district_id,
      linked_user_id: null,
      label: `Rep: ${row.full_name}`,
      representative_id: row.rep_id,
      project_id: null,
    };
  }

  if (relatedType === "project") {
    const row = await queryOne<{
      rep_id: string;
      rep_user_id: string;
      division_id: string;
      district_id: string;
      project_number: string;
    }>(
      `SELECT rep.id AS rep_id, rep.user_id AS rep_user_id,
              d.division_id, d.id AS district_id, p.project_number
         FROM projects p
         JOIN representatives rep ON rep.id = p.representative_id
         JOIN upazilas up ON up.id = rep.upazila_id
         JOIN districts d ON d.id = up.district_id
        WHERE p.id = $1`,
      [relatedId]
    );
    if (!row) return empty;
    return {
      rep_id: row.rep_id,
      rep_user_id: row.rep_user_id,
      division_id: row.division_id,
      district_id: row.district_id,
      linked_user_id: null,
      label: `Project ${row.project_number}`,
      representative_id: row.rep_id,
      project_id: relatedId,
    };
  }

  if (relatedType === "order") {
    const row = await queryOne<{
      rep_id: string;
      rep_user_id: string;
      division_id: string;
      district_id: string;
      order_number: string;
    }>(
      `SELECT rep.id AS rep_id, rep.user_id AS rep_user_id,
              d.division_id, d.id AS district_id, o.order_number
         FROM orders o
         JOIN representatives rep ON rep.id = o.representative_id
         JOIN upazilas up ON up.id = rep.upazila_id
         JOIN districts d ON d.id = up.district_id
        WHERE o.id = $1`,
      [relatedId]
    );
    if (!row) return empty;
    return {
      rep_id: row.rep_id,
      rep_user_id: row.rep_user_id,
      division_id: row.division_id,
      district_id: row.district_id,
      linked_user_id: null,
      label: `Order ${row.order_number}`,
      representative_id: row.rep_id,
      project_id: null,
    };
  }

  if (relatedType === "customer") {
    const row = await queryOne<{
      rep_id: string;
      rep_user_id: string;
      division_id: string;
      district_id: string;
      name: string;
    }>(
      `SELECT rep.id AS rep_id, rep.user_id AS rep_user_id,
              d.division_id, d.id AS district_id, c.name
         FROM customers c
         JOIN representatives rep ON rep.id = c.representative_id
         JOIN upazilas up ON up.id = rep.upazila_id
         JOIN districts d ON d.id = up.district_id
        WHERE c.id = $1`,
      [relatedId]
    );
    if (!row) return empty;
    return {
      rep_id: row.rep_id,
      rep_user_id: row.rep_user_id,
      division_id: row.division_id,
      district_id: row.district_id,
      linked_user_id: null,
      label: `Customer: ${row.name}`,
      representative_id: row.rep_id,
      project_id: null,
    };
  }

  if (relatedType === "user") {
    const row = await queryOne<{ id: string; full_name: string }>(
      `SELECT id, full_name FROM users WHERE id = $1`,
      [relatedId]
    );
    if (!row) return empty;
    // A user may also be a representative — resolve their rep scope if so.
    const rep = await queryOne<{
      rep_id: string;
      division_id: string;
      district_id: string;
    }>(
      `SELECT rep.id AS rep_id, d.division_id, d.id AS district_id
         FROM representatives rep
         JOIN upazilas up ON up.id = rep.upazila_id
         JOIN districts d ON d.id = up.district_id
        WHERE rep.user_id = $1`,
      [relatedId]
    );
    return {
      rep_id: rep?.rep_id ?? null,
      rep_user_id: rep ? relatedId : null,
      division_id: rep?.division_id ?? null,
      district_id: rep?.district_id ?? null,
      linked_user_id: relatedId,
      label: `User: ${row.full_name}`,
      representative_id: rep?.rep_id ?? null,
      project_id: null,
    };
  }

  return empty;
}

// -------------------------------- Creation ------------------------------------

export interface CreateDocumentInput {
  categoryId: string;
  relatedType: DocumentRelatedType | null;
  relatedId: string | null;
  representativeId: string | null;
  projectId: string | null;
  title: string;
  storageKey: string;
  fileSize: number | null;
  mimeType: string | null;
  documentNumber: string | null;
  documentDate: string | null;
  amount: number | null;
  expiryDate: string | null;
  tags: string[];
  notes: string | null;
  uploadedBy: string;
}

/** Insert a document row. Returns the new id. */
export async function createDocument(
  input: CreateDocumentInput
): Promise<string> {
  return withTransaction(async (client) => {
    const res = await client.query<{ id: string }>(
      `INSERT INTO documents
          (category_id, related_type, related_id, representative_id, project_id,
           title, file_url, file_size, mime_type, document_number, document_date,
           amount, expiry_date, tags, notes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16)
       RETURNING id`,
      [
        input.categoryId,
        input.relatedType,
        input.relatedId,
        input.representativeId,
        input.projectId,
        input.title,
        input.storageKey,
        input.fileSize,
        input.mimeType,
        input.documentNumber,
        input.documentDate,
        input.amount,
        input.expiryDate,
        JSON.stringify(input.tags ?? []),
        input.notes,
        input.uploadedBy,
      ]
    );
    return res.rows[0]!.id;
  });
}

// ---------------------------------- Reads -------------------------------------

// A correlated label for what the document is linked to. Kept out of the main
// join to stay resilient to nullable/polymorphic links.
const LINK_LABEL_SQL = `
  CASE d.related_type
    WHEN 'project' THEN
      (SELECT 'Project ' || p.project_number FROM projects p WHERE p.id = d.related_id)
    WHEN 'order' THEN
      (SELECT 'Order ' || o.order_number FROM orders o WHERE o.id = d.related_id)
    WHEN 'customer' THEN
      (SELECT 'Customer: ' || c.name FROM customers c WHERE c.id = d.related_id)
    WHEN 'representative' THEN
      (SELECT 'Rep: ' || ru.full_name
         FROM representatives rr JOIN users ru ON ru.id = rr.user_id
        WHERE rr.id = d.related_id)
    WHEN 'user' THEN
      (SELECT 'User: ' || uu.full_name FROM users uu WHERE uu.id = d.related_id)
    ELSE NULL
  END AS link_label`;

const LIST_SELECT = `
  SELECT d.id,
         d.category_id,
         cat.name         AS category_name,
         cat.bn_name      AS category_bn_name,
         d.related_type,
         d.related_id,
         d.representative_id,
         d.project_id,
         d.title,
         d.file_url,
         d.file_size,
         d.mime_type,
         d.document_number,
         d.document_date,
         d.amount,
         d.verified,
         d.expiry_date,
         COALESCE(d.tags, '[]'::jsonb) AS tags,
         d.uploaded_by,
         up.full_name     AS uploaded_by_name,
         d.uploaded_at,
         ${LINK_LABEL_SQL}
    FROM documents d
    JOIN document_categories cat ON cat.id = d.category_id
    LEFT JOIN users up           ON up.id = d.uploaded_by
    -- Owning rep's geography (via directly-linked representative_id) for scope.
    LEFT JOIN representatives orep ON orep.id = d.representative_id
    LEFT JOIN upazilas oup         ON oup.id = orep.upazila_id
    LEFT JOIN districts od         ON od.id = oup.district_id`;

export interface DocumentListFilters {
  category?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  search?: string | null;
  verified?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

/**
 * List documents visible to `user`, optionally narrowed by filters. Geographic
 * scope is always enforced server-side. Documents tied to a rep are filtered by
 * the owning rep's geography; untied documents are HQ-only, plus a user's own
 * (related_type 'user' = their id).
 */
export async function listDocuments(
  user: SessionUser,
  filters: DocumentListFilters = {}
): Promise<DocumentListItem[]> {
  const scope = repScopeForUser(user);
  const conditions: string[] = [];
  const params: unknown[] = [];

  // --- enforce scope ---
  if (scope.all) {
    // HQ: no scope restriction.
  } else if (scope.divisionId) {
    params.push(scope.divisionId);
    const p = params.length;
    // Rep-tied docs in the division OR docs the user uploaded themselves.
    params.push(user.id);
    const pu = params.length;
    conditions.push(`(od.division_id = $${p} OR d.uploaded_by = $${pu})`);
  } else if (scope.districtId) {
    params.push(scope.districtId);
    const p = params.length;
    params.push(user.id);
    const pu = params.length;
    conditions.push(`(od.id = $${p} OR d.uploaded_by = $${pu})`);
  } else {
    // Representative / lowest: their own rep's docs, docs they uploaded, or
    // docs tied to them as a user.
    params.push(user.id);
    const pu = params.length;
    conditions.push(
      `(orep.user_id = $${pu} OR d.uploaded_by = $${pu}
        OR (d.related_type = 'user' AND d.related_id = $${pu}))`
    );
  }

  // --- optional UI filters ---
  if (filters.category) {
    params.push(filters.category);
    conditions.push(`d.category_id = $${params.length}`);
  }
  if (filters.relatedType) {
    params.push(filters.relatedType);
    conditions.push(`d.related_type = $${params.length}`);
  }
  if (filters.relatedId) {
    params.push(filters.relatedId);
    conditions.push(`d.related_id = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    conditions.push(
      `(d.title ILIKE $${idx} OR d.document_number ILIKE $${idx})`
    );
  }
  if (filters.verified === "true" || filters.verified === "false") {
    params.push(filters.verified === "true");
    conditions.push(`d.verified = $${params.length}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    conditions.push(`d.document_date >= $${params.length}`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    conditions.push(`d.document_date <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<DocumentListItem>(
    `${LIST_SELECT} ${where} ORDER BY d.uploaded_at DESC`,
    params
  );
}

/**
 * List documents linked to a specific entity (for the compact sections on the
 * rep/project/order/customer detail pages). Scope is still enforced.
 */
export async function listDocumentsForEntity(
  user: SessionUser,
  relatedType: DocumentRelatedType,
  relatedId: string
): Promise<DocumentListItem[]> {
  return listDocuments(user, { relatedType, relatedId });
}

/** Fetch full document detail incl. category, uploader, verifier + owner scope. */
export async function getDocument(id: string): Promise<DocumentDetail | null> {
  const doc = await queryOne<{
    id: string;
    category_id: string;
    category_name: string;
    category_bn_name: string | null;
    related_type: DocumentRelatedType | null;
    related_id: string | null;
    representative_id: string | null;
    project_id: string | null;
    title: string;
    file_url: string;
    file_size: number | null;
    mime_type: string | null;
    document_number: string | null;
    document_date: string | null;
    amount: string | null;
    verified: boolean;
    verified_by: string | null;
    verified_by_name: string | null;
    verified_at: string | null;
    expiry_date: string | null;
    tags: string[];
    notes: string | null;
    uploaded_by: string | null;
    uploaded_by_name: string | null;
    uploaded_at: string;
    link_label: string | null;
  }>(
    `SELECT d.id,
            d.category_id,
            cat.name    AS category_name,
            cat.bn_name AS category_bn_name,
            d.related_type,
            d.related_id,
            d.representative_id,
            d.project_id,
            d.title,
            d.file_url,
            d.file_size,
            d.mime_type,
            d.document_number,
            d.document_date,
            d.amount,
            d.verified,
            d.verified_by,
            vu.full_name AS verified_by_name,
            d.verified_at,
            d.expiry_date,
            COALESCE(d.tags, '[]'::jsonb) AS tags,
            d.notes,
            d.uploaded_by,
            up.full_name AS uploaded_by_name,
            d.uploaded_at,
            ${LINK_LABEL_SQL}
       FROM documents d
       JOIN document_categories cat ON cat.id = d.category_id
       LEFT JOIN users up ON up.id = d.uploaded_by
       LEFT JOIN users vu ON vu.id = d.verified_by
      WHERE d.id = $1`,
    [id]
  );
  if (!doc) return null;

  // Resolve owner scope for authorization. Prefer the directly-linked rep;
  // otherwise resolve from the polymorphic link (project/order/customer/user).
  let owner: OwnerScope = {
    rep_id: null,
    rep_user_id: null,
    division_id: null,
    district_id: null,
    linked_user_id: null,
    label: doc.link_label,
    representative_id: doc.representative_id,
    project_id: doc.project_id,
  };

  if (doc.representative_id) {
    const g = await queryOne<{
      rep_user_id: string;
      division_id: string;
      district_id: string;
    }>(
      `SELECT rep.user_id AS rep_user_id, d.division_id, d.id AS district_id
         FROM representatives rep
         JOIN upazilas up ON up.id = rep.upazila_id
         JOIN districts d ON d.id = up.district_id
        WHERE rep.id = $1`,
      [doc.representative_id]
    );
    if (g) {
      owner.rep_id = doc.representative_id;
      owner.rep_user_id = g.rep_user_id;
      owner.division_id = g.division_id;
      owner.district_id = g.district_id;
    }
  } else if (doc.related_type && doc.related_id) {
    const resolved = await resolveOwnerScope(doc.related_type, doc.related_id);
    owner = { ...owner, ...resolved, label: doc.link_label ?? resolved.label };
  }

  return {
    ...doc,
    owner_rep_id: owner.rep_id,
    owner_rep_user_id: owner.rep_user_id,
    owner_division_id: owner.division_id,
    owner_district_id: owner.district_id,
  };
}

// ------------------------------ Authorization ---------------------------------

/** True if `user` may verify/delete documents (HQ only). */
export function canManageDocuments(user: SessionUser): boolean {
  return isHQ(user);
}

/**
 * True if `user` may view/download the given document.
 *   - Tied to a rep: apply repScopeForUser against the owning rep's geography.
 *   - Not tied to a rep: HQ only, plus the uploader, plus (related_type 'user')
 *     the linked user themselves.
 */
export function canViewDocument(
  user: SessionUser,
  doc: DocumentDetail
): boolean {
  if (isHQ(user)) return true;

  // The uploader can always see what they uploaded.
  if (doc.uploaded_by && doc.uploaded_by === user.id) return true;

  // Document tied to a representative -> geographic scope.
  if (doc.owner_rep_id) {
    const scope = repScopeForUser(user);
    if (scope.all) return true;
    if (scope.selfOnly) return doc.owner_rep_user_id === user.id;
    if (scope.divisionId) return doc.owner_division_id === scope.divisionId;
    if (scope.districtId) return doc.owner_district_id === scope.districtId;
    return false;
  }

  // Untied document linked to a specific user -> that user may view it.
  if (doc.related_type === "user" && doc.related_id === user.id) return true;

  // Otherwise default to HQ-only (already returned true above for HQ).
  return false;
}

/**
 * True if `user` may upload a document for the given representative id, reusing
 * the existing rep-scope rules (HQ all; divisional in division; district in
 * district; rep only for themselves).
 */
export async function canUploadForRepresentative(
  user: SessionUser,
  repId: string
): Promise<boolean> {
  if (isHQ(user)) return true;
  const g = await queryOne<{
    rep_user_id: string;
    division_id: string;
    district_id: string;
  }>(
    `SELECT rep.user_id AS rep_user_id, d.division_id, d.id AS district_id
       FROM representatives rep
       JOIN upazilas up ON up.id = rep.upazila_id
       JOIN districts d ON d.id = up.district_id
      WHERE rep.id = $1`,
    [repId]
  );
  if (!g) return false;

  const scope = repScopeForUser(user);
  if (scope.all) return true;
  if (scope.selfOnly) return g.rep_user_id === user.id;
  if (scope.divisionId) return g.division_id === scope.divisionId;
  if (scope.districtId) return g.district_id === scope.districtId;
  return false;
}

// ------------------------------ Verify / delete -------------------------------

/** Mark a document verified (HQ only — caller must also enforce). */
export async function verifyDocument(
  id: string,
  user: SessionUser
): Promise<void> {
  if (!isHQ(user)) throw new Error("Only HQ can verify documents.");
  await query(
    `UPDATE documents
        SET verified = TRUE, verified_by = $1, verified_at = NOW()
      WHERE id = $2`,
    [user.id, id]
  );
}

/**
 * Delete a document (HQ only) and best-effort remove the underlying file. The
 * DB row is removed inside a transaction; the file is deleted afterwards so a
 * missing file never blocks the delete.
 */
export async function deleteDocument(
  id: string,
  user: SessionUser
): Promise<void> {
  if (!isHQ(user)) throw new Error("Only HQ can delete documents.");

  const storageKey = await withTransaction(async (client) => {
    const res = await client.query<{ file_url: string }>(
      `DELETE FROM documents WHERE id = $1 RETURNING file_url`,
      [id]
    );
    return res.rows[0]?.file_url ?? null;
  });

  if (storageKey) {
    await deleteFile(storageKey);
  }
}
