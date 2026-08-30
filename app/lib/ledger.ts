import "server-only";
import type { PoolClient } from "pg";
import { query } from "./db";
import type { LedgerRow } from "./types";

// -----------------------------------------------------------------------------
// Financial ledger — a running per-representative account with HQ.
//
// LEDGER SEMANTICS (kept consistent everywhere):
//   The ledger is viewed from the REPRESENTATIVE'S perspective, as an account
//   they hold with HQ.
//     * A CHARGE the rep owes (e.g. a fee invoice) = DEBIT  (increases what
//       they owe).
//     * A PAYMENT the rep makes                    = CREDIT (reduces what they
//       owe).
//     * Running balance = previous_balance + debit - credit.
//       A POSITIVE balance means the rep OWES money; zero/negative means they
//       are settled or in credit.
//   Each ledger row stores debit, credit AND the resulting running balance for
//   that representative. The balance is computed as
//       previous_balance_for_that_rep + debit - credit
//   in insertion order (by transaction_date, then created_at).
//
// INTEGRITY: every ledger write MUST go through postLedgerEntry inside a
// transaction. postLedgerEntry locks the representative's existing ledger rows
// (SELECT ... FOR UPDATE) so a concurrent write cannot compute a stale running
// balance. All money DECIMALs are strings from node-postgres; math uses
// Number() and results are rounded to 2 decimals.
// -----------------------------------------------------------------------------

/** Round to 2 decimals (money). */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface LedgerEntryInput {
  representativeId: string;
  /** 'YYYY-MM-DD'. */
  transactionDate: string;
  transactionType: string;
  description: string;
  /** Amount the rep now owes (charge). Use 0 when this is a payment. */
  debit: number;
  /** Amount the rep paid (settlement). Use 0 when this is a charge. */
  credit: number;
  referenceType: string | null;
  referenceId: string | null;
}

/**
 * The rep's current balance, computed inside a transaction with the rep's
 * ledger rows locked FOR UPDATE. Returns 0 when the rep has no ledger yet.
 */
export async function getCurrentBalanceTx(
  client: PoolClient,
  representativeId: string
): Promise<number> {
  // Lock all existing ledger rows for this rep, then read the latest balance in
  // insertion order. Locking the rows prevents a concurrent postLedgerEntry from
  // computing a running balance off a soon-to-be-stale value.
  const res = await client.query<{ balance: string }>(
    `SELECT balance
       FROM financial_ledger
      WHERE representative_id = $1
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT 1
      FOR UPDATE`,
    [representativeId]
  );
  if (res.rowCount === 0) return 0;
  return Number(res.rows[0]!.balance);
}

/**
 * Post a single ledger entry for a representative INSIDE the caller's
 * transaction. Locks the rep's prior ledger rows, computes the new running
 * balance (previous + debit - credit) and inserts the row. Returns the new
 * ledger row id and the resulting balance.
 *
 * Exactly one of debit/credit is normally non-zero, but both are stored as
 * given (never negative).
 */
export async function postLedgerEntry(
  client: PoolClient,
  input: LedgerEntryInput
): Promise<{ id: string; balance: number }> {
  const debit = round2(Math.max(0, input.debit || 0));
  const credit = round2(Math.max(0, input.credit || 0));

  const previous = await getCurrentBalanceTx(client, input.representativeId);
  const balance = round2(previous + debit - credit);

  const res = await client.query<{ id: string }>(
    `INSERT INTO financial_ledger
        (representative_id, transaction_date, transaction_type, description,
         debit, credit, balance, reference_type, reference_id)
     VALUES ($1,$2::date,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      input.representativeId,
      input.transactionDate,
      input.transactionType,
      input.description,
      debit,
      credit,
      balance,
      input.referenceType,
      input.referenceId,
    ]
  );
  return { id: res.rows[0]!.id, balance };
}

/** All ledger rows for a representative in insertion order (oldest first). */
export async function getLedger(representativeId: string): Promise<LedgerRow[]> {
  return query<LedgerRow>(
    `SELECT id, representative_id, transaction_date, transaction_type,
            description, debit, credit, balance, reference_type, reference_id,
            created_at
       FROM financial_ledger
      WHERE representative_id = $1
      ORDER BY transaction_date ASC, created_at ASC`,
    [representativeId]
  );
}

/**
 * The representative's current balance (positive = they owe). Reads the latest
 * ledger row's balance; returns 0 when there is no ledger yet.
 */
export async function getCurrentBalance(
  representativeId: string
): Promise<number> {
  const rows = await query<{ balance: string }>(
    `SELECT balance
       FROM financial_ledger
      WHERE representative_id = $1
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT 1`,
    [representativeId]
  );
  if (rows.length === 0) return 0;
  return Number(rows[0]!.balance);
}
