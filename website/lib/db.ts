import { Pool, type QueryResultRow } from "pg";

// -----------------------------------------------------------------------------
// Read/write access to the shared dealer_platform database for the public site.
//
// The website only needs a few tables (website_insight_cards,
// website_network_cards, website_contact_messages). A single shared pool is
// reused across hot-reloads by caching it on the global object.
//
// If DATABASE_URL is not set (or the DB is unreachable), the website MUST still
// render using its static fallback content — read callers use safeQuery which
// returns [] on failure. Write callers (contact form) use mustQuery which
// throws so the error can be surfaced to the user.
// -----------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __misSitePgPool: Pool | undefined;
}

function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!global.__misSitePgPool) {
    global.__misSitePgPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return global.__misSitePgPool;
}

/**
 * Run a parameterized query. Returns [] when the DB is not configured or the
 * query fails, so the site can fall back to static content instead of erroring.
 */
export async function safeQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const result = await pool.query<T>(text, params as never[]);
    return result.rows;
  } catch (err) {
    // 42P01 = undefined_table: the website_* tables aren't created yet (the
    // migration hasn't been run). That's an expected pre-migration state — the
    // site falls back to static content, so keep the log quiet in that case.
    const code = (err as { code?: string })?.code;
    if (code === "42P01") {
      console.warn(
        "[website db] website content tables not found — using static fallback. Run database/08_website_content.sql."
      );
    } else {
      console.error("[website db] query failed:", err);
    }
    return [];
  }
}

/**
 * Run a query that must succeed (e.g. an INSERT for the contact form). Throws
 * on failure or when the DB is not configured, so the caller can surface a
 * meaningful error to the user.
 */
export async function mustQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getPool();
  if (!pool) throw new Error("Database is not configured.");
  const result = await pool.query<T>(text, params as never[]);
  return result.rows;
}
