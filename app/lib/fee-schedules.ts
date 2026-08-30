import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "./db";
import { toDateOnly } from "./profit-config";
import { recordAudit } from "./audit";
import type { FeeScheduleRow, FeeType } from "./types";

// -----------------------------------------------------------------------------
// Fee schedules — versioned fee configuration, one open window per fee_type.
//
// MIRRORS the [effective_from, effective_to] windowing used by
// lib/profit-config.ts, but scoped per fee_type (monthly_software /
// contract_renewal / other). A NULL effective_to means "still in effect". At
// most one row per fee_type should be active on any given date. Creating a new
// version for a fee_type closes that fee_type's previously-open row by setting
// its effective_to to the day BEFORE the new row's effective_from.
//
// The "currently effective" row for a fee_type on date D is the row whose
// window contains D (effective_from <= D AND (effective_to IS NULL OR
// effective_to >= D)); when several match we take the latest effective_from.
//
// Amounts come back from node-postgres as strings; callers parse with Number().
// -----------------------------------------------------------------------------

// ------------------------------ Active reads ---------------------------------

/**
 * The fee schedule for `feeType` effective on `date` (default today), or null
 * if no schedule row exists for that fee_type/date (callers may fall back to
 * the package's monthly_maintenance_fee).
 */
export async function getActiveFeeSchedule(
  feeType: FeeType,
  date?: string | null
): Promise<FeeScheduleRow | null> {
  const on = date ?? toDateOnly(new Date());
  return queryOne<FeeScheduleRow>(
    `SELECT id, fee_type, amount, description, effective_from, effective_to,
            created_at
       FROM fee_schedules
      WHERE fee_type = $1
        AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to >= $2::date)
      ORDER BY effective_from DESC
      LIMIT 1`,
    [feeType, on]
  );
}

/** Same as getActiveFeeSchedule but bound to a transaction client. */
export async function getActiveFeeScheduleTx(
  client: PoolClient,
  feeType: FeeType,
  date: string
): Promise<FeeScheduleRow | null> {
  const res = await client.query<FeeScheduleRow>(
    `SELECT id, fee_type, amount, description, effective_from, effective_to,
            created_at
       FROM fee_schedules
      WHERE fee_type = $1
        AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to >= $2::date)
      ORDER BY effective_from DESC
      LIMIT 1`,
    [feeType, date]
  );
  return res.rows[0] ?? null;
}

// ------------------------------- History -------------------------------------

/**
 * Fee schedule history, newest window first. Optionally narrowed to one
 * fee_type.
 */
export async function listFeeScheduleHistory(
  feeType?: FeeType | null
): Promise<FeeScheduleRow[]> {
  if (feeType) {
    return query<FeeScheduleRow>(
      `SELECT id, fee_type, amount, description, effective_from, effective_to,
              created_at
         FROM fee_schedules
        WHERE fee_type = $1
        ORDER BY effective_from DESC, created_at DESC`,
      [feeType]
    );
  }
  return query<FeeScheduleRow>(
    `SELECT id, fee_type, amount, description, effective_from, effective_to,
            created_at
       FROM fee_schedules
      ORDER BY fee_type ASC, effective_from DESC, created_at DESC`
  );
}

// ------------------------------- Writes --------------------------------------

export interface NewFeeSchedule {
  fee_type: FeeType;
  amount: number;
  description: string | null;
  effective_from: string; // 'YYYY-MM-DD'
}

/**
 * Create a new versioned fee schedule for a fee_type. Closes the previously-open
 * window for THAT SAME fee_type the day before the new effective_from. Runs
 * atomically. Returns the new row id.
 */
export async function createFeeSchedule(
  input: NewFeeSchedule,
  auditUserId?: string | null
): Promise<string> {
  if (!(input.amount >= 0)) {
    throw new Error("Fee amount cannot be negative.");
  }

  return withTransaction(async (client) => {
    // Close the previously-open window(s) for this fee_type only.
    await client.query(
      `UPDATE fee_schedules
          SET effective_to = ($1::date - INTERVAL '1 day')::date
        WHERE fee_type = $2
          AND effective_to IS NULL
          AND effective_from < $1::date`,
      [input.effective_from, input.fee_type]
    );
    // Guard: no other row of this fee_type may already start on/after this date
    // with an open end.
    const clash = await client.query<{ id: string }>(
      `SELECT id FROM fee_schedules
        WHERE fee_type = $1
          AND effective_from >= $2::date
          AND effective_to IS NULL`,
      [input.fee_type, input.effective_from]
    );
    if (clash.rowCount && clash.rows.length > 0) {
      throw new Error(
        "A schedule for this fee type already starts on or after that date. Pick a later effective date."
      );
    }
    const res = await client.query<{ id: string }>(
      `INSERT INTO fee_schedules
          (fee_type, amount, description, effective_from)
       VALUES ($1,$2,$3,$4::date)
       RETURNING id`,
      [input.fee_type, input.amount, input.description, input.effective_from]
    );
    const id = res.rows[0]!.id;
    await recordAudit(client, {
      userId: auditUserId ?? null,
      action: "create",
      tableName: "fee_schedules",
      recordId: id,
      newValue: {
        fee_type: input.fee_type,
        amount: input.amount,
        effective_from: input.effective_from,
      },
    });
    return id;
  });
}
