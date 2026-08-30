import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "./db";
import { isHQ } from "./rbac";
import { recordAudit } from "./audit";
import { createNotification } from "./notifications";
import type { SessionUser } from "./types";

// -----------------------------------------------------------------------------
// Complaints — a lightweight ticketing system.
//
// Filing: any authenticated user (rep / head / HQ). The complainant is recorded
// by type + id + name/phone.
// Visibility (kept simple):
//   HQ     -> all complaints
//   others -> complaints they filed (complainant_id = their user id) OR are
//             assigned to (assigned_to = their user id).
// Assigning: HQ only. Status updates: HQ, or the currently-assigned user.
// -----------------------------------------------------------------------------

export type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed";

export interface ComplaintListItem {
  id: string;
  complaint_number: string;
  complainant_type: string;
  complainant_id: string | null;
  complainant_name: string | null;
  complainant_phone: string | null;
  subject: string;
  description: string;
  category: string | null;
  priority: string;
  status: ComplaintStatus;
  assigned_to: string | null;
  assigned_to_name: string | null;
  resolved_date: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Generate the next complaint number 'CMP-YYYY-000123' per calendar year.
 * Runs inside the caller's transaction; the UNIQUE constraint is the final
 * race guard.
 */
export async function nextComplaintNumber(client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CMP-${year}-`;
  const { rows } = await client.query<{ max_seq: number | null }>(
    `SELECT MAX(
              CAST(NULLIF(regexp_replace(complaint_number, '^CMP-\\d{4}-', ''), '') AS INTEGER)
            ) AS max_seq
       FROM complaints
      WHERE complaint_number LIKE $1`,
    [`${prefix}%`]
  );
  const next = (rows[0]?.max_seq ?? 0) + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}

const SELECT = `
  SELECT c.id,
         c.complaint_number,
         c.complainant_type,
         c.complainant_id,
         c.complainant_name,
         c.complainant_phone,
         c.subject,
         c.description,
         c.category,
         c.priority,
         c.status,
         c.assigned_to,
         au.full_name AS assigned_to_name,
         c.resolved_date,
         c.resolution_notes,
         c.created_at,
         c.updated_at
    FROM complaints c
    LEFT JOIN users au ON au.id = c.assigned_to`;

export interface ComplaintFilters {
  status?: string | null;
  priority?: string | null;
  search?: string | null;
}

/** List complaints visible to `user`, scope-enforced. */
export async function listComplaints(
  user: SessionUser,
  filters: ComplaintFilters = {}
): Promise<ComplaintListItem[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!isHQ(user)) {
    params.push(user.id);
    // filed by them OR assigned to them
    conditions.push(
      `(c.complainant_id = $${params.length} OR c.assigned_to = $${params.length})`
    );
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`c.status = $${params.length}`);
  }
  if (filters.priority) {
    params.push(filters.priority);
    conditions.push(`c.priority = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(
      `(c.subject ILIKE $${params.length} OR c.complaint_number ILIKE $${params.length})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<ComplaintListItem>(
    `${SELECT} ${where} ORDER BY c.created_at DESC`,
    params
  );
}

/** Fetch one complaint (no scope check — caller enforces). */
export async function getComplaint(
  id: string
): Promise<ComplaintListItem | null> {
  return queryOne<ComplaintListItem>(`${SELECT} WHERE c.id = $1`, [id]);
}

/** True if `user` may view the given complaint. */
export function canViewComplaint(
  user: SessionUser,
  complaint: ComplaintListItem
): boolean {
  if (isHQ(user)) return true;
  return complaint.complainant_id === user.id || complaint.assigned_to === user.id;
}

export interface NewComplaint {
  subject: string;
  description: string;
  category?: string | null;
  priority?: string | null;
  /** Optional external complainant details (defaults to the filing user). */
  complainantName?: string | null;
  complainantPhone?: string | null;
}

/**
 * File a complaint. The filing user is recorded as the complainant (type
 * 'user', id = their user id) unless external complainant details are given.
 * Returns { id, complaint_number }.
 */
export async function createComplaint(
  input: NewComplaint,
  user: SessionUser
): Promise<{ id: string; complaint_number: string }> {
  if (!input.subject || !input.subject.trim()) {
    throw new Error("A subject is required.");
  }
  if (!input.description || !input.description.trim()) {
    throw new Error("A description is required.");
  }

  return withTransaction(async (client) => {
    const number = await nextComplaintNumber(client);
    const res = await client.query<{ id: string }>(
      `INSERT INTO complaints
          (complaint_number, complainant_type, complainant_id, complainant_name,
           complainant_phone, subject, description, category, priority, status)
       VALUES ($1,'user',$2,$3,$4,$5,$6,$7,$8,'open')
       RETURNING id`,
      [
        number,
        user.id,
        input.complainantName?.trim() || user.full_name,
        input.complainantPhone?.trim() || user.phone,
        input.subject.trim(),
        input.description.trim(),
        input.category?.trim() || null,
        input.priority || "medium",
      ]
    );
    const id = res.rows[0]!.id;

    await recordAudit(client, {
      userId: user.id,
      action: "create",
      tableName: "complaints",
      recordId: id,
      newValue: { complaint_number: number, subject: input.subject.trim() },
    });

    return { id, complaint_number: number };
  });
}

/** Assign a complaint to a user — HQ only. Notifies the assignee. */
export async function assignComplaint(
  id: string,
  assigneeUserId: string,
  user: SessionUser
): Promise<void> {
  if (!isHQ(user)) {
    throw new Error("Only HQ can assign complaints.");
  }

  const complaint = await getComplaint(id);
  if (!complaint) throw new Error("Complaint not found.");

  const assignee = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE id = $1`,
    [assigneeUserId]
  );
  if (!assignee) throw new Error("Selected assignee was not found.");

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE complaints
          SET assigned_to = $1,
              status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END,
              updated_at = NOW()
        WHERE id = $2`,
      [assigneeUserId, id]
    );

    await createNotification(
      assigneeUserId,
      {
        title: "Complaint assigned to you",
        message: `${complaint.complaint_number}: ${complaint.subject}`,
        type: "complaint",
        actionUrl: "/complaints",
      },
      client
    );

    await recordAudit(client, {
      userId: user.id,
      action: "assign",
      tableName: "complaints",
      recordId: id,
      newValue: { assigned_to: assigneeUserId },
    });
  });
}

/**
 * Update a complaint's status (+ optional resolution notes). Allowed for HQ or
 * the currently-assigned user. Setting 'resolved'/'closed' stamps resolved_date.
 */
export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  resolutionNotes: string | null,
  user: SessionUser
): Promise<void> {
  const complaint = await getComplaint(id);
  if (!complaint) throw new Error("Complaint not found.");

  const allowed = isHQ(user) || complaint.assigned_to === user.id;
  if (!allowed) {
    throw new Error("You are not authorized to update this complaint.");
  }

  const closing = status === "resolved" || status === "closed";

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE complaints
          SET status = $1,
              resolution_notes = COALESCE($2, resolution_notes),
              resolved_date = CASE WHEN $3 THEN NOW() ELSE resolved_date END,
              updated_at = NOW()
        WHERE id = $4`,
      [status, resolutionNotes?.trim() || null, closing, id]
    );

    // Notify the original complainant of the status change (if a platform user).
    if (complaint.complainant_id) {
      await createNotification(
        complaint.complainant_id,
        {
          title: `Complaint ${status.replace(/_/g, " ")}`,
          message: `${complaint.complaint_number}: ${complaint.subject}`,
          type: "complaint",
          actionUrl: "/complaints",
        },
        client
      );
    }

    await recordAudit(client, {
      userId: user.id,
      action: "status",
      tableName: "complaints",
      recordId: id,
      oldValue: { status: complaint.status },
      newValue: { status },
    });
  });
}

/** HQ users available as complaint assignees. */
export interface AssigneeOption {
  id: string;
  full_name: string;
}

export async function listAssignableUsers(): Promise<AssigneeOption[]> {
  return query<AssigneeOption>(
    `SELECT DISTINCT u.id, u.full_name
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r       ON r.id = ur.role_id
      WHERE r.level <= 2
        AND (u.status IS NULL OR u.status = 'active')
      ORDER BY u.full_name`
  );
}
