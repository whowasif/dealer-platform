import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne } from "./db";
import type { FundLedgerRow, FundSummary, FundType } from "./types";

// -----------------------------------------------------------------------------
// Fund ledgers (v5.0):
//   * representative_support_fund_ledger  — funded from the ~2% support sub-bucket
//   * future_works_fund_ledger            — funded from the 20% future-works bucket
//   * growth_fund_ledger                  — returns from investing pooled deposits
//
// Each is a simple credit/debit ledger with a running balance. Credits are
// posted automatically when a project's profit is distributed; debits (payouts,
// usage) are recorded manually elsewhere. All amounts are non-negative; the
// direction is chosen by which column is set.
// -----------------------------------------------------------------------------

const TABLE: Record<FundType, string> = {
  representative_support: "representative_support_fund_ledger",
  future_works: "future_works_fund_ledger",
  growth: "growth_fund_ledger",
};

function tableFor(fund: FundType): string {
  const t = TABLE[fund];
  if (!t) throw new Error(`Unknown fund: ${fund}`);
  return t;
}

/** Current balance of a fund (0 when the ledger is empty). */
export async function getFundBalance(fund: FundType): Promise<number> {
  const row = await queryOne<{ balance: string | null }>(
    `SELECT COALESCE(SUM(credit) - SUM(debit), 0) AS balance FROM ${tableFor(
      fund
    )}`
  );
  return Number(row?.balance ?? 0);
}

/** Balance + totals + entry count for a fund. */
export async function getFundSummary(fund: FundType): Promise<FundSummary> {
  const row = await queryOne<{
    total_credit: string | null;
    total_debit: string | null;
    entry_count: string | null;
  }>(
    `SELECT COALESCE(SUM(credit),0) AS total_credit,
            COALESCE(SUM(debit),0)  AS total_debit,
            COUNT(*)                AS entry_count
       FROM ${tableFor(fund)}`
  );
  const totalCredit = Number(row?.total_credit ?? 0);
  const totalDebit = Number(row?.total_debit ?? 0);
  return {
    fund,
    balance: Math.round((totalCredit - totalDebit) * 100) / 100,
    total_credit: totalCredit,
    total_debit: totalDebit,
    entry_count: Number(row?.entry_count ?? 0),
  };
}

/** Summaries for all three funds. */
export async function getAllFundSummaries(): Promise<FundSummary[]> {
  return Promise.all(
    (["representative_support", "future_works", "growth"] as FundType[]).map(
      getFundSummary
    )
  );
}

/** Recent ledger rows for a fund (newest first). */
export async function listFundLedger(
  fund: FundType,
  limit = 100
): Promise<FundLedgerRow[]> {
  const hasRep = fund === "representative_support";
  return query<FundLedgerRow>(
    `SELECT id, transaction_date, description, credit, debit, balance,
            reference_type, reference_id,
            ${hasRep ? "representative_id," : "NULL::uuid AS representative_id,"}
            created_by, created_at
       FROM ${tableFor(fund)}
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit]
  );
}

/**
 * Post a movement to a fund ledger INSIDE an existing transaction, computing
 * the new running balance atomically (locks the latest row for this fund).
 * Exactly one of `credit`/`debit` should be non-zero. Returns the new balance.
 */
export async function postFundEntryTx(
  client: PoolClient,
  fund: FundType,
  entry: {
    description: string;
    credit?: number;
    debit?: number;
    reference_type?: string | null;
    reference_id?: string | null;
    representative_id?: string | null;
    created_by?: string | null;
    transaction_date?: string | null;
  }
): Promise<number> {
  const table = tableFor(fund);
  const credit = Math.round((entry.credit ?? 0) * 100) / 100;
  const debit = Math.round((entry.debit ?? 0) * 100) / 100;

  // Lock the ledger's latest balance so concurrent posts don't race.
  const last = await client.query<{ balance: string }>(
    `SELECT balance FROM ${table} ORDER BY created_at DESC LIMIT 1 FOR UPDATE`
  );
  const prev = last.rowCount ? Number(last.rows[0]!.balance) : 0;
  const balance = Math.round((prev + credit - debit) * 100) / 100;

  if (fund === "representative_support") {
    await client.query(
      `INSERT INTO ${table}
          (transaction_date, description, credit, debit, balance,
           reference_type, reference_id, created_by, representative_id)
       VALUES (COALESCE($1::date, CURRENT_DATE), $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.transaction_date ?? null,
        entry.description,
        credit,
        debit,
        balance,
        entry.reference_type ?? null,
        entry.reference_id ?? null,
        entry.created_by ?? null,
        entry.representative_id ?? null,
      ]
    );
  } else {
    await client.query(
      `INSERT INTO ${table}
          (transaction_date, description, credit, debit, balance,
           reference_type, reference_id, created_by)
       VALUES (COALESCE($1::date, CURRENT_DATE), $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.transaction_date ?? null,
        entry.description,
        credit,
        debit,
        balance,
        entry.reference_type ?? null,
        entry.reference_id ?? null,
        entry.created_by ?? null,
      ]
    );
  }
  return balance;
}
