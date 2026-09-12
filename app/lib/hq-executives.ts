import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "./db";
import { recordAudit } from "./audit";
import type { ExecutiveShare } from "./profit-engine";
import type { HqExecutiveListItem, HqExecutiveRow } from "./types";

// -----------------------------------------------------------------------------
// hq_executives — the 5-6 HQ Executives (NOT partners) who run the project.
// Each has a designation and an editable role_weight that sets their share of
// the 15% executives-profit bucket. Managed by the super admin.
// -----------------------------------------------------------------------------

const LIST_SELECT = `
  SELECT e.id, e.user_id, e.designation, e.role_weight, e.is_ceo, e.is_active,
         e.notes, e.created_at, e.updated_at,
         u.full_name, u.phone, u.official_email
    FROM hq_executives e
    JOIN users u ON u.id = e.user_id`;

/** All executives (active first, then by weight desc), joined with the user. */
export async function listExecutives(): Promise<HqExecutiveListItem[]> {
  return query<HqExecutiveListItem>(
    `${LIST_SELECT}
      ORDER BY e.is_active DESC, e.role_weight DESC, u.full_name ASC`
  );
}

/** A single executive by id, joined with the user. */
export async function getExecutive(
  id: string
): Promise<HqExecutiveListItem | null> {
  return queryOne<HqExecutiveListItem>(`${LIST_SELECT} WHERE e.id = $1`, [id]);
}

/** Active executive shares (user_id + weight) for a read-only preview. */
export async function getActiveExecutiveShares(): Promise<ExecutiveShare[]> {
  const rows = await query<{ user_id: string; role_weight: string }>(
    `SELECT user_id, role_weight
       FROM hq_executives
      WHERE is_active = TRUE AND role_weight > 0
      ORDER BY role_weight DESC, created_at ASC`
  );
  return rows.map((r) => ({
    user_id: r.user_id,
    role_weight: Number(r.role_weight),
  }));
}

/**
 * The active executive shares for the distribution engine (user_id + weight),
 * bound to a transaction client so a distribution snapshot is consistent.
 */
export async function getActiveExecutiveSharesTx(
  client: PoolClient
): Promise<ExecutiveShare[]> {
  const res = await client.query<{ user_id: string; role_weight: string }>(
    `SELECT user_id, role_weight
       FROM hq_executives
      WHERE is_active = TRUE AND role_weight > 0
      ORDER BY role_weight DESC, created_at ASC`
  );
  return res.rows.map((r) => ({
    user_id: r.user_id,
    role_weight: Number(r.role_weight),
  }));
}

export interface NewExecutive {
  user_id: string;
  designation: string;
  role_weight: number;
  is_ceo?: boolean;
  is_active?: boolean;
  notes?: string | null;
}

/** Add an executive. Returns the new row id. */
export async function createExecutive(
  input: NewExecutive,
  actorId: string
): Promise<string> {
  if (!input.user_id) throw new Error("A user must be selected.");
  if (!input.designation.trim()) throw new Error("Designation is required.");
  if (!(input.role_weight >= 0)) throw new Error("Role weight cannot be negative.");

  return withTransaction(async (client) => {
    const dup = await client.query<{ id: string }>(
      `SELECT id FROM hq_executives WHERE user_id = $1`,
      [input.user_id]
    );
    if (dup.rowCount && dup.rows.length > 0) {
      throw new Error("That user is already an HQ executive.");
    }
    const res = await client.query<{ id: string }>(
      `INSERT INTO hq_executives
          (user_id, designation, role_weight, is_ceo, is_active, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [
        input.user_id,
        input.designation.trim(),
        input.role_weight,
        input.is_ceo ?? false,
        input.is_active ?? true,
        input.notes ?? null,
      ]
    );
    const id = res.rows[0]!.id;
    await recordAudit(client, {
      userId: actorId,
      action: "create",
      tableName: "hq_executives",
      recordId: id,
      newValue: {
        user_id: input.user_id,
        designation: input.designation.trim(),
        role_weight: input.role_weight,
        is_ceo: input.is_ceo ?? false,
      },
    });
    return id;
  });
}

export interface UpdateExecutive {
  designation?: string;
  role_weight?: number;
  is_ceo?: boolean;
  is_active?: boolean;
  notes?: string | null;
}

/** Update an executive (designation, weight, ceo flag, active flag, notes). */
export async function updateExecutive(
  id: string,
  input: UpdateExecutive,
  actorId: string
): Promise<void> {
  if (input.role_weight !== undefined && !(input.role_weight >= 0)) {
    throw new Error("Role weight cannot be negative.");
  }
  if (input.designation !== undefined && !input.designation.trim()) {
    throw new Error("Designation cannot be empty.");
  }

  await withTransaction(async (client) => {
    const before = await client.query<HqExecutiveRow>(
      `SELECT id, user_id, designation, role_weight, is_ceo, is_active, notes,
              created_at, updated_at
         FROM hq_executives WHERE id = $1`,
      [id]
    );
    if (before.rowCount === 0) throw new Error("Executive not found.");

    await client.query(
      `UPDATE hq_executives
          SET designation = COALESCE($2, designation),
              role_weight = COALESCE($3, role_weight),
              is_ceo      = COALESCE($4, is_ceo),
              is_active   = COALESCE($5, is_active),
              notes       = COALESCE($6, notes),
              updated_at  = NOW()
        WHERE id = $1`,
      [
        id,
        input.designation?.trim() ?? null,
        input.role_weight ?? null,
        input.is_ceo ?? null,
        input.is_active ?? null,
        input.notes ?? null,
      ]
    );
    await recordAudit(client, {
      userId: actorId,
      action: "update",
      tableName: "hq_executives",
      recordId: id,
      oldValue: {
        designation: before.rows[0]!.designation,
        role_weight: before.rows[0]!.role_weight,
        is_active: before.rows[0]!.is_active,
      },
      newValue: {
        designation: input.designation?.trim(),
        role_weight: input.role_weight,
        is_ceo: input.is_ceo,
        is_active: input.is_active,
      },
    });
  });
}

/** Remove an executive entirely. */
export async function deleteExecutive(
  id: string,
  actorId: string
): Promise<void> {
  await withTransaction(async (client) => {
    const res = await client.query(`DELETE FROM hq_executives WHERE id = $1`, [
      id,
    ]);
    if (res.rowCount === 0) throw new Error("Executive not found.");
    await recordAudit(client, {
      userId: actorId,
      action: "delete",
      tableName: "hq_executives",
      recordId: id,
    });
  });
}
