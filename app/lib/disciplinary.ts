import "server-only";
import { query, queryOne, withTransaction } from "./db";
import { isHQ, hasRole, scopeForRole } from "./rbac";
import { repScopeForUser } from "./representatives";
import { recordAudit } from "./audit";
import { createNotification } from "./notifications";
import type { SessionUser } from "./types";

// -----------------------------------------------------------------------------
// Disciplinary records — written warnings, suspensions, terminations issued
// against representatives.
//
// AUTHORIZATION (per the access matrix):
//   * Issue / resolve: HQ and divisional_head ONLY. District heads and reps
//     CANNOT create or resolve.
//   * View: HQ (all), divisional_head (their division), district_head (their
//     district, read-only), a representative (only their own records).
//
// Issuing a record ALSO creates a notification for the affected rep's user and
// writes an audit_log row — all inside one transaction.
// -----------------------------------------------------------------------------

export type DisciplinaryActionType =
  | "written_warning"
  | "suspension"
  | "termination";

export interface DisciplinaryListItem {
  id: string;
  representative_id: string;
  representative_name: string;
  rep_user_id: string;
  division_id: string;
  district_id: string;
  action_type: DisciplinaryActionType;
  reason: string;
  evidence_urls: string[];
  issued_by: string;
  issued_by_name: string | null;
  issued_date: string;
  effective_from: string;
  effective_to: string | null;
  resolved: boolean;
  resolved_date: string | null;
  resolution_notes: string | null;
  created_at: string;
}

/** True if `user` may issue/resolve disciplinary actions (HQ + div head). */
export function canManageDisciplinary(user: SessionUser): boolean {
  return isHQ(user) || hasRole(user, "divisional_head");
}

const SELECT = `
  SELECT dr.id,
         dr.representative_id,
         u.full_name  AS representative_name,
         rep.user_id  AS rep_user_id,
         dv.id        AS division_id,
         d.id         AS district_id,
         dr.action_type,
         dr.reason,
         dr.evidence_urls,
         dr.issued_by,
         iu.full_name AS issued_by_name,
         dr.issued_date,
         dr.effective_from,
         dr.effective_to,
         dr.resolved,
         dr.resolved_date,
         dr.resolution_notes,
         dr.created_at
    FROM disciplinary_records dr
    JOIN representatives rep ON rep.id = dr.representative_id
    JOIN users u             ON u.id = rep.user_id
    JOIN upazilas up         ON up.id = rep.upazila_id
    JOIN districts d         ON d.id = up.district_id
    JOIN divisions dv        ON dv.id = d.division_id
    LEFT JOIN users iu       ON iu.id = dr.issued_by`;

export interface DisciplinaryFilters {
  resolved?: string | null; // 'true' | 'false'
  actionType?: string | null;
}

/** List disciplinary records visible to `user`, scope-enforced. */
export async function listDisciplinary(
  user: SessionUser,
  filters: DisciplinaryFilters = {}
): Promise<DisciplinaryListItem[]> {
  const scope = repScopeForUser(user);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (scope.selfOnly) {
    params.push(user.id);
    conditions.push(`rep.user_id = $${params.length}`);
  } else if (scope.divisionId) {
    params.push(scope.divisionId);
    conditions.push(`dv.id = $${params.length}`);
  } else if (scope.districtId) {
    params.push(scope.districtId);
    conditions.push(`d.id = $${params.length}`);
  }

  if (filters.resolved === "true") {
    conditions.push(`dr.resolved = TRUE`);
  } else if (filters.resolved === "false") {
    conditions.push(`dr.resolved = FALSE`);
  }
  if (filters.actionType) {
    params.push(filters.actionType);
    conditions.push(`dr.action_type = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<DisciplinaryListItem>(
    `${SELECT} ${where} ORDER BY dr.issued_date DESC, dr.created_at DESC`,
    params
  );
}

/** Records for one representative (used on the rep detail page). */
export async function listDisciplinaryForRep(
  representativeId: string
): Promise<DisciplinaryListItem[]> {
  return query<DisciplinaryListItem>(
    `${SELECT} WHERE dr.representative_id = $1
      ORDER BY dr.issued_date DESC, dr.created_at DESC`,
    [representativeId]
  );
}

export interface NewDisciplinary {
  representativeId: string;
  actionType: DisciplinaryActionType;
  reason: string;
  issuedDate: string; // 'YYYY-MM-DD'
  effectiveFrom: string;
  effectiveTo?: string | null;
  evidenceUrls?: string[];
}

/**
 * Create a disciplinary record. HQ + divisional_head only (a divisional head is
 * also constrained to reps within their division). Notifies the affected rep's
 * user and writes an audit row in the same transaction. Returns the new id.
 */
export async function createDisciplinary(
  input: NewDisciplinary,
  user: SessionUser
): Promise<string> {
  if (!canManageDisciplinary(user)) {
    throw new Error("You are not authorized to issue disciplinary actions.");
  }
  if (!input.reason || !input.reason.trim()) {
    throw new Error("A reason is required.");
  }

  // Resolve the rep's user + geography to notify and (for div heads) scope-check.
  const rep = await queryOne<{
    rep_user_id: string;
    full_name: string;
    division_id: string;
  }>(
    `SELECT rep.user_id AS rep_user_id, u.full_name, dv.id AS division_id
       FROM representatives rep
       JOIN users u      ON u.id = rep.user_id
       JOIN upazilas up  ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      WHERE rep.id = $1`,
    [input.representativeId]
  );
  if (!rep) throw new Error("Representative not found.");

  if (!isHQ(user) && hasRole(user, "divisional_head")) {
    const { divisionId } = scopeForRole(user, "divisional_head");
    if (!divisionId || divisionId !== rep.division_id) {
      throw new Error("That representative is outside your division.");
    }
  }

  const ACTION_LABEL: Record<DisciplinaryActionType, string> = {
    written_warning: "Written warning",
    suspension: "Suspension",
    termination: "Termination",
  };

  return withTransaction(async (client) => {
    const res = await client.query<{ id: string }>(
      `INSERT INTO disciplinary_records
          (representative_id, action_type, reason, evidence_urls, issued_by,
           issued_date, effective_from, effective_to)
       VALUES ($1,$2,$3,$4,$5,$6::date,$7::date,$8)
       RETURNING id`,
      [
        input.representativeId,
        input.actionType,
        input.reason.trim(),
        JSON.stringify(input.evidenceUrls ?? []),
        user.id,
        input.issuedDate,
        input.effectiveFrom,
        input.effectiveTo ? input.effectiveTo : null,
      ]
    );
    const id = res.rows[0]!.id;

    await createNotification(
      rep.rep_user_id,
      {
        title: `Disciplinary action: ${ACTION_LABEL[input.actionType]}`,
        message: input.reason.trim(),
        type: "disciplinary",
        actionUrl: "/disciplinary",
      },
      client
    );

    await recordAudit(client, {
      userId: user.id,
      action: "create",
      tableName: "disciplinary_records",
      recordId: id,
      newValue: {
        representative_id: input.representativeId,
        action_type: input.actionType,
      },
    });

    return id;
  });
}

/**
 * Resolve a disciplinary record with resolution notes. HQ + div head only
 * (div head constrained to their division). Idempotent-ish: resolving an
 * already-resolved record errors.
 */
export async function resolveDisciplinary(
  id: string,
  resolutionNotes: string,
  user: SessionUser
): Promise<void> {
  if (!canManageDisciplinary(user)) {
    throw new Error("You are not authorized to resolve disciplinary actions.");
  }

  const record = await queryOne<{
    id: string;
    resolved: boolean;
    division_id: string;
    rep_user_id: string;
  }>(
    `SELECT dr.id, dr.resolved, dv.id AS division_id, rep.user_id AS rep_user_id
       FROM disciplinary_records dr
       JOIN representatives rep ON rep.id = dr.representative_id
       JOIN upazilas up  ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      WHERE dr.id = $1`,
    [id]
  );
  if (!record) throw new Error("Disciplinary record not found.");
  if (record.resolved) throw new Error("This record is already resolved.");

  if (!isHQ(user) && hasRole(user, "divisional_head")) {
    const { divisionId } = scopeForRole(user, "divisional_head");
    if (!divisionId || divisionId !== record.division_id) {
      throw new Error("That record is outside your division.");
    }
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE disciplinary_records
          SET resolved = TRUE,
              resolved_date = CURRENT_DATE,
              resolution_notes = $1
        WHERE id = $2`,
      [resolutionNotes.trim() || null, id]
    );

    await createNotification(
      record.rep_user_id,
      {
        title: "Disciplinary action resolved",
        message: resolutionNotes.trim() || "Your disciplinary record was resolved.",
        type: "disciplinary",
        actionUrl: "/disciplinary",
      },
      client
    );

    await recordAudit(client, {
      userId: user.id,
      action: "resolve",
      tableName: "disciplinary_records",
      recordId: id,
      oldValue: { resolved: false },
      newValue: { resolved: true },
    });
  });
}
