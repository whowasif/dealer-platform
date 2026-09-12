import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "./db";
import { recordAudit } from "./audit";
import { toDateOnly } from "./profit-config";
import type { InvestmentSplitConfigRow } from "./types";

// -----------------------------------------------------------------------------
// investment_split_config — how the 40% "investment" slice of NET PROFIT is
// sub-divided (v5.0). Versioned by an [effective_from, effective_to] window,
// exactly like profit_distribution_config. All percentages are of NET PROFIT:
//   executive_percentage + supervision_percentage + future_works_percentage = 40
//   supervision_sub_percentage + support_fund_sub_percentage = supervision_percentage
// The DB enforces both sums via CHECK constraints (see migration 07).
// -----------------------------------------------------------------------------

const COLS = `id, executive_percentage, supervision_percentage, future_works_percentage,
              supervision_sub_percentage, support_fund_sub_percentage,
              effective_from, effective_to, notes, created_by, created_at`;

/** The investment-split config effective on `date` (default: today). */
export async function getActiveInvestmentSplitConfig(
  date?: string | null
): Promise<InvestmentSplitConfigRow | null> {
  const on = date ?? toDateOnly(new Date());
  return queryOne<InvestmentSplitConfigRow>(
    `SELECT ${COLS}
       FROM investment_split_config
      WHERE effective_from <= $1::date
        AND (effective_to IS NULL OR effective_to >= $1::date)
      ORDER BY effective_from DESC
      LIMIT 1`,
    [on]
  );
}

/** Same as getActiveInvestmentSplitConfig but bound to a transaction client. */
export async function getActiveInvestmentSplitConfigTx(
  client: PoolClient,
  date: string
): Promise<InvestmentSplitConfigRow | null> {
  const res = await client.query<InvestmentSplitConfigRow>(
    `SELECT ${COLS}
       FROM investment_split_config
      WHERE effective_from <= $1::date
        AND (effective_to IS NULL OR effective_to >= $1::date)
      ORDER BY effective_from DESC
      LIMIT 1`,
    [date]
  );
  return res.rows[0] ?? null;
}

/** Full versioned history, newest window first. */
export async function listInvestmentSplitConfigHistory(): Promise<
  InvestmentSplitConfigRow[]
> {
  return query<InvestmentSplitConfigRow>(
    `SELECT ${COLS}
       FROM investment_split_config
      ORDER BY effective_from DESC, created_at DESC`
  );
}

export interface NewInvestmentSplitConfig {
  executive_percentage: number;
  supervision_percentage: number;
  future_works_percentage: number;
  supervision_sub_percentage: number;
  support_fund_sub_percentage: number;
  effective_from: string; // 'YYYY-MM-DD'
  notes?: string | null;
}

/**
 * Create a new versioned investment-split config. The three top-level buckets
 * must sum to the given `investmentPercentage` (the active investment slice,
 * 40 by default) and the two supervision sub-parts must sum to
 * supervision_percentage. Closes the previously-open window the day before the
 * new effective_from. Runs atomically. Returns the new row id.
 */
export async function createInvestmentSplitConfig(
  input: NewInvestmentSplitConfig,
  investmentPercentage: number,
  createdBy: string
): Promise<string> {
  const topSum =
    input.executive_percentage +
    input.supervision_percentage +
    input.future_works_percentage;
  if (Math.round(topSum * 100) / 100 !== Math.round(investmentPercentage * 100) / 100) {
    throw new Error(
      `Executive + Supervision + Future Works must add up to the investment share (${investmentPercentage}%).`
    );
  }
  const subSum =
    input.supervision_sub_percentage + input.support_fund_sub_percentage;
  if (Math.round(subSum * 100) / 100 !== Math.round(input.supervision_percentage * 100) / 100) {
    throw new Error(
      "Supervision incentive + Support Fund must add up to the Supervision share."
    );
  }
  const values = [
    input.executive_percentage,
    input.supervision_percentage,
    input.future_works_percentage,
    input.supervision_sub_percentage,
    input.support_fund_sub_percentage,
  ];
  if (values.some((v) => v < 0)) {
    throw new Error("Percentages cannot be negative.");
  }

  return withTransaction(async (client) => {
    await client.query(
      `UPDATE investment_split_config
          SET effective_to = ($1::date - INTERVAL '1 day')::date
        WHERE effective_to IS NULL
          AND effective_from < $1::date`,
      [input.effective_from]
    );
    const clash = await client.query<{ id: string }>(
      `SELECT id FROM investment_split_config
        WHERE effective_from >= $1::date AND effective_to IS NULL`,
      [input.effective_from]
    );
    if (clash.rowCount && clash.rows.length > 0) {
      throw new Error(
        "A split config already starts on or after that date. Pick a later effective date."
      );
    }
    const res = await client.query<{ id: string }>(
      `INSERT INTO investment_split_config
          (executive_percentage, supervision_percentage, future_works_percentage,
           supervision_sub_percentage, support_fund_sub_percentage,
           effective_from, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8)
       RETURNING id`,
      [
        input.executive_percentage,
        input.supervision_percentage,
        input.future_works_percentage,
        input.supervision_sub_percentage,
        input.support_fund_sub_percentage,
        input.effective_from,
        input.notes ?? null,
        createdBy,
      ]
    );
    const id = res.rows[0]!.id;
    await recordAudit(client, {
      userId: createdBy,
      action: "create",
      tableName: "investment_split_config",
      recordId: id,
      newValue: {
        executive_percentage: input.executive_percentage,
        supervision_percentage: input.supervision_percentage,
        future_works_percentage: input.future_works_percentage,
        supervision_sub_percentage: input.supervision_sub_percentage,
        support_fund_sub_percentage: input.support_fund_sub_percentage,
        effective_from: input.effective_from,
      },
    });
    return id;
  });
}
