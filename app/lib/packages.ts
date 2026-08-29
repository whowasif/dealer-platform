import "server-only";
import { query, queryOne } from "./db";
import type { PackageRow } from "./types";

// -----------------------------------------------------------------------------
// Read helpers for the seeded `packages` table (Standard / Premium).
// -----------------------------------------------------------------------------

/** List active packages, standard first. */
export async function listPackages(): Promise<PackageRow[]> {
  return query<PackageRow>(
    `SELECT id, name, display_name, investment_amount, refundable_amount,
            non_refundable_amount, onboarding_fee, includes_laptop,
            investment_units, monthly_maintenance_fee, is_active
       FROM packages
      WHERE is_active = TRUE
      ORDER BY investment_amount ASC`
  );
}

/** Fetch a single package by id. */
export async function getPackage(id: string): Promise<PackageRow | null> {
  return queryOne<PackageRow>(
    `SELECT id, name, display_name, investment_amount, refundable_amount,
            non_refundable_amount, onboarding_fee, includes_laptop,
            investment_units, monthly_maintenance_fee, is_active
       FROM packages
      WHERE id = $1`,
    [id]
  );
}
