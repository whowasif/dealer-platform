import "server-only";
import type { PoolClient } from "pg";
import { pool, query } from "./db";
import { isHQ } from "./rbac";
import type { SessionUser } from "./types";

// -----------------------------------------------------------------------------
// Audit log — immutable trail of the most sensitive mutations.
//
// recordAudit is DELIBERATELY additive: it never changes the behavior of the
// mutation it's wired into. When called with a transaction client it writes in
// the SAME transaction (so the audit row commits atomically with the change);
// when called without one it writes on the shared pool. Writes are wrapped in a
// defensive try/catch so an audit failure can never abort the surrounding
// business transaction — the audit trail is best-effort, the money logic is not.
//
// old_value / new_value are small JSONB snapshots (e.g. {status:'active'}).
// -----------------------------------------------------------------------------

export interface AuditInput {
  userId: string | null;
  /** Short verb: 'create' | 'update' | 'delete' | 'distribute' | 'verify' ... */
  action: string;
  tableName: string;
  recordId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Write a single audit_log row. Pass a PoolClient to enlist in an existing
 * transaction; omit it (or pass null) to use the shared pool. Failures are
 * swallowed so the caller's main work is never disrupted.
 */
export async function recordAudit(
  client: PoolClient | null,
  input: AuditInput
): Promise<void> {
  const runner = client ?? pool;
  try {
    await runner.query(
      `INSERT INTO audit_log
          (user_id, action, table_name, record_id, old_value, new_value,
           ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        input.userId,
        input.action.slice(0, 20),
        input.tableName,
        input.recordId,
        input.oldValue != null ? JSON.stringify(input.oldValue) : null,
        input.newValue != null ? JSON.stringify(input.newValue) : null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
      ]
    );
  } catch (err) {
    // Best-effort: log to the server console but never re-throw.
    console.error("recordAudit failed (non-fatal):", err);
  }
}

// --------------------------------- Reads (HQ) --------------------------------

export interface AuditListItem {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  table_name: string;
  record_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditFilters {
  tableName?: string | null;
  action?: string | null;
  userId?: string | null;
  from?: string | null; // 'YYYY-MM-DD'
  to?: string | null; // 'YYYY-MM-DD'
}

/**
 * List audit entries — HQ ONLY (caller MUST have passed isHQ; re-checked here).
 * Joins the acting user's full_name. Newest first, capped at 200 rows.
 */
export async function listAudit(
  user: SessionUser,
  filters: AuditFilters = {}
): Promise<AuditListItem[]> {
  if (!isHQ(user)) {
    throw new Error("Only HQ can view the audit log.");
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.tableName) {
    params.push(filters.tableName);
    conditions.push(`al.table_name = $${params.length}`);
  }
  if (filters.action) {
    params.push(filters.action);
    conditions.push(`al.action = $${params.length}`);
  }
  if (filters.userId) {
    params.push(filters.userId);
    conditions.push(`al.user_id = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`al.created_at >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    // inclusive end-of-day
    conditions.push(`al.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<AuditListItem>(
    `SELECT al.id,
            al.user_id,
            u.full_name AS user_name,
            al.action,
            al.table_name,
            al.record_id,
            al.old_value,
            al.new_value,
            al.ip_address::text AS ip_address,
            al.user_agent,
            al.created_at
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.user_id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT 200`,
    params
  );
}

/** Distinct table names present in the log (for the filter dropdown). */
export async function auditTableNames(): Promise<string[]> {
  const rows = await query<{ table_name: string }>(
    `SELECT DISTINCT table_name FROM audit_log ORDER BY table_name`
  );
  return rows.map((r) => r.table_name);
}

/** Distinct actions present in the log (for the filter dropdown). */
export async function auditActions(): Promise<string[]> {
  const rows = await query<{ action: string }>(
    `SELECT DISTINCT action FROM audit_log ORDER BY action`
  );
  return rows.map((r) => r.action);
}
