// -----------------------------------------------------------------------------
// PURE profit/investment distribution engine — NO DB, NO clock, NO server-only.
//
// This module holds the math-critical core of Task 6 so it can be unit-tested
// in isolation (see scripts/verify-profit.ts). lib/projects.ts re-exports these
// symbols; server code should import from lib/projects.ts.
//
// Rounding contract (so totals reconcile to the penny):
//   - rep/hq/investment share amounts        -> round to 2dp
//   - investment_return_per_unit             -> round to 4dp (stored precision)
//   - each investment beneficiary amount     -> per_unit(4dp) * units, then 2dp
//   - HQ investment remainder                -> investment_share_amount minus the
//     SUM of the rounded beneficiary amounts (recorded even when 0). This makes
//     dealer + district_head + divisional_head + HQ == investment_share_amount.
// -----------------------------------------------------------------------------

import type {
  BeneficiaryRole,
  DistributionType,
  PayoutSchedule,
} from "./types";

/** Round a money value to 2 decimal places (half-up on positive values). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Round a per-unit rate to 4 decimal places (matches DECIMAL(14,4)). */
export function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/** Financial inputs to the distribution engine (all pre-parsed to numbers). */
export interface DistributionFinancials {
  net_profit: number;
  total_cost: number;
  representative_percentage: number;
  hq_percentage: number;
  investment_percentage: number;
  per_unit_amount: number;
}

/** The three parties connected to a project, resolved from the DB. */
export interface DistributionBeneficiaries {
  /** The main dealer (project's representative). */
  dealer: {
    rep_id: string;
    user_id: string;
    units: number;
    /** True when this dealer sits in the sadar upazila (IS the district head). */
    is_district_head: boolean;
  };
  /**
   * The district-head representative (rep in the sadar upazila of the district),
   * when the dealer is NOT already the district head. Null if none exists yet or
   * the dealer is the district head (handled via the dealer's own extra row).
   */
  districtHead: {
    rep_id: string;
    user_id: string;
    units: number;
  } | null;
  /**
   * The HQ-appointed divisional head user (divisions.head_user_id). Gets a fixed
   * 1 unit for effort. Null if none appointed yet.
   */
  divisionalHeadUserId: string | null;
}

/** A computed distribution row (before it is persisted). */
export interface ComputedDistribution {
  beneficiary_user_id: string | null;
  beneficiary_rep_id: string | null;
  beneficiary_role: BeneficiaryRole;
  distribution_type: DistributionType;
  units: number;
  rate_or_percentage: number | null;
  amount: number;
  payout_schedule: PayoutSchedule;
}

/** The full result of computing a project's distribution. */
export interface ComputedResult {
  net_profit: number;
  rep_share_amount: number;
  hq_share_amount: number;
  investment_share_amount: number;
  investment_return_per_unit: number;
  rows: ComputedDistribution[];
}

/**
 * PURE distribution engine. Given a project's financials, the active config
 * values, and the resolved beneficiaries, produce the exact list of
 * distribution rows plus the snapshot split amounts. No DB access, no clock.
 */
export function computeDistribution(
  fin: DistributionFinancials,
  ben: DistributionBeneficiaries
): ComputedResult {
  const netProfit = round2(fin.net_profit);

  const repShare = round2((netProfit * fin.representative_percentage) / 100);
  const hqShare = round2((netProfit * fin.hq_percentage) / 100);
  const investmentShare = round2((netProfit * fin.investment_percentage) / 100);

  // Per-unit investment return for THIS project (guard divide-by-zero).
  const perUnit =
    fin.total_cost > 0
      ? round4((investmentShare / fin.total_cost) * fin.per_unit_amount)
      : 0;

  const rows: ComputedDistribution[] = [];

  // --- Main dealer profit share (monthly) ---
  rows.push({
    beneficiary_user_id: ben.dealer.user_id,
    beneficiary_rep_id: ben.dealer.rep_id,
    beneficiary_role: "representative",
    distribution_type: "profit_share",
    units: 0,
    rate_or_percentage: round4(fin.representative_percentage),
    amount: repShare,
    payout_schedule: "monthly",
  });

  // --- HQ profit share (monthly) ---
  rows.push({
    beneficiary_user_id: null, // NULL user for the HQ pool
    beneficiary_rep_id: null,
    beneficiary_role: "hq",
    distribution_type: "profit_share",
    units: 0,
    rate_or_percentage: round4(fin.hq_percentage),
    amount: hqShare,
    payout_schedule: "monthly",
  });

  // --- Dealer investment return (annual) ---
  let investmentPaidOut = 0;
  const dealerInvest = round2(perUnit * ben.dealer.units);
  rows.push({
    beneficiary_user_id: ben.dealer.user_id,
    beneficiary_rep_id: ben.dealer.rep_id,
    beneficiary_role: "representative",
    distribution_type: "investment_return",
    units: ben.dealer.units,
    rate_or_percentage: perUnit,
    amount: dealerInvest,
    payout_schedule: "annual",
  });
  investmentPaidOut += dealerInvest;

  // --- District-head investment return (annual) ---
  // SPECIAL CASE: when the dealer IS the district head, the SAME person gets a
  // second investment_return row as district_head (scaled by their own units).
  if (ben.dealer.is_district_head) {
    const dhInvest = round2(perUnit * ben.dealer.units);
    rows.push({
      beneficiary_user_id: ben.dealer.user_id,
      beneficiary_rep_id: ben.dealer.rep_id,
      beneficiary_role: "district_head",
      distribution_type: "investment_return",
      units: ben.dealer.units,
      rate_or_percentage: perUnit,
      amount: dhInvest,
      payout_schedule: "annual",
    });
    investmentPaidOut += dhInvest;
  } else if (ben.districtHead) {
    const dhInvest = round2(perUnit * ben.districtHead.units);
    rows.push({
      beneficiary_user_id: ben.districtHead.user_id,
      beneficiary_rep_id: ben.districtHead.rep_id,
      beneficiary_role: "district_head",
      distribution_type: "investment_return",
      units: ben.districtHead.units,
      rate_or_percentage: perUnit,
      amount: dhInvest,
      payout_schedule: "annual",
    });
    investmentPaidOut += dhInvest;
  }
  // If neither branch applies (no district head yet), record nothing here.

  // --- Divisional-head investment return: fixed 1 unit for effort (annual) ---
  if (ben.divisionalHeadUserId) {
    const dvInvest = round2(perUnit * 1);
    rows.push({
      beneficiary_user_id: ben.divisionalHeadUserId,
      beneficiary_rep_id: null,
      beneficiary_role: "divisional_head",
      distribution_type: "investment_return",
      units: 1,
      rate_or_percentage: perUnit,
      amount: dvInvest,
      payout_schedule: "annual",
    });
    investmentPaidOut += dvInvest;
  }

  // --- HQ investment remainder (annual). Reconciles to the penny. ---
  const hqRemainder = round2(investmentShare - investmentPaidOut);
  rows.push({
    beneficiary_user_id: null,
    beneficiary_rep_id: null,
    beneficiary_role: "hq",
    distribution_type: "investment_return",
    units: 0,
    rate_or_percentage: perUnit,
    amount: hqRemainder,
    payout_schedule: "annual",
  });

  return {
    net_profit: netProfit,
    rep_share_amount: repShare,
    hq_share_amount: hqShare,
    investment_share_amount: investmentShare,
    investment_return_per_unit: perUnit,
    rows,
  };
}
