import "server-only";
import { query, queryOne } from "./db";
import { isHQ, hasRole } from "./rbac";
import { repScopeForUser } from "./representatives";
import type { SessionUser } from "./types";

// -----------------------------------------------------------------------------
// Reporting & analytics — SCOPE-AWARE aggregation.
//
// Every query is filtered by the viewer's geographic scope, resolved via
// repScopeForUser:
//   HQ                     -> national (no geo filter)
//   divisional_head        -> their division
//   district_head          -> their district
//   upazila_representative -> only their own representative record
//
// The projects/orders/fees tables all reach geography through the representative
// -> upazila -> district -> division chain. Each builder pushes a scope
// condition against those joined columns, plus the rep's user_id for self-only.
//
// Money DECIMALs come back from node-postgres as strings; every aggregate is
// COALESCE'd to 0 and parsed with Number() before returning.
// -----------------------------------------------------------------------------

/**
 * Build a scope WHERE fragment for a query that has JOINed the representative's
 * geography under the given aliases. Returns the SQL condition (or empty) and
 * the parameter to bind (or none). `startIndex` is the next $ placeholder index.
 *
 *   repUserCol   e.g. 'rep.user_id'
 *   divisionCol  e.g. 'dv.id'
 *   districtCol  e.g. 'd.id'
 */
function scopeClause(
  user: SessionUser,
  cols: { repUserCol: string; divisionCol: string; districtCol: string },
  startIndex: number
): { sql: string; params: unknown[] } {
  const scope = repScopeForUser(user);
  if (scope.all) return { sql: "", params: [] };
  if (scope.selfOnly) {
    return { sql: `${cols.repUserCol} = $${startIndex}`, params: [user.id] };
  }
  if (scope.divisionId) {
    return {
      sql: `${cols.divisionCol} = $${startIndex}`,
      params: [scope.divisionId],
    };
  }
  if (scope.districtId) {
    return {
      sql: `${cols.districtCol} = $${startIndex}`,
      params: [scope.districtId],
    };
  }
  // Fallback: no visibility.
  return { sql: "1 = 0", params: [] };
}

// ------------------------------ Summary metrics ------------------------------

export interface SummaryMetrics {
  rep_total: number;
  rep_active: number;
  rep_suspended: number;
  active_projects: number;
  distributed_profit: number;
  order_count: number;
  order_revenue: number;
  outstanding_fees: number;
  customer_count: number;
}

/**
 * Top-level KPI totals within the viewer's scope. Ready for dashboard cards.
 *   distributed_profit = SUM(net_profit) of projects with status
 *                        'profit_distributed'
 *   order_revenue      = SUM(net_amount) of customer_sale orders that were not
 *                        cancelled/returned
 *   outstanding_fees   = SUM(amount) of fee invoices that are pending/overdue
 */
export async function getSummaryMetrics(
  user: SessionUser
): Promise<SummaryMetrics> {
  // Representatives (with status split).
  const repScope = scopeClause(
    user,
    { repUserCol: "rep.user_id", divisionCol: "dv.id", districtCol: "d.id" },
    1
  );
  const repWhere = repScope.sql ? `WHERE ${repScope.sql}` : "";
  const reps = await queryOne<{
    rep_total: string;
    rep_active: string;
    rep_suspended: string;
  }>(
    `SELECT COUNT(*)::text AS rep_total,
            COUNT(*) FILTER (WHERE rep.status = 'active')::text AS rep_active,
            COUNT(*) FILTER (WHERE rep.status = 'suspended')::text AS rep_suspended
       FROM representatives rep
       JOIN upazilas up  ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      ${repWhere}`,
    repScope.params
  );

  // Projects: active count + distributed net profit.
  const projScope = scopeClause(
    user,
    { repUserCol: "rep.user_id", divisionCol: "dv.id", districtCol: "d.id" },
    1
  );
  const projWhere = projScope.sql ? `AND ${projScope.sql}` : "";
  const proj = await queryOne<{
    active_projects: string;
    distributed_profit: string;
  }>(
    `SELECT COUNT(*) FILTER (WHERE p.status IN ('in_progress','completed'))::text AS active_projects,
            COALESCE(SUM(p.net_profit) FILTER (WHERE p.status = 'profit_distributed'), 0)::text AS distributed_profit
       FROM projects p
       JOIN representatives rep ON rep.id = p.representative_id
       JOIN upazilas up  ON up.id = p.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      WHERE 1 = 1 ${projWhere}`,
    projScope.params
  );

  // Orders (customer sales only): count + revenue.
  const orderScope = scopeClause(
    user,
    { repUserCol: "rep.user_id", divisionCol: "dv.id", districtCol: "d.id" },
    1
  );
  const orderWhere = orderScope.sql ? `AND ${orderScope.sql}` : "";
  const orders = await queryOne<{ order_count: string; order_revenue: string }>(
    `SELECT COUNT(*)::text AS order_count,
            COALESCE(SUM(o.net_amount) FILTER (WHERE o.status NOT IN ('cancelled','returned')), 0)::text AS order_revenue
       FROM orders o
       JOIN representatives rep ON rep.id = o.representative_id
       JOIN upazilas up  ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      WHERE o.order_type = 'customer_sale' ${orderWhere}`,
    orderScope.params
  );

  // Outstanding fees (pending + overdue).
  const feeScope = scopeClause(
    user,
    { repUserCol: "rep.user_id", divisionCol: "dv.id", districtCol: "d.id" },
    1
  );
  const feeWhere = feeScope.sql ? `AND ${feeScope.sql}` : "";
  const fees = await queryOne<{ outstanding_fees: string }>(
    `SELECT COALESCE(SUM(fi.amount), 0)::text AS outstanding_fees
       FROM fee_invoices fi
       JOIN representatives rep ON rep.id = fi.representative_id
       JOIN upazilas up  ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      WHERE (fi.status = 'overdue'
             OR (fi.status = 'pending' AND fi.due_date < CURRENT_DATE)
             OR fi.status = 'pending') ${feeWhere}`,
    feeScope.params
  );

  // Customers.
  const custScope = scopeClause(
    user,
    { repUserCol: "rep.user_id", divisionCol: "dv.id", districtCol: "d.id" },
    1
  );
  const custWhere = custScope.sql ? `WHERE ${custScope.sql}` : "";
  const customers = await queryOne<{ customer_count: string }>(
    `SELECT COUNT(*)::text AS customer_count
       FROM customers c
       JOIN representatives rep ON rep.id = c.representative_id
       JOIN upazilas up  ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      ${custWhere}`,
    custScope.params
  );

  return {
    rep_total: Number(reps?.rep_total ?? 0),
    rep_active: Number(reps?.rep_active ?? 0),
    rep_suspended: Number(reps?.rep_suspended ?? 0),
    active_projects: Number(proj?.active_projects ?? 0),
    distributed_profit: Number(proj?.distributed_profit ?? 0),
    order_count: Number(orders?.order_count ?? 0),
    order_revenue: Number(orders?.order_revenue ?? 0),
    outstanding_fees: Number(fees?.outstanding_fees ?? 0),
    customer_count: Number(customers?.customer_count ?? 0),
  };
}

// ------------------------------- Revenue trend -------------------------------

export interface TrendPoint {
  /** 'YYYY-MM'. */
  month: string;
  label: string;
  project_profit: number;
  order_revenue: number;
}

/**
 * Monthly series for the last `months` months (inclusive of the current month),
 * within scope. project_profit uses distributed projects grouped by profit_year
 * / payout month (via completed_date); order_revenue uses customer-sale orders
 * by order_date. Months with no activity are zero-filled so charts are smooth.
 */
export async function getRevenueTrend(
  user: SessionUser,
  months = 12
): Promise<TrendPoint[]> {
  const span = Math.max(1, Math.min(36, Math.trunc(months)));

  // Build the zero-filled month skeleton first (oldest -> newest).
  const now = new Date();
  const skeleton: TrendPoint[] = [];
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    skeleton.push({
      month: `${y}-${m}`,
      label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      project_profit: 0,
      order_revenue: 0,
    });
  }
  const byMonth = new Map(skeleton.map((p) => [p.month, p]));
  const cutoff = `${skeleton[0]!.month}-01`;

  // Distributed project profit by month (based on completed_date/created_at).
  const projScope = scopeClause(
    user,
    { repUserCol: "rep.user_id", divisionCol: "dv.id", districtCol: "d.id" },
    2
  );
  const projWhere = projScope.sql ? `AND ${projScope.sql}` : "";
  const projRows = await query<{ month: string; total: string }>(
    `SELECT to_char(date_trunc('month', COALESCE(p.completed_date, p.created_at)), 'YYYY-MM') AS month,
            COALESCE(SUM(p.net_profit), 0)::text AS total
       FROM projects p
       JOIN representatives rep ON rep.id = p.representative_id
       JOIN upazilas up  ON up.id = p.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      WHERE p.status = 'profit_distributed'
        AND COALESCE(p.completed_date, p.created_at) >= $1::date ${projWhere}
      GROUP BY 1`,
    [cutoff, ...projScope.params]
  );
  for (const r of projRows) {
    const point = byMonth.get(r.month);
    if (point) point.project_profit = Number(r.total);
  }

  // Customer-sale order revenue by month (order_date).
  const orderScope = scopeClause(
    user,
    { repUserCol: "rep.user_id", divisionCol: "dv.id", districtCol: "d.id" },
    2
  );
  const orderWhere = orderScope.sql ? `AND ${orderScope.sql}` : "";
  const orderRows = await query<{ month: string; total: string }>(
    `SELECT to_char(date_trunc('month', o.order_date), 'YYYY-MM') AS month,
            COALESCE(SUM(o.net_amount), 0)::text AS total
       FROM orders o
       JOIN representatives rep ON rep.id = o.representative_id
       JOIN upazilas up  ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      WHERE o.order_type = 'customer_sale'
        AND o.status NOT IN ('cancelled','returned')
        AND o.order_date >= $1::date ${orderWhere}
      GROUP BY 1`,
    [cutoff, ...orderScope.params]
  );
  for (const r of orderRows) {
    const point = byMonth.get(r.month);
    if (point) point.order_revenue = Number(r.total);
  }

  return skeleton;
}

// -------------------------------- Geo rollup ---------------------------------

export type RollupLevel = "division" | "district" | "upazila" | "self";

export interface RollupRow {
  id: string;
  name: string;
  rep_count: number;
  project_profit: number;
  order_revenue: number;
  outstanding_fees: number;
}

export interface GeoRollup {
  level: RollupLevel;
  /** Human label describing what each row represents (e.g. "Division"). */
  unit: string;
  rows: RollupRow[];
}

/**
 * Roll-up table that drills by the viewer's level:
 *   HQ                     -> per-division
 *   divisional_head        -> per-district within their division
 *   district_head          -> per-upazila within their district
 *   upazila_representative -> single self row
 *
 * Each row aggregates rep count, distributed project profit, customer-sale
 * revenue and outstanding fees. The three money aggregates are computed with
 * correlated subqueries so a rep counted once is never fanned-out by joins.
 */
export async function getGeoRollup(user: SessionUser): Promise<GeoRollup> {
  const scope = repScopeForUser(user);

  // Correlated subquery fragments reused across levels. `%REP%` is a WHERE
  // fragment restricting the representatives sub-scan to the current geo unit.
  const profitSub = (repWhere: string) => `
    (SELECT COALESCE(SUM(p.net_profit), 0)
       FROM projects p
       JOIN representatives rp ON rp.id = p.representative_id
       JOIN upazilas u2 ON u2.id = rp.upazila_id
      WHERE p.status = 'profit_distributed' AND ${repWhere})`;
  const revenueSub = (repWhere: string) => `
    (SELECT COALESCE(SUM(o.net_amount), 0)
       FROM orders o
       JOIN representatives rp ON rp.id = o.representative_id
       JOIN upazilas u2 ON u2.id = rp.upazila_id
      WHERE o.order_type = 'customer_sale'
        AND o.status NOT IN ('cancelled','returned') AND ${repWhere})`;
  const feeSub = (repWhere: string) => `
    (SELECT COALESCE(SUM(fi.amount), 0)
       FROM fee_invoices fi
       JOIN representatives rp ON rp.id = fi.representative_id
       JOIN upazilas u2 ON u2.id = rp.upazila_id
      WHERE (fi.status = 'pending' OR fi.status = 'overdue') AND ${repWhere})`;
  const repCountSub = (repWhere: string) => `
    (SELECT COUNT(*) FROM representatives rp
       JOIN upazilas u2 ON u2.id = rp.upazila_id
      WHERE ${repWhere})`;

  if (scope.all) {
    // Per-division rollup (u2.district_id -> districts -> division = dv.id).
    const geo = "u2.district_id IN (SELECT id FROM districts WHERE division_id = dv.id)";
    const rows = await query<{
      id: string;
      name: string;
      rep_count: string;
      project_profit: string;
      order_revenue: string;
      outstanding_fees: string;
    }>(
      `SELECT dv.id, dv.name,
              ${repCountSub(geo)}::text  AS rep_count,
              ${profitSub(geo)}::text    AS project_profit,
              ${revenueSub(geo)}::text   AS order_revenue,
              ${feeSub(geo)}::text       AS outstanding_fees
         FROM divisions dv
        ORDER BY dv.name`
    );
    return { level: "division", unit: "Division", rows: rows.map(mapRollup) };
  }

  if (scope.divisionId) {
    // Per-district rollup within the division.
    const geo = "u2.district_id = d.id";
    const rows = await query<{
      id: string;
      name: string;
      rep_count: string;
      project_profit: string;
      order_revenue: string;
      outstanding_fees: string;
    }>(
      `SELECT d.id, d.name,
              ${repCountSub(geo)}::text  AS rep_count,
              ${profitSub(geo)}::text    AS project_profit,
              ${revenueSub(geo)}::text   AS order_revenue,
              ${feeSub(geo)}::text       AS outstanding_fees
         FROM districts d
        WHERE d.division_id = $1
        ORDER BY d.name`,
      [scope.divisionId]
    );
    return { level: "district", unit: "District", rows: rows.map(mapRollup) };
  }

  if (scope.districtId) {
    // Per-upazila rollup within the district.
    const geo = "u2.id = up.id";
    const rows = await query<{
      id: string;
      name: string;
      rep_count: string;
      project_profit: string;
      order_revenue: string;
      outstanding_fees: string;
    }>(
      `SELECT up.id, up.name,
              ${repCountSub(geo)}::text  AS rep_count,
              ${profitSub(geo)}::text    AS project_profit,
              ${revenueSub(geo)}::text   AS order_revenue,
              ${feeSub(geo)}::text       AS outstanding_fees
         FROM upazilas up
        WHERE up.district_id = $1
        ORDER BY up.name`,
      [scope.districtId]
    );
    return { level: "upazila", unit: "Upazila", rows: rows.map(mapRollup) };
  }

  // Self only: a single-row summary for the rep's own record.
  const geo = "rp.user_id = $1";
  const rows = await query<{
    id: string;
    name: string;
    rep_count: string;
    project_profit: string;
    order_revenue: string;
    outstanding_fees: string;
  }>(
    `SELECT rep.id,
            up.name || ' (you)' AS name,
            ${repCountSub(geo)}::text  AS rep_count,
            ${profitSub(geo)}::text    AS project_profit,
            ${revenueSub(geo)}::text   AS order_revenue,
            ${feeSub(geo)}::text       AS outstanding_fees
       FROM representatives rep
       JOIN upazilas up ON up.id = rep.upazila_id
      WHERE rep.user_id = $1`,
    [user.id]
  );
  return { level: "self", unit: "Upazila", rows: rows.map(mapRollup) };
}

function mapRollup(r: {
  id: string;
  name: string;
  rep_count: string;
  project_profit: string;
  order_revenue: string;
  outstanding_fees: string;
}): RollupRow {
  return {
    id: r.id,
    name: r.name,
    rep_count: Number(r.rep_count ?? 0),
    project_profit: Number(r.project_profit ?? 0),
    order_revenue: Number(r.order_revenue ?? 0),
    outstanding_fees: Number(r.outstanding_fees ?? 0),
  };
}

// ---------------------------- Top representatives ----------------------------

export interface TopRep {
  representative_id: string;
  full_name: string;
  upazila_name: string;
  district_name: string;
  project_profit: number;
  order_revenue: number;
}

/**
 * Representatives ranked by distributed project net_profit (tie-broken by
 * customer-sale revenue), within scope. Both aggregates use correlated
 * subqueries to avoid join fan-out.
 */
export async function getTopRepresentatives(
  user: SessionUser,
  limit = 10
): Promise<TopRep[]> {
  const cap = Math.max(1, Math.min(50, Math.trunc(limit)));
  const scope = scopeClause(
    user,
    { repUserCol: "rep.user_id", divisionCol: "dv.id", districtCol: "d.id" },
    1
  );
  const where = scope.sql ? `WHERE ${scope.sql}` : "";
  const rows = await query<{
    representative_id: string;
    full_name: string;
    upazila_name: string;
    district_name: string;
    project_profit: string;
    order_revenue: string;
  }>(
    `SELECT rep.id AS representative_id,
            u.full_name,
            up.name AS upazila_name,
            d.name  AS district_name,
            (SELECT COALESCE(SUM(p.net_profit), 0)
               FROM projects p
              WHERE p.representative_id = rep.id
                AND p.status = 'profit_distributed')::text AS project_profit,
            (SELECT COALESCE(SUM(o.net_amount), 0)
               FROM orders o
              WHERE o.representative_id = rep.id
                AND o.order_type = 'customer_sale'
                AND o.status NOT IN ('cancelled','returned'))::text AS order_revenue
       FROM representatives rep
       JOIN users u      ON u.id = rep.user_id
       JOIN upazilas up  ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      ${where}
      ORDER BY project_profit DESC, order_revenue DESC
      LIMIT ${cap}`,
    scope.params
  );
  return rows.map((r) => ({
    representative_id: r.representative_id,
    full_name: r.full_name,
    upazila_name: r.upazila_name,
    district_name: r.district_name,
    project_profit: Number(r.project_profit ?? 0),
    order_revenue: Number(r.order_revenue ?? 0),
  }));
}

// ------------------------------ Status breakdowns ----------------------------

export interface StatusCount {
  status: string;
  count: number;
}

/** Project counts by status, within scope. */
export async function getProjectStatusBreakdown(
  user: SessionUser
): Promise<StatusCount[]> {
  const scope = scopeClause(
    user,
    { repUserCol: "rep.user_id", divisionCol: "dv.id", districtCol: "d.id" },
    1
  );
  const where = scope.sql ? `WHERE ${scope.sql}` : "";
  const rows = await query<{ status: string; count: string }>(
    `SELECT p.status::text AS status, COUNT(*)::text AS count
       FROM projects p
       JOIN representatives rep ON rep.id = p.representative_id
       JOIN upazilas up  ON up.id = p.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      ${where}
      GROUP BY p.status
      ORDER BY count DESC`,
    scope.params
  );
  return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
}

/** Order counts by status, within scope (all order types). */
export async function getOrderStatusBreakdown(
  user: SessionUser
): Promise<StatusCount[]> {
  const scope = scopeClause(
    user,
    { repUserCol: "rep.user_id", divisionCol: "dv.id", districtCol: "d.id" },
    1
  );
  const where = scope.sql ? `WHERE ${scope.sql}` : "";
  const rows = await query<{ status: string; count: string }>(
    `SELECT o.status::text AS status, COUNT(*)::text AS count
       FROM orders o
       JOIN representatives rep ON rep.id = o.representative_id
       JOIN upazilas up  ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
      ${where}
      GROUP BY o.status
      ORDER BY count DESC`,
    scope.params
  );
  return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
}

// ----------------------------- Personal KPIs (rep) ---------------------------

export interface RepPersonalKpis {
  my_projects: number;
  my_distributed_profit: number;
  my_earnings: number;
  my_orders: number;
  my_order_revenue: number;
  my_outstanding_fees: number;
  my_customers: number;
}

/**
 * KPIs for a plain representative's own dashboard. `my_earnings` sums the
 * amounts owed to them across all their project_distributions (by
 * beneficiary_user_id), i.e. profit share + investment returns.
 */
export async function getRepPersonalKpis(
  user: SessionUser
): Promise<RepPersonalKpis | null> {
  const rep = await queryOne<{ id: string }>(
    `SELECT id FROM representatives WHERE user_id = $1`,
    [user.id]
  );
  if (!rep) return null;
  const repId = rep.id;

  const row = await queryOne<{
    my_projects: string;
    my_distributed_profit: string;
    my_earnings: string;
    my_orders: string;
    my_order_revenue: string;
    my_outstanding_fees: string;
    my_customers: string;
  }>(
    `SELECT
        (SELECT COUNT(*) FROM projects WHERE representative_id = $1)::text AS my_projects,
        (SELECT COALESCE(SUM(net_profit),0) FROM projects
           WHERE representative_id = $1 AND status = 'profit_distributed')::text AS my_distributed_profit,
        (SELECT COALESCE(SUM(amount),0) FROM project_distributions
           WHERE beneficiary_user_id = $2)::text AS my_earnings,
        (SELECT COUNT(*) FROM orders
           WHERE representative_id = $1 AND order_type = 'customer_sale')::text AS my_orders,
        (SELECT COALESCE(SUM(net_amount),0) FROM orders
           WHERE representative_id = $1 AND order_type = 'customer_sale'
             AND status NOT IN ('cancelled','returned'))::text AS my_order_revenue,
        (SELECT COALESCE(SUM(amount),0) FROM fee_invoices
           WHERE representative_id = $1 AND (status = 'pending' OR status = 'overdue'))::text AS my_outstanding_fees,
        (SELECT COUNT(*) FROM customers WHERE representative_id = $1)::text AS my_customers`,
    [repId, user.id]
  );

  return {
    my_projects: Number(row?.my_projects ?? 0),
    my_distributed_profit: Number(row?.my_distributed_profit ?? 0),
    my_earnings: Number(row?.my_earnings ?? 0),
    my_orders: Number(row?.my_orders ?? 0),
    my_order_revenue: Number(row?.my_order_revenue ?? 0),
    my_outstanding_fees: Number(row?.my_outstanding_fees ?? 0),
    my_customers: Number(row?.my_customers ?? 0),
  };
}

/** Convenience: which reporting label fits the viewer's scope. */
export function reportScopeLabel(user: SessionUser): string {
  if (isHQ(user)) return "National";
  if (hasRole(user, "divisional_head")) return "Division";
  if (hasRole(user, "district_head")) return "District";
  return "Personal";
}
