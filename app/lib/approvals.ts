import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "./db";
import { isHQ, hasRole, scopeForRole } from "./rbac";
import { recordAudit } from "./audit";
import { createNotification } from "./notifications";
import type { SessionUser } from "./types";

// -----------------------------------------------------------------------------
// Dual approval for rep-created ORDERS and PROJECTS.
//
// Flow: a representative creates the item -> PENDING. It must be approved at TWO
// stages before it becomes active:
//   Stage 1 — the DIVISIONAL HEAD of the rep's division.
//   Stage 2 — HQ (any HQ-level role).
// The two stages are independent (either can go first). Only when BOTH are
// recorded is the item "fully approved": orders.status -> 'approved',
// projects.status -> 'in_progress', and approved_by/approved_at stamped.
//
// Requires migration 06_dual_approval.sql (adds the *_approved_by/at columns).
// -----------------------------------------------------------------------------

export type ApprovableKind = "order" | "project";

export interface ApprovalRow {
  id: string;
  rep_division_id: string;
  rep_district_id: string;
  rep_user_id: string;
  division_approved_by: string | null;
  division_approved_at: string | null;
  hq_approved_by: string | null;
  hq_approved_at: string | null;
  status: string;
  label: string; // order_number or project_number
}

const SELECT_ORDER = `
  SELECT o.id,
         rd.division_id AS rep_division_id,
         rd.id          AS rep_district_id,
         rep.user_id    AS rep_user_id,
         o.division_approved_by, o.division_approved_at,
         o.hq_approved_by, o.hq_approved_at,
         o.status::text AS status,
         o.order_number AS label
    FROM orders o
    JOIN representatives rep ON rep.id = o.representative_id
    JOIN upazilas up ON up.id = rep.upazila_id
    JOIN districts rd ON rd.id = up.district_id
   WHERE o.id = $1`;

const SELECT_PROJECT = `
  SELECT p.id,
         rd.division_id AS rep_division_id,
         rd.id          AS rep_district_id,
         rep.user_id    AS rep_user_id,
         p.division_approved_by, p.division_approved_at,
         p.hq_approved_by, p.hq_approved_at,
         p.status::text AS status,
         p.project_number AS label
    FROM projects p
    JOIN representatives rep ON rep.id = p.representative_id
    JOIN upazilas up ON up.id = rep.upazila_id
    JOIN districts rd ON rd.id = up.district_id
   WHERE p.id = $1`;

async function loadApprovable(
  kind: ApprovableKind,
  id: string,
  client?: PoolClient
): Promise<ApprovalRow | null> {
  const sql = kind === "order" ? SELECT_ORDER : SELECT_PROJECT;
  if (client) {
    const r = await client.query<ApprovalRow>(sql, [id]);
    return r.rows[0] ?? null;
  }
  return queryOne<ApprovalRow>(sql, [id]);
}

export type ApprovalStage = "division" | "hq";

/**
 * Which stage (if any) this user is allowed to act on for a given item.
 * Returns the stage they can approve *next*, or null if they can't act.
 */
export function stageForUser(
  user: SessionUser,
  row: ApprovalRow
): ApprovalStage | null {
  // HQ can perform the HQ stage (if not yet done).
  if (isHQ(user) && !row.hq_approved_at) return "hq";

  // Divisional head scoped to the rep's division can perform the division stage.
  if (hasRole(user, "divisional_head") && !row.division_approved_at) {
    const scope = scopeForRole(user, "divisional_head");
    if (scope.divisionId && scope.divisionId === row.rep_division_id) {
      return "division";
    }
  }
  return null;
}

export interface ApprovalStatus {
  divisionApproved: boolean;
  hqApproved: boolean;
  fullyApproved: boolean;
  canApprove: ApprovalStage | null;
}

export function approvalStatus(
  user: SessionUser,
  row: ApprovalRow
): ApprovalStatus {
  const divisionApproved = !!row.division_approved_at;
  const hqApproved = !!row.hq_approved_at;
  return {
    divisionApproved,
    hqApproved,
    fullyApproved: divisionApproved && hqApproved,
    canApprove: stageForUser(user, row),
  };
}

/**
 * Record an approval for the given stage. Enforces scope, prevents
 * double-approval, and — when both stages are complete — flips the underlying
 * status. Notifies the rep. Returns a short status string.
 */
export async function approve(
  kind: ApprovableKind,
  id: string,
  user: SessionUser
): Promise<{ fullyApproved: boolean; stage: ApprovalStage }> {
  return withTransaction(async (client) => {
    const row = await loadApprovable(kind, id, client);
    if (!row) throw new Error("Item not found.");

    const stage = stageForUser(user, row);
    if (!stage) {
      throw new Error("You are not authorized to approve this at this stage.");
    }

    const table = kind === "order" ? "orders" : "projects";

    if (stage === "division") {
      await client.query(
        `UPDATE ${table}
            SET division_approved_by = $1, division_approved_at = NOW(),
                updated_at = NOW()
          WHERE id = $2`,
        [user.id, id]
      );
    } else {
      await client.query(
        `UPDATE ${table}
            SET hq_approved_by = $1, hq_approved_at = NOW(),
                updated_at = NOW()
          WHERE id = $2`,
        [user.id, id]
      );
    }

    // Re-read to see if BOTH stages are now complete.
    const after = await loadApprovable(kind, id, client);
    const fullyApproved =
      !!after?.division_approved_at && !!after?.hq_approved_at;

    if (fullyApproved) {
      if (kind === "order") {
        await client.query(
          `UPDATE orders
              SET status = 'approved', approved_by = $1, approved_at = NOW(),
                  updated_at = NOW()
            WHERE id = $2 AND status = 'pending'`,
          [user.id, id]
        );
      } else {
        await client.query(
          `UPDATE projects
              SET status = 'in_progress', updated_at = NOW()
            WHERE id = $2 AND status = 'draft'`,
          [user.id, id]
        );
      }
    }

    await recordAudit(client, {
      userId: user.id,
      action: "approve",
      tableName: table,
      recordId: id,
      newValue: { stage, fully_approved: fullyApproved },
    });

    // Notify the representative (owner) about progress.
    if (row.rep_user_id) {
      const kindLabel = kind === "order" ? "Order" : "Project";
      const msg = fullyApproved
        ? `${kindLabel} ${row.label} is fully approved and now active.`
        : `${kindLabel} ${row.label} received ${
            stage === "division" ? "divisional head" : "HQ"
          } approval. Awaiting the other stage.`;
      await createNotification(
        row.rep_user_id,
        {
          title: fullyApproved ? `${kindLabel} approved` : `${kindLabel} approval update`,
          message: msg,
          type: "approval",
          actionUrl: kind === "order" ? `/orders/${id}` : `/projects/${id}`,
        },
        client
      );
    }

    return { fullyApproved, stage };
  });
}

/**
 * Load the approval row for display/authorization on a detail page.
 */
export async function getApproval(
  kind: ApprovableKind,
  id: string
): Promise<ApprovalRow | null> {
  return loadApprovable(kind, id);
}

/**
 * Notify the approvers (divisional head of the rep's division + all HQ users)
 * that a new rep-created item needs approval. Best-effort; call after creation.
 */
export async function notifyApproversOfNew(
  kind: ApprovableKind,
  id: string,
  client?: PoolClient
): Promise<void> {
  const row = await loadApprovable(kind, id, client);
  if (!row) return;

  const kindLabel = kind === "order" ? "Order" : "Project";
  const actionUrl = kind === "order" ? `/orders/${id}` : `/projects/${id}`;

  // Divisional head(s) scoped to the rep's division.
  const heads = await query<{ user_id: string }>(
    `SELECT ur.user_id
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE r.name = 'divisional_head'
        AND ur.scope_division_id = $1`,
    [row.rep_division_id]
  );
  // HQ users.
  const hqUsers = await query<{ user_id: string }>(
    `SELECT DISTINCT ur.user_id
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE r.name IN ('super_admin','hq_admin','hq_operations')`
  );

  const recipients = new Set<string>([
    ...heads.map((h) => h.user_id),
    ...hqUsers.map((h) => h.user_id),
  ]);

  for (const userId of recipients) {
    await createNotification(
      userId,
      {
        title: `${kindLabel} awaiting approval`,
        message: `${kindLabel} ${row.label} needs your approval.`,
        type: "approval",
        actionUrl,
      },
      client ?? null
    );
  }
}

/**
 * Count items awaiting THIS user's approval stage (for dashboard/queue badges).
 */
export async function pendingApprovalCount(
  user: SessionUser
): Promise<{ orders: number; projects: number }> {
  let orders = 0;
  let projects = 0;

  if (isHQ(user)) {
    const o = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM orders
        WHERE status = 'pending' AND hq_approved_at IS NULL`
    );
    const p = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM projects
        WHERE status = 'draft' AND hq_approved_at IS NULL`
    );
    orders += o ? Number(o.c) : 0;
    projects += p ? Number(p.c) : 0;
  }

  if (hasRole(user, "divisional_head")) {
    const scope = scopeForRole(user, "divisional_head");
    if (scope.divisionId) {
      const o = await query<{ id: string }>(
        `SELECT o.id FROM orders o
           JOIN representatives rep ON rep.id = o.representative_id
           JOIN upazilas up ON up.id = rep.upazila_id
           JOIN districts rd ON rd.id = up.district_id
          WHERE rd.division_id = $1
            AND o.status = 'pending' AND o.division_approved_at IS NULL`,
        [scope.divisionId]
      );
      const p = await query<{ id: string }>(
        `SELECT p.id FROM projects p
           JOIN representatives rep ON rep.id = p.representative_id
           JOIN upazilas up ON up.id = rep.upazila_id
           JOIN districts rd ON rd.id = up.district_id
          WHERE rd.division_id = $1
            AND p.status = 'draft' AND p.division_approved_at IS NULL`,
        [scope.divisionId]
      );
      orders += o.length;
      projects += p.length;
    }
  }

  return { orders, projects };
}
