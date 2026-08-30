import "server-only";
import { query, queryOne, withTransaction } from "./db";
import { repScopeForUser } from "./representatives";
import type {
  CustomerDetail,
  CustomerListItem,
  CustomerType,
  SessionUser,
} from "./types";

// -----------------------------------------------------------------------------
// Customer read/write helpers with role-based scope filtering.
//
// Customers belong to a representative. Visibility mirrors representatives:
//   HQ                     -> all customers
//   divisional_head        -> customers of reps in their division
//   district_head          -> customers of reps in their district
//   upazila_representative  -> only their own customers
//
// Scope is enforced by joining the customer's owning representative to its
// geography and filtering on the current user's scope — never trust the UI.
// -----------------------------------------------------------------------------

const LIST_SELECT = `
  SELECT c.id,
         c.name,
         c.phone,
         c.email,
         c.type,
         c.organization_name,
         c.representative_id,
         ru.full_name AS representative_name,
         c.upazila_id,
         cup.name     AS upazila_name,
         c.created_at
    FROM customers c
    JOIN representatives rep ON rep.id = c.representative_id
    JOIN users ru            ON ru.id = rep.user_id
    JOIN upazilas rup        ON rup.id = rep.upazila_id
    JOIN districts rd        ON rd.id = rup.district_id
    LEFT JOIN upazilas cup   ON cup.id = c.upazila_id`;

export interface CustomerListFilters {
  search?: string | null;
  type?: string | null;
}

/**
 * List customers visible to `user`, optionally narrowed by search/type.
 * The geographic scope is always enforced server-side.
 */
export async function listCustomers(
  user: SessionUser,
  filters: CustomerListFilters = {}
): Promise<CustomerListItem[]> {
  const scope = repScopeForUser(user);
  const conditions: string[] = [];
  const params: unknown[] = [];

  // --- enforce scope ---
  if (scope.selfOnly) {
    params.push(user.id);
    conditions.push(`rep.user_id = $${params.length}`);
  } else if (scope.divisionId) {
    params.push(scope.divisionId);
    conditions.push(`rd.division_id = $${params.length}`);
  } else if (scope.districtId) {
    params.push(scope.districtId);
    conditions.push(`rd.id = $${params.length}`);
  }

  // --- optional UI filters ---
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    conditions.push(
      `(c.name ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.organization_name ILIKE $${idx})`
    );
  }
  if (filters.type) {
    params.push(filters.type);
    conditions.push(`c.type = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<CustomerListItem>(
    `${LIST_SELECT} ${where} ORDER BY c.name ASC`,
    params
  );
}

/** Fetch full customer detail incl. rep + geography (no scope check here). */
export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  return queryOne<CustomerDetail>(
    `SELECT c.id,
            c.representative_id,
            c.name,
            c.phone,
            c.email,
            c.address,
            c.type,
            c.organization_name,
            c.upazila_id,
            c.notes,
            c.created_at,
            c.updated_at,
            ru.full_name  AS representative_name,
            rep.user_id   AS rep_user_id,
            rd.division_id AS rep_division_id,
            rd.id          AS rep_district_id,
            cup.name       AS upazila_name
       FROM customers c
       JOIN representatives rep ON rep.id = c.representative_id
       JOIN users ru            ON ru.id = rep.user_id
       JOIN upazilas rup        ON rup.id = rep.upazila_id
       JOIN districts rd        ON rd.id = rup.district_id
       LEFT JOIN upazilas cup   ON cup.id = c.upazila_id
      WHERE c.id = $1`,
    [id]
  );
}

/** Enforce that `user` may view/manage the given customer. */
export function canAccessCustomer(
  user: SessionUser,
  customer: CustomerDetail
): boolean {
  const scope = repScopeForUser(user);
  if (scope.all) return true;
  if (scope.selfOnly) return customer.rep_user_id === user.id;
  if (scope.divisionId) return customer.rep_division_id === scope.divisionId;
  if (scope.districtId) return customer.rep_district_id === scope.districtId;
  return false;
}

export interface CustomerInput {
  representative_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: CustomerType;
  organization_name: string | null;
  upazila_id: string | null;
  notes: string | null;
}

/** Create a customer. Returns the new customer id. */
export async function createCustomer(input: CustomerInput): Promise<string> {
  return withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `INSERT INTO customers
          (representative_id, name, phone, email, address, type,
           organization_name, upazila_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        input.representative_id,
        input.name,
        input.phone,
        input.email,
        input.address,
        input.type,
        input.organization_name,
        input.upazila_id,
        input.notes,
      ]
    );
    return result.rows[0]!.id;
  });
}

/** Update a customer's editable fields (owning rep is never reassigned here). */
export async function updateCustomer(
  id: string,
  input: Omit<CustomerInput, "representative_id">
): Promise<void> {
  await query(
    `UPDATE customers
        SET name = $1,
            phone = $2,
            email = $3,
            address = $4,
            type = $5,
            organization_name = $6,
            upazila_id = $7,
            notes = $8,
            updated_at = NOW()
      WHERE id = $9`,
    [
      input.name,
      input.phone,
      input.email,
      input.address,
      input.type,
      input.organization_name,
      input.upazila_id,
      input.notes,
      id,
    ]
  );
}
