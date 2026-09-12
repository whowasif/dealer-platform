/**
 * Verification harness for the PURE profit / company-fund distribution engine
 * (lib/profit-engine.ts, v5.0). Exercises the worked example and edge cases and
 * asserts every number matches the specification exactly.
 *
 * Run with:  npm run verify:profit
 * (uses node --experimental-strip-types to run this .ts file directly)
 *
 * This script imports ONLY lib/profit-engine.ts, which is pure and has no
 * server-only / DB dependency, so it runs cleanly under plain Node.
 */
import {
  computeDistribution,
  type DistributionBeneficiaries,
  type DistributionFinancials,
  type ComputedResult,
} from "../lib/profit-engine.ts";

let failures = 0;

function assertEq(label: string, actual: number, expected: number): void {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${label}: got ${actual}` +
      (ok ? "" : `  (expected ${expected})`)
  );
}

function rowsBy(result: ComputedResult, role: string, type?: string) {
  return result.rows.filter(
    (r) =>
      r.beneficiary_role === role &&
      (type === undefined || r.distribution_type === type)
  );
}

function sum2(...vals: number[]): number {
  return Math.round((vals.reduce((a, b) => a + b, 0) + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Active config from the v5.0 seed: 20 / 40 / 40; investment split 15 / 5 / 20,
// with 3 / 2 inside the 5. All percentages are of NET PROFIT.
// ---------------------------------------------------------------------------
const CONFIG = {
  representative_percentage: 20,
  hq_percentage: 40,
  investment_percentage: 40,
  executive_percentage: 15,
  supervision_percentage: 5,
  future_works_percentage: 20,
  supervision_sub_percentage: 3,
  support_fund_sub_percentage: 2,
};

// Worked-example financials: net profit = 300000.
const FINANCIALS: DistributionFinancials = {
  net_profit: 3000000 - 450000 - 2250000, // 300000
  ...CONFIG,
};

// ===========================================================================
console.log("\n=== CASE 1: Worked example (non-sadar dealer) ===");
// Two executives (weights 3 and 1 -> 75% / 25% of the 45000 exec pool).
const ben1: DistributionBeneficiaries = {
  dealer: { rep_id: "rep-dealer", user_id: "user-dealer", is_district_head: false },
  districtHead: { rep_id: "rep-dh", user_id: "user-dh" },
  divisionalHeadUserId: "user-div",
  executives: [
    { user_id: "user-exec-a", role_weight: 3 },
    { user_id: "user-exec-b", role_weight: 1 },
  ],
};

const r1 = computeDistribution(FINANCIALS, ben1);
console.log(
  `  net=${r1.net_profit} rep=${r1.rep_share_amount} hq=${r1.hq_share_amount} inv=${r1.investment_share_amount}`
);
console.log(
  `  exec=${r1.executive_amount} supervision=${r1.supervision_amount} support=${r1.support_fund_amount} future=${r1.future_works_amount}`
);

assertEq("net_profit", r1.net_profit, 300000);
assertEq("rep_share_amount (20%)", r1.rep_share_amount, 60000);
assertEq("hq_share_amount (40%)", r1.hq_share_amount, 120000);
assertEq("investment_share_amount (40%)", r1.investment_share_amount, 120000);
assertEq("executive_amount (15%)", r1.executive_amount, 45000);
assertEq("supervision_amount (3%)", r1.supervision_amount, 9000);
assertEq("support_fund_amount (2%)", r1.support_fund_amount, 6000);
assertEq("future_works_amount (20%)", r1.future_works_amount, 60000);

// Profit shares.
assertEq("rep profit_share", rowsBy(r1, "representative", "profit_share")[0]!.amount, 60000);
assertEq("hq profit_share", rowsBy(r1, "hq", "profit_share")[0]!.amount, 120000);

// Executives: 45000 split 3:1 => 33750 / 11250.
const execRows1 = rowsBy(r1, "hq_executive", "company_fund");
assertEq("two executive rows", execRows1.length, 2);
assertEq("exec A (weight 3)", execRows1[0]!.amount, 33750);
assertEq("exec B (weight 1, absorbs residual)", execRows1[1]!.amount, 11250);
assertEq("executives reconcile to pool", sum2(execRows1[0]!.amount, execRows1[1]!.amount), 45000);

// Supervision: 9000 split 60/40 => district 5400, divisional 3600.
assertEq("district_head supervision", rowsBy(r1, "district_head", "company_fund")[0]!.amount, 5400);
assertEq("divisional_head supervision", rowsBy(r1, "divisional_head", "company_fund")[0]!.amount, 3600);

// Funds.
assertEq("support fund row", rowsBy(r1, "support_fund", "company_fund")[0]!.amount, 6000);
assertEq("future works row", rowsBy(r1, "future_works", "company_fund")[0]!.amount, 60000);

// The whole investment slice reconciles to 120000.
const invParts1 = sum2(
  ...execRows1.map((r) => r.amount),
  rowsBy(r1, "district_head", "company_fund")[0]!.amount,
  rowsBy(r1, "divisional_head", "company_fund")[0]!.amount,
  rowsBy(r1, "support_fund", "company_fund")[0]!.amount,
  rowsBy(r1, "future_works", "company_fund")[0]!.amount
);
assertEq("company-fund parts reconcile to investment share", invParts1, 120000);

// Whole net profit reconciles across ALL rows.
const grandTotal1 = sum2(...r1.rows.map((r) => r.amount));
assertEq("all rows reconcile to net profit", grandTotal1, 300000);

// ===========================================================================
console.log("\n=== CASE 2: Dealer IS district head (sadar) ===");
const ben2: DistributionBeneficiaries = {
  dealer: { rep_id: "rep-dealer", user_id: "user-dealer", is_district_head: true },
  districtHead: null,
  divisionalHeadUserId: "user-div",
  executives: [{ user_id: "user-exec-a", role_weight: 1 }],
};
const r2 = computeDistribution(FINANCIALS, ben2);
const dhRow2 = rowsBy(r2, "district_head", "company_fund");
assertEq("district_head supervision row exists", dhRow2.length, 1);
assertEq(
  "district_head row is the dealer's user",
  dhRow2[0]!.beneficiary_user_id === "user-dealer" ? 1 : 0,
  1
);
assertEq("rep still gets 20% profit share", rowsBy(r2, "representative", "profit_share")[0]!.amount, 60000);
assertEq("single exec takes full 45000", rowsBy(r2, "hq_executive", "company_fund")[0]!.amount, 45000);
const grandTotal2 = sum2(...r2.rows.map((r) => r.amount));
assertEq("all rows reconcile (sadar case)", grandTotal2, 300000);

// ===========================================================================
console.log("\n=== CASE 3: No executives configured ===");
const ben3: DistributionBeneficiaries = {
  dealer: { rep_id: "rep-dealer", user_id: "user-dealer", is_district_head: false },
  districtHead: { rep_id: "rep-dh", user_id: "user-dh" },
  divisionalHeadUserId: "user-div",
  executives: [],
};
const r3 = computeDistribution(FINANCIALS, ben3);
assertEq("no hq_executive rows", rowsBy(r3, "hq_executive").length, 0);
// The 45000 exec pool falls to an HQ company_fund row.
const hqFund3 = rowsBy(r3, "hq", "company_fund");
assertEq("hq company_fund holds exec pool", hqFund3[0]!.amount, 45000);
const grandTotal3 = sum2(...r3.rows.map((r) => r.amount));
assertEq("all rows reconcile (no execs)", grandTotal3, 300000);

// ===========================================================================
console.log("\n=== CASE 4: No district head, no divisional head ===");
const ben4: DistributionBeneficiaries = {
  dealer: { rep_id: "rep-dealer", user_id: "user-dealer", is_district_head: false },
  districtHead: null,
  divisionalHeadUserId: null,
  executives: [{ user_id: "user-exec-a", role_weight: 1 }],
};
const r4 = computeDistribution(FINANCIALS, ben4);
assertEq("no district_head row", rowsBy(r4, "district_head").length, 0);
assertEq("no divisional_head row", rowsBy(r4, "divisional_head").length, 0);
// Supervision (9000) falls to an HQ company_fund row.
assertEq("hq absorbs supervision pool", rowsBy(r4, "hq", "company_fund")[0]!.amount, 9000);
const grandTotal4 = sum2(...r4.rows.map((r) => r.amount));
assertEq("all rows reconcile (no supervisors)", grandTotal4, 300000);

// ===========================================================================
console.log("\n=== CASE 5: Rounding — 3 execs, uneven weights ===");
// net = 233333.33 forces sub-cent residuals in every bucket. The engine's
// contract is: (a) the investment slice reconciles exactly to its parts, and
// (b) rep + hq + investment == the sum of the three independently-rounded
// top-level shares. (The top-level split rounds each share to 2dp, so a
// sub-cent net-profit remainder is intentionally dropped, not distributed.)
const oddFin: DistributionFinancials = { ...CONFIG, net_profit: 233333.33 };
const ben5: DistributionBeneficiaries = {
  dealer: { rep_id: "rep-dealer", user_id: "user-dealer", is_district_head: false },
  districtHead: { rep_id: "rep-dh", user_id: "user-dh" },
  divisionalHeadUserId: "user-div",
  executives: [
    { user_id: "e1", role_weight: 2 },
    { user_id: "e2", role_weight: 1 },
    { user_id: "e3", role_weight: 1 },
  ],
};
const r5 = computeDistribution(oddFin, ben5);

// (a) The exec rows reconcile exactly to the exec pool (last exec absorbs residual).
const execRows5 = rowsBy(r5, "hq_executive", "company_fund");
const execTotal5 = sum2(...execRows5.map((r) => r.amount));
assertEq("exec rows reconcile to exec pool (rounding)", execTotal5, r5.executive_amount);

// (b) The whole company-fund (investment) slice reconciles exactly.
const invParts5 = sum2(
  ...execRows5.map((r) => r.amount),
  rowsBy(r5, "district_head", "company_fund")[0]!.amount,
  rowsBy(r5, "divisional_head", "company_fund")[0]!.amount,
  rowsBy(r5, "support_fund", "company_fund")[0]!.amount,
  rowsBy(r5, "future_works", "company_fund")[0]!.amount
);
assertEq("company-fund parts reconcile to investment share (rounding)", invParts5, r5.investment_share_amount);

// (c) rep + hq + investment == sum of the rounded top-level shares.
assertEq(
  "top-level shares reconcile",
  sum2(r5.rep_share_amount, r5.hq_share_amount, r5.investment_share_amount),
  sum2(...r5.rows.map((r) => r.amount))
);

// ===========================================================================
console.log("\n---------------------------------------------");
if (failures === 0) {
  console.log("ALL CHECKS PASSED ✔");
  process.exit(0);
} else {
  console.log(`${failures} CHECK(S) FAILED`);
  process.exit(1);
}
