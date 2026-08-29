import "server-only";
import { query, queryOne } from "./db";
import { isHQ, hasRole, scopeForRole } from "./rbac";
import type {
  DistrictHeadInfo,
  RepresentativeDetail,
  RepresentativeListItem,
  SessionUser,
  UpazilaRow,
} from "./types";

// -----------------------------------------------------------------------------
// Representative read helpers with role-based scope filtering.
//
// Visibility rules:
//   HQ                    -> all representatives
//   divisional_head       -> reps whose division = their scope_division_id
//   district_head         -> reps whose district = their scope_district_id
//   upazila_representative -> only their own representative row (by user_id)
// -----------------------------------------------------------------------------

const LIST_SELECT = `
  SELECT rep.id,
         rep.user_id,
         u.full_name,
         u.phone,
         rep.status,
         rep.is_district_head,
         rep.join_date,
         up.id            AS upazila_id,
         up.name          AS upazila_name,
         d.id             AS district_id,
         d.name           AS district_name,
         dv.id            AS division_id,
         dv.name          AS division_name,
         pk.name          AS package_name,
         pk.display_name  AS package_display_name
    FROM representatives rep
    JOIN users u      ON u.id = rep.user_id
    JOIN upazilas up  ON up.id = rep.upazila_id
    JOIN districts d  ON d.id = up.district_id
    JOIN divisions dv ON dv.id = d.division_id
    JOIN packages pk  ON pk.id = rep.package_id`;

/**
 * The geographic scope a session user is allowed to see, plus whether they are
 * limited to their own representative record.
 */
export interface RepScope {
  all: boolean;
  divisionId: string | null;
  districtId: string | null;
  selfOnly: boolean;
}

/** Resolve the visibility scope for the current user. */
export function repScopeForUser(user: SessionUser): RepScope {
  if (isHQ(user)) {
    return { all: true, divisionId: null, districtId: null, selfOnly: false };
  }
  if (hasRole(user, "divisional_head")) {
    const { divisionId } = scopeForRole(user, "divisional_head");
    return { all: false, divisionId, districtId: null, selfOnly: false };
  }
  if (hasRole(user, "district_head")) {
    const { districtId } = scopeForRole(user, "district_head");
    return { all: false, divisionId: null, districtId, selfOnly: false };
  }
  // upazila_representative or anything else: only themselves.
  return { all: false, divisionId: null, districtId: null, selfOnly: true };
}

export interface RepListFilters {
  divisionId?: string | null;
  districtId?: string | null;
  status?: string | null;
  packageName?: string | null;
}

/**
 * List representatives visible to `user`, optionally narrowed by UI filters.
 * The scope is always enforced server-side regardless of the requested filters.
 */
export async function listRepresentatives(
  user: SessionUser,
  filters: RepListFilters = {}
): Promise<RepresentativeListItem[]> {
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
  if (filters.divisionId) {
    params.push(filters.divisionId);
    conditions.push(`dv.id = $${params.length}`);
  }
  if (filters.districtId) {
    params.push(filters.districtId);
    conditions.push(`d.id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`rep.status = $${params.length}`);
  }
  if (filters.packageName) {
    params.push(filters.packageName);
    conditions.push(`pk.name = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<RepresentativeListItem>(
    `${LIST_SELECT} ${where} ORDER BY dv.name, d.name, up.name`,
    params
  );
}

/** Fetch full detail for a single representative (no scope check). */
export async function getRepresentative(
  id: string
): Promise<RepresentativeDetail | null> {
  return queryOne<RepresentativeDetail>(
    `SELECT rep.id,
            rep.user_id,
            u.full_name,
            u.phone,
            u.official_email,
            rep.status,
            rep.is_district_head,
            rep.join_date,
            rep.termination_date,
            rep.package_id,
            rep.investment_amount,
            rep.investment_units,
            rep.refundable_balance,
            rep.security_refunded,
            rep.laptop_provided,
            rep.laptop_serial_no,
            rep.laptop_provided_date,
            rep.notes,
            up.id            AS upazila_id,
            up.name          AS upazila_name,
            up.is_sadar      AS upazila_is_sadar,
            d.id             AS district_id,
            d.name           AS district_name,
            dv.id            AS division_id,
            dv.name          AS division_name,
            pk.name          AS package_name,
            pk.display_name  AS package_display_name,
            pk.investment_amount     AS package_investment_amount,
            pk.refundable_amount     AS package_refundable_amount,
            pk.non_refundable_amount AS package_non_refundable_amount,
            pk.onboarding_fee        AS package_onboarding_fee,
            pk.includes_laptop       AS package_includes_laptop,
            pk.investment_units      AS package_investment_units
       FROM representatives rep
       JOIN users u      ON u.id = rep.user_id
       JOIN upazilas up  ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
       JOIN divisions dv ON dv.id = d.division_id
       JOIN packages pk  ON pk.id = rep.package_id
      WHERE rep.id = $1`,
    [id]
  );
}

/** Fetch a representative row id by its user_id (for "my profile" self view). */
export async function getRepresentativeIdByUser(
  userId: string
): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM representatives WHERE user_id = $1`,
    [userId]
  );
  return row?.id ?? null;
}

/**
 * Enforce that `user` may view the given representative.
 * Returns true if allowed, false otherwise.
 */
export function canViewRepresentative(
  user: SessionUser,
  rep: RepresentativeDetail
): boolean {
  const scope = repScopeForUser(user);
  if (scope.all) return true;
  if (scope.selfOnly) return rep.user_id === user.id;
  if (scope.divisionId) return rep.division_id === scope.divisionId;
  if (scope.districtId) return rep.district_id === scope.districtId;
  return false;
}

/**
 * Enforce that `user` may create/modify a representative in the given district.
 * HQ: always; divisional_head: within their division; district_head: within
 * their district. Representatives cannot manage records.
 */
export function canManageRepresentativeInDistrict(
  user: SessionUser,
  districtId: string,
  divisionId: string
): boolean {
  if (isHQ(user)) return true;
  if (hasRole(user, "divisional_head")) {
    const { divisionId: scoped } = scopeForRole(user, "divisional_head");
    return scoped != null && scoped === divisionId;
  }
  if (hasRole(user, "district_head")) {
    const { districtId: scoped } = scopeForRole(user, "district_head");
    return scoped != null && scoped === districtId;
  }
  return false;
}

/** True if the user has any management rights over representatives. */
export function canManageRepresentatives(user: SessionUser): boolean {
  return (
    isHQ(user) ||
    hasRole(user, "divisional_head") ||
    hasRole(user, "district_head")
  );
}

/**
 * Compute the district head for a representative: the rep sitting in the sadar
 * upazila of the same district. Returns null if none assigned yet (or if the
 * rep IS the district head).
 */
export async function getDistrictHeadFor(
  rep: RepresentativeDetail
): Promise<DistrictHeadInfo | null> {
  return queryOne<DistrictHeadInfo>(
    `SELECT rep.id AS representative_id, u.full_name, up.name AS upazila_name
       FROM representatives rep
       JOIN users u     ON u.id = rep.user_id
       JOIN upazilas up ON up.id = rep.upazila_id
      WHERE up.district_id = $1
        AND up.is_sadar = TRUE
        AND rep.id <> $2
      LIMIT 1`,
    [rep.district_id, rep.id]
  );
}

/** Users who are not yet representatives (candidates for onboarding). */
export interface OnboardingCandidate {
  id: string;
  full_name: string;
  phone: string;
}

export async function listUsersWithoutRepresentative(): Promise<
  OnboardingCandidate[]
> {
  return query<OnboardingCandidate>(
    `SELECT u.id, u.full_name, u.phone
       FROM users u
       LEFT JOIN representatives rep ON rep.user_id = u.id
      WHERE rep.id IS NULL
        AND (u.status IS NULL OR u.status = 'active')
      ORDER BY u.full_name ASC`
  );
}

/** An assignable upazila, including its sadar flag for auto district-head. */
export interface AvailableUpazila extends UpazilaRow {
  is_sadar: boolean;
}

/** Upazilas that do not yet have a representative (assignable). */
export async function listAvailableUpazilas(): Promise<AvailableUpazila[]> {
  return query<AvailableUpazila>(
    `SELECT up.id, up.district_id, up.name, up.bn_name, up.code, up.is_sadar
       FROM upazilas up
       LEFT JOIN representatives rep ON rep.upazila_id = up.id
      WHERE rep.id IS NULL
      ORDER BY up.name ASC`
  );
}
