import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "./db";
import { isHQ } from "./rbac";
import { repScopeForUser } from "./representatives";
import { getActiveProfitConfigTx, getActiveInvestmentConfigTx } from "./profit-config";
import { recordAudit } from "./audit";
import {
  computeDistribution,
  round2,
  round4,
  type DistributionBeneficiaries,
  type DistributionFinancials,
} from "./profit-engine";
import type {
  DistributionRow,
  ProjectDetail,
  ProjectInput,
  ProjectListItem,
  SessionUser,
} from "./types";

// Re-export the pure engine so server code can import everything from one place.
export {
  computeDistribution,
  round2,
  round4,
  type ComputedDistribution,
  type ComputedResult,
  type DistributionBeneficiaries,
  type DistributionFinancials,
} from "./profit-engine";

// -----------------------------------------------------------------------------
// Projects, profit & investment distribution engine (CORE FINANCIAL LOGIC).
//
// A project records a business deal that generates profit. Its net profit is
// split three ways (representative / HQ / investment pool) using the currently
// effective profit_distribution_config. The investment pool is then paid out
// per invested unit to the parties connected to the project (main dealer,
// district head, divisional head), with HQ keeping the remainder.
//
// The heart of this file is `computeDistribution` — a PURE, side-effect-free
// function that turns project financials + config + resolved beneficiaries into
// the exact list of distribution rows. It is unit-tested by scripts/verify.
// `distributeProject` is the transactional wrapper that resolves beneficiaries
// from the DB, snapshots the config onto the project, writes the rows, and locks
// the project row so distribution can happen exactly once.
//
// Money DECIMALs come back from node-postgres as strings; all arithmetic uses
// Number(). Stored money is rounded to 2 decimals; investment_return_per_unit is
// stored at 4 decimals (DECIMAL(14,4)).
// -----------------------------------------------------------------------------

// ------------------------------ Project numbers ------------------------------

/**
 * Generate the next project number in the form PRJ-YYYY-000123. Per calendar
 * year, based on MAX of existing numbers with the current prefix. Runs inside
 * the caller's transaction; the UNIQUE constraint is the final race guard.
 */
export async function nextProjectNumber(client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  const { rows } = await client.query<{ max_seq: number | null }>(
    `SELECT MAX(
              CAST(NULLIF(regexp_replace(project_number, '^PRJ-\\d{4}-', ''), '') AS INTEGER)
            ) AS max_seq
       FROM projects
      WHERE project_number LIKE $1`,
    [`${prefix}%`]
  );
  const next = (rows[0]?.max_seq ?? 0) + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}

// -------------------------------- Creation -----------------------------------

/**
 * Create a project in 'draft' or 'in_progress'. Computes and stores net_profit
 * but does NOT distribute yet (rep/hq/investment share amounts stay 0 until
 * distribution). The project's upazila is derived from its representative.
 * Returns the new project id.
 */
export async function createProject(
  input: ProjectInput,
  user: SessionUser
): Promise<string> {
  const netProfit = round2(
    input.project_value - input.vat_tax_amount - input.total_cost
  );

  return withTransaction(async (client) => {
    // Resolve the representative's upazila (and confirm it exists).
    const repRes = await client.query<{ upazila_id: string }>(
      `SELECT upazila_id FROM representatives WHERE id = $1`,
      [input.representative_id]
    );
    if (repRes.rowCount === 0) {
      throw new Error("Selected representative was not found.");
    }
    const upazilaId = repRes.rows[0]!.upazila_id;

    // If a customer is linked, confirm it belongs to this representative.
    if (input.customer_id) {
      const custRes = await client.query<{ id: string }>(
        `SELECT id FROM customers WHERE id = $1 AND representative_id = $2`,
        [input.customer_id, input.representative_id]
      );
      if (custRes.rowCount === 0) {
        throw new Error("Selected customer does not belong to that representative.");
      }
    }

    const projectNumber = await nextProjectNumber(client);

    const res = await client.query<{ id: string }>(
      `INSERT INTO projects
          (project_number, representative_id, upazila_id, customer_id, title,
           description, project_value, vat_tax_percentage, vat_tax_amount,
           total_cost, net_profit, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        projectNumber,
        input.representative_id,
        upazilaId,
        input.customer_id,
        input.title,
        input.description,
        input.project_value,
        input.vat_tax_percentage,
        input.vat_tax_amount,
        input.total_cost,
        netProfit,
        input.status,
        user.id,
      ]
    );
    return res.rows[0]!.id;
  });
}

// --------------------------------- Reads -------------------------------------

const LIST_SELECT = `
  SELECT p.id,
         p.project_number,
         p.title,
         p.status,
         p.project_value,
         p.net_profit,
         p.profit_year,
         p.completed_date,
         p.created_at,
         p.representative_id,
         ru.full_name AS representative_name,
         rep.user_id  AS rep_user_id,
         up.id        AS upazila_id,
         up.name      AS upazila_name,
         d.id         AS district_id,
         d.name       AS district_name,
         dv.id        AS division_id,
         dv.name      AS division_name,
         p.customer_id,
         cust.name    AS customer_name
    FROM projects p
    JOIN representatives rep ON rep.id = p.representative_id
    JOIN users ru            ON ru.id = rep.user_id
    JOIN upazilas up         ON up.id = p.upazila_id
    JOIN districts d         ON d.id = up.district_id
    JOIN divisions dv        ON dv.id = d.division_id
    LEFT JOIN customers cust ON cust.id = p.customer_id`;

export interface ProjectListFilters {
  status?: string | null;
  divisionId?: string | null;
  districtId?: string | null;
  year?: string | null;
}

/**
 * List projects visible to `user`, optionally narrowed by filters. Geographic
 * scope is always enforced server-side (self / district / division / all).
 */
export async function listProjects(
  user: SessionUser,
  filters: ProjectListFilters = {}
): Promise<ProjectListItem[]> {
  const scope = repScopeForUser(user);
  const conditions: string[] = [];
  const params: unknown[] = [];

  // --- enforce scope ---
  if (scope.selfOnly) {
    params.push(user.id);
    conditions.push(`rep.user_id = $${params.length}`);
  } else if (scope.divisionId) {
    params.push(scope.divisionId);
    conditions.push(`dv.id = $${params.length}`);
  } else if (scope.districtId) {
    params.push(scope.districtId);
    conditions.push(`d.id = $${params.length}`);
  }

  // --- optional UI filters (further narrowing only) ---
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`p.status = $${params.length}`);
  }
  if (filters.divisionId) {
    params.push(filters.divisionId);
    conditions.push(`dv.id = $${params.length}`);
  }
  if (filters.districtId) {
    params.push(filters.districtId);
    conditions.push(`d.id = $${params.length}`);
  }
  if (filters.year) {
    params.push(filters.year);
    conditions.push(`p.profit_year = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<ProjectListItem>(
    `${LIST_SELECT} ${where} ORDER BY p.created_at DESC`,
    params
  );
}

/** Fetch full project detail incl. rep + geography + customer + split amounts. */
export async function getProject(id: string): Promise<ProjectDetail | null> {
  return queryOne<ProjectDetail>(
    `SELECT p.id,
            p.project_number,
            p.title,
            p.description,
            p.status,
            p.project_value,
            p.vat_tax_percentage,
            p.vat_tax_amount,
            p.total_cost,
            p.net_profit,
            p.rep_share_amount,
            p.hq_share_amount,
            p.investment_share_amount,
            p.investment_return_per_unit,
            p.completed_date,
            p.profit_year,
            p.created_at,
            p.updated_at,
            p.representative_id,
            ru.full_name        AS representative_name,
            rep.user_id         AS rep_user_id,
            rep.investment_units AS rep_investment_units,
            rep.is_district_head AS rep_is_district_head,
            up.id               AS upazila_id,
            up.name             AS upazila_name,
            up.is_sadar         AS upazila_is_sadar,
            d.id                AS district_id,
            d.name              AS district_name,
            dv.id               AS division_id,
            dv.name             AS division_name,
            p.customer_id,
            cust.name           AS customer_name
       FROM projects p
       JOIN representatives rep ON rep.id = p.representative_id
       JOIN users ru            ON ru.id = rep.user_id
       JOIN upazilas up         ON up.id = p.upazila_id
       JOIN districts d         ON d.id = up.district_id
       JOIN divisions dv        ON dv.id = d.division_id
       LEFT JOIN customers cust ON cust.id = p.customer_id
      WHERE p.id = $1`,
    [id]
  );
}

/** Enforce that `user` may view the given project (scope check). */
export function canViewProject(user: SessionUser, project: ProjectDetail): boolean {
  const scope = repScopeForUser(user);
  if (scope.all) return true;
  if (scope.selfOnly) return project.rep_user_id === user.id;
  if (scope.divisionId) return project.division_id === scope.divisionId;
  if (scope.districtId) return project.district_id === scope.districtId;
  return false;
}

// ------------------------ Beneficiary preview (read-only) --------------------

/**
 * Resolve the three parties connected to a project WITHOUT locking or writing.
 * Used to render a "who will get what" preview before distribution.
 */
export async function resolveBeneficiaries(
  project: ProjectDetail
): Promise<DistributionBeneficiaries> {
  const dealer = {
    rep_id: project.representative_id,
    user_id: project.rep_user_id,
    units: Number(project.rep_investment_units),
    is_district_head:
      project.rep_is_district_head === true || project.upazila_is_sadar === true,
  };

  let districtHead: DistributionBeneficiaries["districtHead"] = null;
  if (!dealer.is_district_head) {
    const dh = await queryOne<{
      rep_id: string;
      user_id: string;
      units: string;
    }>(
      `SELECT rep.id AS rep_id, rep.user_id, rep.investment_units AS units
         FROM representatives rep
         JOIN upazilas up ON up.id = rep.upazila_id
        WHERE up.district_id = $1
          AND up.is_sadar = TRUE
          AND rep.id <> $2
        LIMIT 1`,
      [project.district_id, project.representative_id]
    );
    if (dh) {
      districtHead = {
        rep_id: dh.rep_id,
        user_id: dh.user_id,
        units: Number(dh.units),
      };
    }
  }

  const div = await queryOne<{ head_user_id: string | null }>(
    `SELECT head_user_id FROM divisions WHERE id = $1`,
    [project.division_id]
  );

  return {
    dealer,
    districtHead,
    divisionalHeadUserId: div?.head_user_id ?? null,
  };
}

// ------------------------------ Distribution ---------------------------------

/**
 * Distribute a project's profit. Transactional and idempotent:
 *   1. Lock the project row FOR UPDATE.
 *   2. Refuse if already 'profit_distributed' or 'cancelled'.
 *   3. Resolve the beneficiaries (district head rep in the sadar upazila of the
 *      district; divisional head user via divisions.head_user_id) with the row
 *      locked, so a concurrent distribute cannot double-write.
 *   4. Snapshot the active config percentages + per-unit onto the project.
 *   5. computeDistribution -> INSERT all project_distributions rows.
 *   6. Update the project (split amounts, per-unit, profit_year, status).
 *
 * HQ-only authorization is enforced by the caller (server action) and re-checked
 * here as defense-in-depth.
 */
export async function distributeProject(
  projectId: string,
  user: SessionUser
): Promise<{ project_number: string }> {
  if (!isHQ(user)) {
    throw new Error("Only HQ can distribute project profit.");
  }

  return withTransaction(async (client) => {
    // 1. Lock the project row.
    const projRes = await client.query<{
      id: string;
      project_number: string;
      status: string;
      representative_id: string;
      upazila_id: string;
      project_value: string;
      vat_tax_amount: string;
      total_cost: string;
      net_profit: string;
      completed_date: string | null;
      created_at: string;
      district_id: string;
      division_id: string;
      rep_user_id: string;
      rep_units: string;
      rep_is_district_head: boolean;
      upazila_is_sadar: boolean;
    }>(
      `SELECT p.id, p.project_number, p.status, p.representative_id, p.upazila_id,
              p.project_value, p.vat_tax_amount, p.total_cost, p.net_profit,
              p.completed_date, p.created_at,
              d.id AS district_id, dv.id AS division_id,
              rep.user_id AS rep_user_id,
              rep.investment_units AS rep_units,
              rep.is_district_head AS rep_is_district_head,
              up.is_sadar AS upazila_is_sadar
         FROM projects p
         JOIN representatives rep ON rep.id = p.representative_id
         JOIN upazilas up         ON up.id = p.upazila_id
         JOIN districts d         ON d.id = up.district_id
         JOIN divisions dv        ON dv.id = d.division_id
        WHERE p.id = $1
        FOR UPDATE OF p`,
      [projectId]
    );
    if (projRes.rowCount === 0) {
      throw new Error("Project not found.");
    }
    const p = projRes.rows[0]!;

    // 2. Idempotency / status guards.
    if (p.status === "profit_distributed") {
      throw new Error("This project's profit has already been distributed.");
    }
    if (p.status === "cancelled") {
      throw new Error("A cancelled project cannot be distributed.");
    }

    // Determine the effective date for config snapshot + payout grouping.
    const baseDate = p.completed_date
      ? new Date(p.completed_date)
      : new Date(p.created_at);
    const effectiveDate = isoDate(baseDate);
    const profitYear = baseDate.getFullYear();
    const payoutMonth = baseDate.getMonth() + 1;

    // 4. Snapshot the active config (bound to this txn).
    const profitCfg = await getActiveProfitConfigTx(client, effectiveDate);
    if (!profitCfg) {
      throw new Error("No profit-distribution config is effective for this project.");
    }
    const investCfg = await getActiveInvestmentConfigTx(client, effectiveDate);
    if (!investCfg) {
      throw new Error("No investment-pool config is effective for this project.");
    }

    // 3. Resolve beneficiaries with the row locked.
    const dealerIsDistrictHead =
      p.rep_is_district_head === true || p.upazila_is_sadar === true;

    let districtHead: DistributionBeneficiaries["districtHead"] = null;
    if (!dealerIsDistrictHead) {
      const dhRes = await client.query<{
        rep_id: string;
        user_id: string;
        units: string;
      }>(
        `SELECT rep.id AS rep_id, rep.user_id, rep.investment_units AS units
           FROM representatives rep
           JOIN upazilas up ON up.id = rep.upazila_id
          WHERE up.district_id = $1
            AND up.is_sadar = TRUE
            AND rep.id <> $2
          LIMIT 1`,
        [p.district_id, p.representative_id]
      );
      if (dhRes.rowCount && dhRes.rows[0]) {
        districtHead = {
          rep_id: dhRes.rows[0].rep_id,
          user_id: dhRes.rows[0].user_id,
          units: Number(dhRes.rows[0].units),
        };
      }
    }

    const divRes = await client.query<{ head_user_id: string | null }>(
      `SELECT head_user_id FROM divisions WHERE id = $1`,
      [p.division_id]
    );
    const divisionalHeadUserId = divRes.rows[0]?.head_user_id ?? null;

    const beneficiaries: DistributionBeneficiaries = {
      dealer: {
        rep_id: p.representative_id,
        user_id: p.rep_user_id,
        units: Number(p.rep_units),
        is_district_head: dealerIsDistrictHead,
      },
      districtHead,
      divisionalHeadUserId,
    };

    // 5. Compute distribution (pure).
    const fin: DistributionFinancials = {
      net_profit: Number(p.net_profit),
      total_cost: Number(p.total_cost),
      representative_percentage: Number(profitCfg.representative_percentage),
      hq_percentage: Number(profitCfg.hq_percentage),
      investment_percentage: Number(profitCfg.investment_percentage),
      per_unit_amount: Number(investCfg.per_unit_amount),
    };
    const result = computeDistribution(fin, beneficiaries);

    // 6. Insert all distribution rows.
    for (const row of result.rows) {
      const isProfit = row.distribution_type === "profit_share";
      await client.query(
        `INSERT INTO project_distributions
            (project_id, beneficiary_user_id, beneficiary_rep_id, beneficiary_role,
             distribution_type, units, rate_or_percentage, amount, payout_schedule,
             payout_year, payout_month, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')`,
        [
          projectId,
          row.beneficiary_user_id,
          row.beneficiary_rep_id,
          row.beneficiary_role,
          row.distribution_type,
          row.units,
          row.rate_or_percentage,
          row.amount,
          row.payout_schedule,
          profitYear,
          isProfit ? payoutMonth : null,
        ]
      );
    }

    // 7. Update the project header with the snapshot + status.
    await client.query(
      `UPDATE projects
          SET rep_share_amount = $1,
              hq_share_amount = $2,
              investment_share_amount = $3,
              investment_return_per_unit = $4,
              profit_year = $5,
              completed_date = COALESCE(completed_date, $6::date),
              status = 'profit_distributed',
              updated_at = NOW()
        WHERE id = $7`,
      [
        result.rep_share_amount,
        result.hq_share_amount,
        result.investment_share_amount,
        result.investment_return_per_unit,
        profitYear,
        effectiveDate,
        projectId,
      ]
    );

    // Audit (same transaction): a compact snapshot of the distribution outcome.
    await recordAudit(client, {
      userId: user.id,
      action: "distribute",
      tableName: "projects",
      recordId: projectId,
      oldValue: { status: p.status },
      newValue: {
        status: "profit_distributed",
        rep_share_amount: result.rep_share_amount,
        hq_share_amount: result.hq_share_amount,
        investment_share_amount: result.investment_share_amount,
        profit_year: profitYear,
      },
    });

    return { project_number: p.project_number };
  });
}

/** UTC-safe 'YYYY-MM-DD' from a Date. */
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// --------------------------- Distribution reads ------------------------------

const DIST_SELECT = `
  SELECT pd.id,
         pd.project_id,
         p.project_number,
         p.title AS project_title,
         pd.beneficiary_user_id,
         pd.beneficiary_rep_id,
         pd.beneficiary_role,
         COALESCE(bu.full_name, ru.full_name, 'HQ (company)') AS beneficiary_name,
         pd.distribution_type,
         pd.units,
         pd.rate_or_percentage,
         pd.amount,
         pd.payout_schedule,
         pd.payout_year,
         pd.payout_month,
         pd.status,
         pd.paid_date,
         pd.payout_reference,
         pd.created_at
    FROM project_distributions pd
    JOIN projects p               ON p.id = pd.project_id
    LEFT JOIN users bu            ON bu.id = pd.beneficiary_user_id
    LEFT JOIN representatives brep ON brep.id = pd.beneficiary_rep_id
    LEFT JOIN users ru            ON ru.id = brep.user_id`;

/** All distribution rows for a project, profit shares first then investment. */
export async function listDistributionsForProject(
  projectId: string
): Promise<DistributionRow[]> {
  return query<DistributionRow>(
    `${DIST_SELECT}
      WHERE pd.project_id = $1
      ORDER BY pd.distribution_type ASC,
               CASE pd.beneficiary_role
                 WHEN 'representative' THEN 1
                 WHEN 'district_head'  THEN 2
                 WHEN 'divisional_head' THEN 3
                 WHEN 'hq'             THEN 4
               END`,
    [projectId]
  );
}

export interface DistributionListFilters {
  type?: string | null;
  status?: string | null;
  year?: string | null;
}

/**
 * List distribution rows visible to `user` (what they are owed / oversee).
 * Scope: HQ sees all; a representative sees rows where they are the beneficiary
 * (by user or rep id); heads see rows for projects within their division/
 * district. Enforced server-side.
 */
export async function listDistributions(
  user: SessionUser,
  filters: DistributionListFilters = {}
): Promise<DistributionRow[]> {
  const scope = repScopeForUser(user);
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Extra joins to reach the project's geography for head-level scoping. Uses
  // distinct aliases so it never collides with the pd (project_distributions)
  // alias from DIST_SELECT.
  const scoped = `
    ${DIST_SELECT}
    JOIN upazilas pgup   ON pgup.id = p.upazila_id
    JOIN districts pgd   ON pgd.id = pgup.district_id`;

  if (scope.selfOnly) {
    params.push(user.id);
    conditions.push(`pd.beneficiary_user_id = $${params.length}`);
  } else if (scope.divisionId) {
    params.push(scope.divisionId);
    conditions.push(`pgd.division_id = $${params.length}`);
  } else if (scope.districtId) {
    params.push(scope.districtId);
    conditions.push(`pgd.id = $${params.length}`);
  }

  if (filters.type) {
    params.push(filters.type);
    conditions.push(`pd.distribution_type = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`pd.status = $${params.length}`);
  }
  if (filters.year) {
    params.push(filters.year);
    conditions.push(`pd.payout_year = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<DistributionRow>(
    `${scoped} ${where} ORDER BY pd.created_at DESC`,
    params
  );
}
