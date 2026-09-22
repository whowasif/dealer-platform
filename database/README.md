# Dealer Network Management System — Database

SQL files for the Dealer Network Management System, targeting the Dhaka host's
**plain PostgreSQL 10** installation. These final deployment files do not use
Supabase or require the unavailable `pgcrypto` extension.

## Environment

- **PostgreSQL version:** 10.23
- **Port:** 5432
- **Database name:** `dealer_platform`

## Files

| File | Purpose |
|------|---------|
| `01_schema_pg10.sql` | All enum types, tables, indexes, and foreign keys, in dependency order. Includes the host-compatible UUID function. |
| `02_seed_geography.sql` | Bangladesh geography: 8 divisions, 64 districts, 497 upazilas, with `is_sadar` flags. |
| `03_seed_config.sql` | Default config: roles, packages, profit/investment config, document categories. |
| `05_inquiry_web_pg10.sql` | Public marketing-site inquiry intake table. |
| `06_dual_approval.sql` | Migration: two-stage (divisional + HQ) approval trail on orders and projects. |
| `09_document_workflow_v2_pg10.sql` | PostgreSQL 10 version of the simplified file/chat/progress workflow. |
| `13_grant_app_user.sql` | Grants the application database user access after a rebuild. |
| `dealer_platform_backup.sql` | SQL backup of the database. Keep this file for recovery/reference; do not run it as part of the normal rebuild. |
| `README.md` | This guide. |

## Run order (important)

Run the files **strictly in this order**. Each one depends on the previous.

1. `01_schema_pg10.sql`  — creates the structure.
2. `02_seed_geography.sql` — depends on the geography tables from step 1.
3. `03_seed_config.sql` — depends on the tables from step 1.
4. `05_inquiry_web_pg10.sql` — adds the public inquiry table (additive; safe to re-run).
5. `06_dual_approval.sql` — adds dual-approval columns (additive; safe to re-run).
6. `07_v5_company_fund_pg10.sql` — adds the v5.0 company-fund tables and enum values (additive; safe to re-run).
7. `08_website_content_pg10.sql` — adds website content and contact-message tables (additive; safe to re-run).
8. `09_document_workflow_v2_pg10.sql` — adds personal files, project files, chat, and project progress (additive; safe to re-run).
9. `13_grant_app_user.sql` — grants the application user access.

Finally run `npm run seed:admin` from the app project to create the initial
super admin. `dealer_platform_backup.sql` is a backup artifact, not a migration;
keep it but do not execute it during the normal setup.

## How to run in pgAdmin

1. Open phpPgAdmin and connect to the PostgreSQL 10.23 server (port **5432**).
2. Make sure the target database **`dealer_platform`** exists. If it does not, right-click
   **Databases -> Create -> Database...**, name it `dealer_platform`, and save.
3. Right-click the **`dealer_platform`** database -> **Query Tool**.
4. Open `01_schema_pg10.sql` (or paste the file contents).
5. Press **Execute/F5** to run it.
6. Repeat steps 3-5 for `02_seed_geography.sql`, then `03_seed_config.sql`.

> Tip: The Bangla (`bn_name`) values are UTF-8. pgAdmin displays them correctly.
> If you run via `psql` on Windows, set the client encoding first:
> `SET client_encoding = 'UTF8';` (a Windows console may not render Bangla glyphs,
> but the stored data is still correct UTF-8).

### Alternative: run with psql

```bash
psql -h 127.0.0.200 -p 5432 -U missolut -d dealer_platform -v ON_ERROR_STOP=1 -f 01_schema_pg10.sql
psql -h 127.0.0.200 -p 5432 -U missolut -d dealer_platform -v ON_ERROR_STOP=1 -f 02_seed_geography.sql
psql -h 127.0.0.200 -p 5432 -U missolut -d dealer_platform -v ON_ERROR_STOP=1 -f 03_seed_config.sql
```

## Verification queries

Run these after loading all three files. Expected results are noted inline.

```sql
-- Geography counts
SELECT count(*) FROM divisions;   -- expect 8
SELECT count(*) FROM districts;   -- expect 64
SELECT count(*) FROM upazilas;    -- expect 497 (495+)

-- One sadar district per division (expect 8) and one sadar upazila per district (expect 64)
SELECT count(*) FROM districts WHERE is_sadar;   -- expect 8
SELECT count(*) FROM upazilas  WHERE is_sadar;   -- expect 64

-- Districts per division (expect 13,11,8,10,6,4,8,4 = 64 total)
SELECT dv.name AS division, count(d.id) AS districts
FROM divisions dv
JOIN districts d ON d.division_id = dv.id
GROUP BY dv.name
ORDER BY districts DESC, division;

-- Config seed counts
SELECT count(*) FROM roles;                       -- expect 7
SELECT count(*) FROM packages;                    -- expect 2
SELECT count(*) FROM profit_distribution_config;  -- expect 1
SELECT count(*) FROM investment_pool_config;      -- expect 1

-- Total tables in the final schema (may change as new modules are added)
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

## Notes

- No Supabase-specific features are used (no `auth.users`, no RLS, no storage buckets).
- Authentication is handled at the application layer. The `users` table stores a
  `password_hash` column instead of a Supabase `auth_id`.
- The final deployment sequence targets PostgreSQL 10.23 on the Dhaka host.
- `dealer_platform_backup.sql` is a recovery/reference backup, not a normal migration.
