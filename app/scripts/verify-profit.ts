/**
 * Verification harness for the PURE profit/investment distribution engine
 * (lib/profit-engine.ts). Exercises the worked example and the special case and
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

function assertClose(
  label: string,
  actual: number,
  expected: number,
  tol = 1e-9
): void {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${label}: got ${actual}` +
      (ok ? "" : `  (expected ~${expected})`)
  );
}

function findRow(
  result: ReturnType<typeof computeDistribution>,
  role: string,
  type: string
) {
  return result.rows.filter(
    (r) => r.beneficiary_role === role && r.distribution_type === type
  );
}

// ---------------------------------------------------------------------------
// The active config from the seed: 20 / 40 / 40, per-unit 100000.
// ---------------------------------------------------------------------------
const CONFIG = {
  representative_percentage: 20,
  hq_percentage: 40,
  investment_percentage: 40,
  per_unit_amount: 100000,
};

// Worked-example financials.
const FINANCIALS: Omit<
  DistributionFinancials,
  keyof typeof CONFIG
> & typeof CONFIG = {
  net_profit: 3000000 - 450000 - 2250000, // 300000
  total_cost: 2250000,
  ...CONFIG,
};

// ===========================================================================
console.log("\n=== CASE 1: Worked example (non-sadar dealer, 1 unit) ===");
// dealer non-sadar 1 unit, district head 1 unit, divisional head present.
const ben1: DistributionBeneficiaries = {
  dealer: {
    rep_id: "rep-dealer",
    user_id: "user-dealer",
    units: 1,
    is_district_head: false,
  },
  districtHead: { rep_id: "rep-dh", user_id: "user-dh", units: 1 },
  divisionalHeadUserId: "user-div",
};

const r1 = computeDistribution(FINANCIALS, ben1);

console.log(
  `  net=${r1.net_profit} rep=${r1.rep_share_amount} hq=${r1.hq_share_amount} inv=${r1.investment_share_amount} perUnit=${r1.investment_return_per_unit}`
);

assertEq("net_profit", r1.net_profit, 300000);
assertEq("rep_share_amount", r1.rep_share_amount, 60000);
assertEq("hq_share_amount", r1.hq_share_amount, 120000);
assertEq("investment_share_amount", r1.investment_share_amount, 120000);
assertClose(
  "investment_return_per_unit",
  r1.investment_return_per_unit,
  5333.3333,
  1e-4
);

const dealerInv1 = findRow(r1, "representative", "investment_return");
const dhInv1 = findRow(r1, "district_head", "investment_return");
const divInv1 = findRow(r1, "divisional_head", "investment_return");
const hqInv1 = findRow(r1, "hq", "investment_return");
const dealerProfit1 = findRow(r1, "representative", "profit_share");
const hqProfit1 = findRow(r1, "hq", "profit_share");

assertEq("dealer investment_return", dealerInv1[0]!.amount, 5333.33);
assertEq("district_head investment_return", dhInv1[0]!.amount, 5333.33);
assertEq("divisional_head investment_return", divInv1[0]!.amount, 5333.33);
assertEq("dealer profit_share", dealerProfit1[0]!.amount, 60000);
assertEq("hq profit_share", hqProfit1[0]!.amount, 120000);

// HQ remainder = investment_share - sum(rounded three) = 120000 - 15999.99
const sumThree1 =
  dealerInv1[0]!.amount + dhInv1[0]!.amount + divInv1[0]!.amount;
const expectedRemainder1 =
  Math.round((120000 - sumThree1 + Number.EPSILON) * 100) / 100;
assertEq("HQ investment remainder", hqInv1[0]!.amount, expectedRemainder1);
console.log(`  (sum of three beneficiaries = ${sumThree1})`);

// The four investment amounts MUST sum to exactly 120000.00
const totalInvestment1 =
  Math.round(
    (dealerInv1[0]!.amount +
      dhInv1[0]!.amount +
      divInv1[0]!.amount +
      hqInv1[0]!.amount +
      Number.EPSILON) *
      100
  ) / 100;
assertEq("investment parts reconcile to share", totalInvestment1, 120000);

// ===========================================================================
console.log(
  "\n=== CASE 2: Special case (dealer IS district head, 1 unit) ==="
);
const ben2: DistributionBeneficiaries = {
  dealer: {
    rep_id: "rep-dealer",
    user_id: "user-dealer",
    units: 1,
    is_district_head: true,
  },
  districtHead: null, // ignored when dealer is district head
  divisionalHeadUserId: "user-div",
};

const r2 = computeDistribution(FINANCIALS, ben2);

const dealerInv2 = findRow(r2, "representative", "investment_return");
const dhInv2 = findRow(r2, "district_head", "investment_return");
const divInv2 = findRow(r2, "divisional_head", "investment_return");
const hqInv2 = findRow(r2, "hq", "investment_return");

// Same person gets TWO separate investment_return rows: rep + district_head.
assertEq("dealer has 1 rep investment row", dealerInv2.length, 1);
assertEq("dealer has 1 district_head investment row", dhInv2.length, 1);
assertEq(
  "both rows point to the same user (rep)",
  dealerInv2[0]!.beneficiary_user_id === dhInv2[0]!.beneficiary_user_id ? 1 : 0,
  1
);
assertEq("dealer(rep) investment_return", dealerInv2[0]!.amount, 5333.33);
assertEq("dealer(district_head) investment_return", dhInv2[0]!.amount, 5333.33);
assertEq("divisional_head investment_return", divInv2[0]!.amount, 5333.33);

const totalInvestment2 =
  Math.round(
    (dealerInv2[0]!.amount +
      dhInv2[0]!.amount +
      divInv2[0]!.amount +
      hqInv2[0]!.amount +
      Number.EPSILON) *
      100
  ) / 100;
assertEq("HQ remainder reconciles (special case)", totalInvestment2, 120000);
console.log(
  `  dealer(rep)=${dealerInv2[0]!.amount} dealer(dh)=${dhInv2[0]!.amount} div=${divInv2[0]!.amount} hqRemainder=${hqInv2[0]!.amount}`
);

// ===========================================================================
console.log("\n=== CASE 3: Premium dealer (5 units) ===");
const ben3: DistributionBeneficiaries = {
  dealer: {
    rep_id: "rep-dealer",
    user_id: "user-dealer",
    units: 5,
    is_district_head: false,
  },
  districtHead: { rep_id: "rep-dh", user_id: "user-dh", units: 1 },
  divisionalHeadUserId: "user-div",
};
const r3 = computeDistribution(FINANCIALS, ben3);
const dealerInv3 = findRow(r3, "representative", "investment_return");
// 5333.3333 * 5 = 26666.6665 -> 26666.67 (rounded 2dp)
assertEq("premium dealer (5 units) investment_return", dealerInv3[0]!.amount, 26666.67);
console.log(`  premium dealer 5 units = ${dealerInv3[0]!.amount}`);

// ===========================================================================
console.log("\n=== CASE 4: No district head yet ===");
const ben4: DistributionBeneficiaries = {
  dealer: {
    rep_id: "rep-dealer",
    user_id: "user-dealer",
    units: 1,
    is_district_head: false,
  },
  districtHead: null,
  divisionalHeadUserId: "user-div",
};
const r4 = computeDistribution(FINANCIALS, ben4);
const dhInv4 = findRow(r4, "district_head", "investment_return");
const hqInv4 = findRow(r4, "hq", "investment_return");
assertEq("no district_head row recorded", dhInv4.length, 0);
// HQ remainder should absorb the missing district head portion.
const dealerInv4 = findRow(r4, "representative", "investment_return");
const divInv4 = findRow(r4, "divisional_head", "investment_return");
const total4 =
  Math.round(
    (dealerInv4[0]!.amount +
      divInv4[0]!.amount +
      hqInv4[0]!.amount +
      Number.EPSILON) *
      100
  ) / 100;
assertEq("investment reconciles without district head", total4, 120000);

// ===========================================================================
console.log("\n=== CASE 5: total_cost = 0 (divide-by-zero guard) ===");
const r5 = computeDistribution(
  { ...FINANCIALS, total_cost: 0 },
  ben1
);
assertEq("per_unit is 0 when total_cost=0", r5.investment_return_per_unit, 0);
const hqInv5 = findRow(r5, "hq", "investment_return");
// All investment goes to HQ remainder.
assertEq("HQ absorbs full investment share", hqInv5[0]!.amount, 120000);

// ===========================================================================
console.log("\n---------------------------------------------");
if (failures === 0) {
  console.log("ALL CHECKS PASSED ✔");
  process.exit(0);
} else {
  console.log(`${failures} CHECK(S) FAILED`);
  process.exit(1);
}
