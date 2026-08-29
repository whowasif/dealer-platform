import "server-only";
import { query } from "./db";
import type { ContractRow } from "./types";

// -----------------------------------------------------------------------------
// Contract read helpers + contract-number generation.
// -----------------------------------------------------------------------------

/** List contracts for a representative, newest first. */
export async function listContracts(
  representativeId: string
): Promise<ContractRow[]> {
  return query<ContractRow>(
    `SELECT id, representative_id, contract_number, start_date, end_date,
            term_years, renewal_fee, status, signed_document_url, signed_at,
            renewed_from, created_at
       FROM contracts
      WHERE representative_id = $1
      ORDER BY created_at DESC`,
    [representativeId]
  );
}

/**
 * Generate the next contract number in the form CON-YYYY-000123.
 * The sequence is per calendar year, based on the current count of contracts
 * whose number starts with the current year prefix. Callers should run this
 * inside the same transaction as the insert to reduce race windows.
 */
export async function nextContractNumber(
  client: import("pg").PoolClient
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CON-${year}-`;
  const { rows } = await client.query<{ max_seq: number | null }>(
    `SELECT MAX(
              CAST(NULLIF(regexp_replace(contract_number, '^CON-\\d{4}-', ''), '') AS INTEGER)
            ) AS max_seq
       FROM contracts
      WHERE contract_number LIKE $1`,
    [`${prefix}%`]
  );
  const next = (rows[0]?.max_seq ?? 0) + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}
