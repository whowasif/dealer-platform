import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "./db";
import { recordAudit } from "./audit";
import type { InvestmentConfigRow, ProfitConfigRow } from "./types";

// -----------------------------------------------------------------------------
// Profit-distribution and investment-pool configuration.
//
// Both tables are versioned by an [effective_from, effective_to] date window.
// A NULL effective_to means "still in effect". At most one row should be active
// on any given date. Creating a new version closes the previously-open row by
// setting its effective_to to the day BEFORE the new row's effective_from.
//
// The "currently effective" row for a date D is the row whose window contains D
// (effective_from <= D AND (effective_to IS NULL OR effective_to >= D)); when
// several match we take the one with the latest effective_from.
//
// All numeric columns come back from node-postgres as strings; callers parse
// with Number() when doing math (see lib/projects.ts).
// -----------------------------------------------------------------------------

/** Format a JS Date (or ISO string) to a 'YYYY-MM-DD' date literal. */
export function toDateOnly(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ------------------------------ Active reads ---------------------------------

/**
 * The profit-distribution config effective on `date` (default: today). Returns
 * null only if the table is empty (it is seeded 20/40/40 by 03_seed_config.sql).
 */
export async function getActiveProfitConfig(
  date?: string | null
): Promise<ProfitConfigRow | null> {
  const on = date ?? toDateOnly(new Date());
  return queryOne<ProfitConfigRow>(
    `SELECT id, representative_percentage, hq_percentage, investment_percentage,
            effective_from, effective_to, created_by, created_at
       FROM profit_distribution_config
      WHERE effective_from <= $1::date
        AND (effective_to IS NULL OR effective_to >= $1::date)
      ORDER BY effective_from DESC
      LIMIT 1`,
    [on]
  );
}

/**
 * The investment-pool config effective on `date` (default: today). Returns null
 * only if the table is empty (seeded per_unit_amount=100000).
 */
export async function getActiveInvestmentConfig(
  date?: string | null
): Promise<InvestmentConfigRow | null> {
  const on = date ?? toDateOnly(new Date());
  return queryOne<InvestmentConfigRow>(
    `SELECT id, per_unit_amount, total_working_capital, effective_from,
            effective_to, notes, created_at
       FROM investment_pool_config
      WHERE effective_from <= $1::date
        AND (effective_to IS NULL OR effective_to >= $1::date)
      ORDER BY effective_from DESC
      LIMIT 1`,
    [on]
  );
}

/** Same as getActiveProfitConfig but bound to a transaction client. */
export async function getActiveProfitConfigTx(
  client: PoolClient,
  date: string
): Promise<ProfitConfigRow | null> {
  const res = await client.query<ProfitConfigRow>(
    `SELECT id, representative_percentage, hq_percentage, investment_percentage,
            effective_from, effective_to, created_by, created_at
       FROM profit_distribution_config
      WHERE effective_from <= $1::date
        AND (effective_to IS NULL OR effective_to >= $1::date)
      ORDER BY effective_from DESC
      LIMIT 1`,
    [date]
  );
  return res.rows[0] ?? null;
}

/** Same as getActiveInvestmentConfig but bound to a transaction client. */
export async function getActiveInvestmentConfigTx(
  client: PoolClient,
  date: string
): Promise<InvestmentConfigRow | null> {
  const res = await client.query<InvestmentConfigRow>(
    `SELECT id, per_unit_amount, total_working_capital, effective_from,
            effective_to, notes, created_at
       FROM investment_pool_config
      WHERE effective_from <= $1::date
        AND (effective_to IS NULL OR effective_to >= $1::date)
      ORDER BY effective_from DESC
      LIMIT 1`,
    [date]
  );
  return res.rows[0] ?? null;
}

// ------------------------------- History -------------------------------------

/** Full profit-config history, newest window first. */
export async function listProfitConfigHistory(): Promise<ProfitConfigRow[]> {
  return query<ProfitConfigRow>(
    `SELECT id, representative_percentage, hq_percentage, investment_percentage,
            effective_from, effective_to, created_by, created_at
       FROM profit_distribution_config
      ORDER BY effective_from DESC, created_at DESC`
  );
}

/** Full investment-pool config history, newest window first. */
export async function listInvestmentConfigHistory(): Promise<
  InvestmentConfigRow[]
> {
  return query<InvestmentConfigRow>(
    `SELECT id, per_unit_amount, total_working_capital, effective_from,
            effective_to, notes, created_at
       FROM investment_pool_config
      ORDER BY effective_from DESC, created_at DESC`
  );
}

// ------------------------------- Writes --------------------------------------

export interface NewProfitConfig {
  representative_percentage: number;
  hq_percentage: number;
  investment_percentage: number;
  effective_from: string; // 'YYYY-MM-DD'
}

/**
 * Create a new versioned profit config. Closes any row whose window is still
 * open on/after the new effective_from by setting its effective_to to the day
 * before. The three percentages MUST sum to exactly 100 (also enforced by the
 * table CHECK constraint). Runs atomically. Returns the new row id.
 */
export async function createProfitConfig(
  input: NewProfitConfig,
  createdBy: string
): Promise<string> {
  const sum =
    input.representative_percentage +
    input.hq_percentage +
    input.investment_percentage;
  // Compare with a small tolerance for float input, but store what was given.
  if (Math.round(sum * 100) / 100 !== 100) {
    throw new Error("Percentages must add up to exactly 100%.");
  }
  if (
    input.representative_percentage < 0 ||
    input.hq_percentage < 0 ||
    input.investment_percentage < 0
  ) {
    throw new Error("Percentages cannot be negative.");
  }

  return withTransaction(async (client) => {
    // Close the previously-open window(s) the day before the new one starts.
    await client.query(
      `UPDATE profit_distribution_config
          SET effective_to = ($1::date - INTERVAL '1 day')::date
        WHERE effective_to IS NULL
          AND effective_from < $1::date`,
      [input.effective_from]
    );
    // Guard: no other row may already start on/after this date with an open end.
    const clash = await client.query<{ id: string }>(
      `SELECT id FROM profit_distribution_config
        WHERE effective_from >= $1::date AND effective_to IS NULL`,
      [input.effective_from]
    );
    if (clash.rowCount && clash.rows.length > 0) {
      throw new Error(
        "A config already starts on or after that date. Pick a later effective date."
      );
    }
    const res = await client.query<{ id: string }>(
      `INSERT INTO profit_distribution_config
          (representative_percentage, hq_percentage, investment_percentage,
           effective_from, created_by)
       VALUES ($1,$2,$3,$4::date,$5)
       RETURNING id`,
      [
        input.representative_percentage,
        input.hq_percentage,
        input.investment_percentage,
        input.effective_from,
        createdBy,
      ]
    );
    const id = res.rows[0]!.id;
    await recordAudit(client, {
      userId: createdBy,
      action: "create",
      tableName: "profit_distribution_config",
      recordId: id,
      newValue: {
        representative_percentage: input.representative_percentage,
        hq_percentage: input.hq_percentage,
        investment_percentage: input.investment_percentage,
        effective_from: input.effective_from,
      },
    });
    return id;
  });
}

export interface NewInvestmentConfig {
  per_unit_amount: number;
  total_working_capital: number | null;
  effective_from: string; // 'YYYY-MM-DD'
  notes: string | null;
}

/**
 * Create a new versioned investment-pool config. Closes the previously-open
 * window the day before the new effective_from. Runs atomically. Returns the
 * new row id.
 */
export async function createInvestmentConfig(
  input: NewInvestmentConfig,
  auditUserId?: string | null
): Promise<string> {
  if (!(input.per_unit_amount > 0)) {
    throw new Error("Per-unit amount must be greater than zero.");
  }

  return withTransaction(async (client) => {
    await client.query(
      `UPDATE investment_pool_config
          SET effective_to = ($1::date - INTERVAL '1 day')::date
        WHERE effective_to IS NULL
          AND effective_from < $1::date`,
      [input.effective_from]
    );
    const clash = await client.query<{ id: string }>(
      `SELECT id FROM investment_pool_config
        WHERE effective_from >= $1::date AND effective_to IS NULL`,
      [input.effective_from]
    );
    if (clash.rowCount && clash.rows.length > 0) {
      throw new Error(
        "A config already starts on or after that date. Pick a later effective date."
      );
    }
    const res = await client.query<{ id: string }>(
      `INSERT INTO investment_pool_config
          (per_unit_amount, total_working_capital, effective_from, notes)
       VALUES ($1,$2,$3::date,$4)
       RETURNING id`,
      [
        input.per_unit_amount,
        input.total_working_capital,
        input.effective_from,
        input.notes,
      ]
    );
    const id = res.rows[0]!.id;
    await recordAudit(client, {
      userId: auditUserId ?? null,
      action: "create",
      tableName: "investment_pool_config",
      recordId: id,
      newValue: {
        per_unit_amount: input.per_unit_amount,
        effective_from: input.effective_from,
      },
    });
    return id;
  });
}
