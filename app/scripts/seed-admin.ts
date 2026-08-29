/**
 * Seed a single super_admin user into the EXISTING dealer_platform database.
 *
 * Idempotent: if a user with the admin phone/email already exists, it updates
 * the password hash and ensures the super_admin role is assigned.
 *
 * Run with:  npm run seed:admin
 * (uses node --experimental-strip-types to run this .ts file directly)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import bcrypt from "bcryptjs";

// --- Load .env.local manually (no dotenv dependency) -------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnvLocal(): void {
  try {
    const envPath = resolve(__dirname, "..", ".env.local");
    const content = readFileSync(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Fall back to whatever is already in the environment.
  }
}
loadEnvLocal();

// --- Default admin credentials ----------------------------------------------
const ADMIN = {
  full_name: "System Administrator",
  phone: "01700000000",
  official_email: "admin@example.com",
  password: "Admin@123",
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DATABASE_URL is not set. Set it in .env.local (with your postgres password)."
    );
    process.exit(1);
  }
  if (connectionString.includes(":PASSWORD@")) {
    console.error(
      "DATABASE_URL still contains the placeholder PASSWORD. " +
        "Edit .env.local and set your real postgres password first."
    );
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Confirm the super_admin role exists (seeded by 03_seed_config.sql).
    const roleRes = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1`
    );
    if (roleRes.rowCount === 0) {
      throw new Error(
        "super_admin role not found. Did you run 03_seed_config.sql?"
      );
    }
    const roleId = roleRes.rows[0].id;

    const passwordHash = await bcrypt.hash(ADMIN.password, 10);

    // Upsert the admin user by phone.
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE phone = $1 OR official_email = $2 LIMIT 1`,
      [ADMIN.phone, ADMIN.official_email]
    );

    let userId: string;
    if (existing.rowCount && existing.rows[0]) {
      userId = existing.rows[0].id;
      await client.query(
        `UPDATE users
            SET password_hash = $1, full_name = $2, official_email = $3,
                status = 'active', updated_at = NOW()
          WHERE id = $4`,
        [passwordHash, ADMIN.full_name, ADMIN.official_email, userId]
      );
      console.log(`Updated existing admin user (${userId}).`);
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO users (password_hash, full_name, phone, official_email, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [passwordHash, ADMIN.full_name, ADMIN.phone, ADMIN.official_email]
      );
      userId = inserted.rows[0].id;
      console.log(`Created admin user (${userId}).`);
    }

    // Ensure super_admin role assignment (unique on user_id, role_id).
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId]
    );

    console.log("\nSeed complete. Default login credentials:");
    console.log(`  Phone:    ${ADMIN.phone}`);
    console.log(`  Email:    ${ADMIN.official_email}`);
    console.log(`  Password: ${ADMIN.password}`);
    console.log("\nChange this password after first login.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
