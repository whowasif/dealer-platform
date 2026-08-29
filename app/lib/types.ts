// -----------------------------------------------------------------------------
// Shared domain types. Column names mirror the PostgreSQL schema exactly.
// -----------------------------------------------------------------------------

export type RoleName =
  | "super_admin"
  | "hq_admin"
  | "hq_finance"
  | "hq_operations"
  | "divisional_head"
  | "district_head"
  | "upazila_representative";

export interface UserRow {
  id: string;
  password_hash: string | null;
  full_name: string;
  phone: string;
  personal_email: string | null;
  official_email: string | null;
  nid_number: string | null;
  status: string | null;
  created_at: string;
}

export interface RoleRow {
  id: string;
  name: RoleName;
  display_name: string;
  description: string | null;
  level: number;
}

/** A role assignment for a user, including its geographic scope. */
export interface UserRoleAssignment {
  role_id: string;
  role_name: RoleName;
  role_display_name: string;
  level: number;
  scope_division_id: string | null;
  scope_district_id: string | null;
  scope_upazila_id: string | null;
}

/** The authenticated session user, resolved server-side. */
export interface SessionUser {
  id: string;
  full_name: string;
  phone: string;
  official_email: string | null;
  roles: UserRoleAssignment[];
  /** Lowest level number = highest authority (1 = super_admin). */
  highestLevel: number;
  /** The role name that grants the highest authority. */
  primaryRole: RoleName;
}

/** Minimal JWT payload persisted in the session cookie. */
export interface SessionTokenPayload {
  sub: string; // user id
  name: string;
  phone: string;
}

export interface DivisionRow {
  id: string;
  name: string;
  bn_name: string;
  code: string;
}

export interface DistrictRow {
  id: string;
  division_id: string;
  name: string;
  bn_name: string;
  code: string;
}

export interface UpazilaRow {
  id: string;
  district_id: string;
  name: string;
  bn_name: string;
  code: string;
}
