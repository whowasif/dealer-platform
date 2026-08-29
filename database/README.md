# Dealer Network Management System — Database

SQL files for the Dealer Network Management System, targeting **plain PostgreSQL 18**
(not Supabase). All UUID primary keys use `gen_random_uuid()` from the built-in
`pgcrypto` extension, which each script enables where needed.

## Environment

- **PostgreSQL version:** 18
- **Port:** 5433
- **Database name:** `dealer_platform`

## Files

| File | Purpose |
|------|---------|
| `01_schema.sql` | All enum types, tables (34 tables), indexes, and foreign keys, in dependency order. |
| `02_seed_geography.sql` | Bangladesh geography: 8 divisions, 64 districts, 497 upazilas, with `is_sadar` flags. |
| `03_seed_config.sql` | Default config: roles, packages, profit/investment config, document categories. |
| `README.md` | This guide. |

## Run order (important)

Run the files **strictly in this order**. Each one depends on the previous.

1. `01_schema.sql`  — creates the structure.
2. `02_seed_geography.sql` — depends on the geography tables from step 1.
3. `03_seed_config.sql` — depends on the tables from step 1.

## How to run in pgAdmin

1. Open **pgAdmin** and connect to the PostgreSQL 18 server (port **5433**).
2. Make sure the target database **`dealer_platform`** exists. If it does not, right-click
   **Databases -> Create -> Database...**, name it `dealer_platform`, and save.
3. Right-click the **`dealer_platform`** database -> **Query Tool**.
4. Open `01_schema.sql` (the folder icon **Open File**, or paste the file contents).
5. Press **Execute/F5** to run it.
6. Repeat steps 3-5 for `02_seed_geography.sql`, then `03_seed_config.sql`.

> Tip: The Bangla (`bn_name`) values are UTF-8. pgAdmin displays them correctly.
> If you run via `psql` on Windows, set the client encoding first:
> `SET client_encoding = 'UTF8';` (a Windows console may not render Bangla glyphs,
> but the stored data is still correct UTF-8).

### Alternative: run with psql

```bash
psql -h localhost -p 5433 -U postgres -d dealer_platform -v ON_ERROR_STOP=1 -f 01_schema.sql
psql -h localhost -p 5433 -U postgres -d dealer_platform -v ON_ERROR_STOP=1 -f 02_seed_geography.sql
psql -h localhost -p 5433 -U postgres -d dealer_platform -v ON_ERROR_STOP=1 -f 03_seed_config.sql
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
SELECT count(*) FROM document_categories;         -- expect 12
SELECT count(*) FROM profit_distribution_config;  -- expect 1
SELECT count(*) FROM investment_pool_config;      -- expect 1

-- Total tables in the schema
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';   -- expect 34
```

## Notes

- No Supabase-specific features are used (no `auth.users`, no RLS, no storage buckets).
- Authentication is handled at the application layer. The `users` table stores a
  `password_hash` column instead of a Supabase `auth_id`.
- All three scripts were verified to run top-to-bottom on PostgreSQL 18 without errors.
