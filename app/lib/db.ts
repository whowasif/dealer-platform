import "server-only";
import { Pool, type QueryResultRow } from "pg";

// -----------------------------------------------------------------------------
// PostgreSQL connection pool.
// Connects to the EXISTING dealer_platform database via DATABASE_URL.
// A single shared pool is reused across hot-reloads in development by caching
// it on the global object (Next.js re-evaluates modules on every change).
// -----------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __dealerPgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.local.example to .env.local and set your postgres password."
    );
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export const pool: Pool = global.__dealerPgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global.__dealerPgPool = pool;
}

/**
 * Run a parameterized query. Always pass user input via `params` ($1, $2, ...)
 * — never string-concatenate values into the SQL text.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query<T>(text, params as never[]);
  return result.rows;
}

/** Run a query and return the first row, or null if none. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Run a set of statements inside a single transaction. The callback receives a
 * dedicated client; the transaction commits on success and rolls back on error.
 */
export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
