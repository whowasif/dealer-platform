// -----------------------------------------------------------------------------
// PURE profit / company-fund distribution engine — NO DB, NO clock, NO server-only.
//
// v5.0 model. Net profit is split three ways by profit_distribution_config:
//   * Representative   20%  -> profit_share, monthly
//   * HQ (salary+admin)40%  -> profit_share, monthly (HQ pool, no user)
//   * Investment       40%  -> a COMPANY FUND, sub-divided by investment_split_config:
//        - Executives Profit    15% of net profit  -> company_fund, monthly,
//                                                      one row per active HQ
//                                                      executive, by role_weight.
//        - Supervision + Support 5% of net profit  -> ~3% supervision incentive
//                                                      (district + divisional
//                                                      heads) + ~2% into the
//                                                      Representative Support Fund.
//        - Future Works Fund    20% of net profit  -> company_fund, annual.
//
// There is NO per-unit "investment return" and NO investment "units" anymore.
//
// Rounding contract (so every total reconciles to the penny):
//   - rep / hq / investment slice amounts        -> round to 2dp
//   - each sub-bucket (exec pool, supervision, support, future works) -> 2dp
//   - per-executive amounts are weight-proportional; the LAST executive absorbs
//     the exec-pool rounding residual.
//   - the FUTURE WORKS row absorbs the investment-slice rounding residual, so
//     (exec rows + supervision rows + support + future works) == investment slice.
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

/** Round a rate/percentage to 4 decimal places (matches DECIMAL(14,4)). */
export function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/**
 * Financial inputs to the distribution engine (all pre-parsed to numbers).
 * All *_percentage values are percentages of NET PROFIT.
 */
export interface DistributionFinancials {
  net_profit: number;
  // top-level 20/40/40 (profit_distribution_config)
  representative_percentage: number; // 20
  hq_percentage: number; // 40
  investment_percentage: number; // 40
  // investment sub-split (investment_split_config), all % of NET PROFIT
  executive_percentage: number; // 15
  supervision_percentage: number; // 5 (supervision incentive + support fund)
  future_works_percentage: number; // 20
  supervision_sub_percentage: number; // ~3 (supervision incentive)
  support_fund_sub_percentage: number; // ~2 (support fund)
}

/** One HQ executive who shares the executives-profit bucket by weight. */
export interface ExecutiveShare {
  user_id: string;
  role_weight: number;
}

/** The parties connected to a project, resolved from the DB. */
export interface DistributionBeneficiaries {
  /** The project's representative (gets the 20% profit share). */
  dealer: {
    rep_id: string;
    user_id: string;
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
  } | null;
  /** The HQ-appointed divisional head user (divisions.head_user_id), or null. */
  divisionalHeadUserId: string | null;
  /** Active HQ executives sharing the 15% executives-profit bucket by weight. */
  executives: ExecutiveShare[];
}

/** A computed distribution row (before it is persisted). */
export interface ComputedDistribution {
  beneficiary_user_id: string | null;
  beneficiary_rep_id: string | null;
  beneficiary_role: BeneficiaryRole;
  distribution_type: DistributionType;
  /** Kept at 0 in v5.0 (units removed); column still exists in the schema. */
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
  // sub-bucket snapshot amounts (of the investment slice)
  executive_amount: number;
  supervision_amount: number; // supervision incentive only (~3%)
  support_fund_amount: number; // ~2%
  future_works_amount: number; // 20%
  rows: ComputedDistribution[];
}

/**
 * PURE distribution engine. Given a project's financials, the active config
 * values, and the resolved beneficiaries, produce the exact list of
 * distribution rows plus the snapshot amounts. No DB access, no clock.
 */
export function computeDistribution(
  fin: DistributionFinancials,
  ben: DistributionBeneficiaries
): ComputedResult {
  const netProfit = round2(fin.net_profit);

  const repShare = round2((netProfit * fin.representative_percentage) / 100);
  const hqShare = round2((netProfit * fin.hq_percentage) / 100);
  const investmentShare = round2((netProfit * fin.investment_percentage) / 100);

  // Investment sub-buckets (all as % of NET PROFIT).
  const execPool = round2((netProfit * fin.executive_percentage) / 100);
  const supervisionPool = round2(
    (netProfit * fin.supervision_sub_percentage) / 100
  );
  const supportFund = round2(
    (netProfit * fin.support_fund_sub_percentage) / 100
  );
  // Future works absorbs the residual so the investment slice reconciles.
  const futureWorks = round2(
    investmentShare - execPool - supervisionPool - supportFund
  );

  const rows: ComputedDistribution[] = [];

  // --- 1. Representative profit share (monthly) ---
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

  // --- 2. HQ salary & admin profit share (monthly, HQ pool) ---
  rows.push({
    beneficiary_user_id: null,
    beneficiary_rep_id: null,
    beneficiary_role: "hq",
    distribution_type: "profit_share",
    units: 0,
    rate_or_percentage: round4(fin.hq_percentage),
    amount: hqShare,
    payout_schedule: "monthly",
  });

  // --- 3. Executives profit (company_fund, monthly), split by role_weight ---
  const activeExecs = ben.executives.filter((e) => e.role_weight > 0);
  const totalWeight = activeExecs.reduce((s, e) => s + e.role_weight, 0);
  if (activeExecs.length > 0 && totalWeight > 0) {
    let execPaid = 0;
    activeExecs.forEach((exec, i) => {
      const isLast = i === activeExecs.length - 1;
      // Last executive absorbs the exec-pool rounding residual.
      const amount = isLast
        ? round2(execPool - execPaid)
        : round2((execPool * exec.role_weight) / totalWeight);
      execPaid = round2(execPaid + amount);
      rows.push({
        beneficiary_user_id: exec.user_id,
        beneficiary_rep_id: null,
        beneficiary_role: "hq_executive",
        distribution_type: "company_fund",
        units: 0,
        rate_or_percentage: round4(exec.role_weight),
        amount,
        payout_schedule: "monthly",
      });
    });
  } else {
    // No executives configured yet — hold the exec pool in the HQ pool.
    rows.push({
      beneficiary_user_id: null,
      beneficiary_rep_id: null,
      beneficiary_role: "hq",
      distribution_type: "company_fund",
      units: 0,
      rate_or_percentage: round4(fin.executive_percentage),
      amount: execPool,
      payout_schedule: "monthly",
    });
  }

  // --- 4. Supervision incentive (company_fund, monthly) ---
  // The ~3% supervision pool is shared between the district head and the
  // divisional head. When one is missing, the present party takes the whole
  // pool; when both are missing, it falls to the HQ pool.
  if (supervisionPool > 0) {
    const districtHeadUserId = ben.dealer.is_district_head
      ? ben.dealer.user_id
      : ben.districtHead?.user_id ?? null;
    const districtHeadRepId = ben.dealer.is_district_head
      ? ben.dealer.rep_id
      : ben.districtHead?.rep_id ?? null;
    const hasDistrict = districtHeadUserId !== null;
    const hasDivisional = ben.divisionalHeadUserId !== null;

    if (hasDistrict && hasDivisional) {
      // Split 60/40 between district and divisional head (illustrative), with
      // the divisional head absorbing the rounding residual.
      const districtAmt = round2(supervisionPool * 0.6);
      const divisionalAmt = round2(supervisionPool - districtAmt);
      rows.push({
        beneficiary_user_id: districtHeadUserId,
        beneficiary_rep_id: districtHeadRepId,
        beneficiary_role: "district_head",
        distribution_type: "company_fund",
        units: 0,
        rate_or_percentage: null,
        amount: districtAmt,
        payout_schedule: "monthly",
      });
      rows.push({
        beneficiary_user_id: ben.divisionalHeadUserId,
        beneficiary_rep_id: null,
        beneficiary_role: "divisional_head",
        distribution_type: "company_fund",
        units: 0,
        rate_or_percentage: null,
        amount: divisionalAmt,
        payout_schedule: "monthly",
      });
    } else if (hasDistrict) {
      rows.push({
        beneficiary_user_id: districtHeadUserId,
        beneficiary_rep_id: districtHeadRepId,
        beneficiary_role: "district_head",
        distribution_type: "company_fund",
        units: 0,
        rate_or_percentage: null,
        amount: supervisionPool,
        payout_schedule: "monthly",
      });
    } else if (hasDivisional) {
      rows.push({
        beneficiary_user_id: ben.divisionalHeadUserId,
        beneficiary_rep_id: null,
        beneficiary_role: "divisional_head",
        distribution_type: "company_fund",
        units: 0,
        rate_or_percentage: null,
        amount: supervisionPool,
        payout_schedule: "monthly",
      });
    } else {
      // No supervisors resolved — the supervision pool falls to HQ.
      rows.push({
        beneficiary_user_id: null,
        beneficiary_rep_id: null,
        beneficiary_role: "hq",
        distribution_type: "company_fund",
        units: 0,
        rate_or_percentage: null,
        amount: supervisionPool,
        payout_schedule: "monthly",
      });
    }
  }

  // --- 5. Representative Support Fund accrual (company_fund, annual) ---
  rows.push({
    beneficiary_user_id: null,
    beneficiary_rep_id: null,
    beneficiary_role: "support_fund",
    distribution_type: "company_fund",
    units: 0,
    rate_or_percentage: round4(fin.support_fund_sub_percentage),
    amount: supportFund,
    payout_schedule: "annual",
  });

  // --- 6. Future Works Fund accrual (company_fund, annual) ---
  rows.push({
    beneficiary_user_id: null,
    beneficiary_rep_id: null,
    beneficiary_role: "future_works",
    distribution_type: "company_fund",
    units: 0,
    rate_or_percentage: round4(fin.future_works_percentage),
    amount: futureWorks,
    payout_schedule: "annual",
  });

  return {
    net_profit: netProfit,
    rep_share_amount: repShare,
    hq_share_amount: hqShare,
    investment_share_amount: investmentShare,
    executive_amount: execPool,
    supervision_amount: supervisionPool,
    support_fund_amount: supportFund,
    future_works_amount: futureWorks,
    rows,
  };
}
