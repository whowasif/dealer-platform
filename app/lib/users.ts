import "server-only";
import { query } from "./db";
import type { DistrictRow, DivisionRow, RoleRow, UpazilaRow } from "./types";

// -----------------------------------------------------------------------------
// Read helpers for the user-management screens.
// -----------------------------------------------------------------------------

export interface UserListItem {
  id: string;
  full_name: string;
  phone: string;
  official_email: string | null;
  status: string | null;
  created_at: string;
  roles: string; // comma-separated display names (may be empty)
}

/** List all users with their assigned role display names. */
export async function listUsers(): Promise<UserListItem[]> {
  return query<UserListItem>(
    `SELECT u.id,
            u.full_name,
            u.phone,
            u.official_email,
            u.status,
            u.created_at,
            COALESCE(
              string_agg(r.display_name, ', ' ORDER BY r.level),
              ''
            ) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r        ON r.id = ur.role_id
      GROUP BY u.id
      ORDER BY u.created_at DESC`
  );
}

export async function listRoles(): Promise<RoleRow[]> {
  return query<RoleRow>(
    `SELECT id, name, display_name, description, level
       FROM roles
      ORDER BY level ASC, display_name ASC`
  );
}

export async function listDivisions(): Promise<DivisionRow[]> {
  return query<DivisionRow>(
    `SELECT id, name, bn_name, code FROM divisions ORDER BY name ASC`
  );
}

export async function listDistricts(): Promise<DistrictRow[]> {
  return query<DistrictRow>(
    `SELECT id, division_id, name, bn_name, code
       FROM districts ORDER BY name ASC`
  );
}

export async function listUpazilas(): Promise<UpazilaRow[]> {
  return query<UpazilaRow>(
    `SELECT id, district_id, name, bn_name, code
       FROM upazilas ORDER BY name ASC`
  );
}
