import "server-only";
import { query } from "./db";
import type { DepositRow } from "./types";

// -----------------------------------------------------------------------------
// Deposit read helpers.
// -----------------------------------------------------------------------------

/** List deposits for a representative, newest payment first. */
export async function listDeposits(
  representativeId: string
): Promise<DepositRow[]> {
  return query<DepositRow>(
    `SELECT id, representative_id, type, amount, is_refundable, payment_date,
            payment_method, reference_no, verified, verified_at, notes, created_at
       FROM deposits
      WHERE representative_id = $1
      ORDER BY payment_date DESC, created_at DESC`,
    [representativeId]
  );
}

export interface DepositTotals {
  total: number;
  refundable: number;
  nonRefundable: number;
  onboarding: number;
}

/** Sum deposits by category for a representative summary. */
export function sumDeposits(deposits: DepositRow[]): DepositTotals {
  const totals: DepositTotals = {
    total: 0,
    refundable: 0,
    nonRefundable: 0,
    onboarding: 0,
  };
  for (const d of deposits) {
    const amt = Number(d.amount) || 0;
    totals.total += amt;
    if (d.type === "investment_refundable") totals.refundable += amt;
    else if (d.type === "investment_non_refundable") totals.nonRefundable += amt;
    else if (d.type === "onboarding_fee") totals.onboarding += amt;
  }
  return totals;
}
