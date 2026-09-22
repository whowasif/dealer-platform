-- Run after all schema, seed, migration, and cleanup scripts.
-- Run as the database owner/admin. The app connects as mis_solution_user.

GRANT USAGE ON SCHEMA public TO mis_solution_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mis_solution_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mis_solution_user;