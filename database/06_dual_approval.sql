-- =============================================================================
-- Dealer Network Management System — Migration 06: Dual approval
-- Target: PLAIN PostgreSQL 18
--
-- Adds a two-stage approval trail to ORDERS and PROJECTS:
--   * A representative creates the order/project -> it stays PENDING.
--   * A divisional head (scoped to the rep's division) approves -> stage 1.
--   * HQ approves -> stage 2.
--   * Only when BOTH stages are approved does the item become fully approved
--     (orders.status -> 'approved', projects.status -> 'in_progress').
--
-- These columns are ADDITIVE and nullable, so existing rows and the existing
-- single-column approved_by/approved_at flow keep working. Run this ONCE in
-- pgAdmin against the dealer_platform database. Safe to re-run (IF NOT EXISTS).
-- =============================================================================

BEGIN;

-- ---- ORDERS ----------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS division_approved_by  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS division_approved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hq_approved_by         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS hq_approved_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by             UUID REFERENCES users(id);

-- ---- PROJECTS --------------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS division_approved_by  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS division_approved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hq_approved_by         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS hq_approved_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_for_approval BOOLEAN DEFAULT FALSE;

-- Helpful indexes for the "pending approvals" queues.
CREATE INDEX IF NOT EXISTS idx_orders_pending_division
  ON orders(division_approved_at) WHERE division_approved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_pending_hq
  ON orders(hq_approved_at) WHERE hq_approved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_pending_division
  ON projects(division_approved_at) WHERE division_approved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_pending_hq
  ON projects(hq_approved_at) WHERE hq_approved_at IS NULL;

COMMIT;

-- =============================================================================
-- Verification (optional): confirm the new columns exist.
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'orders'
--      AND column_name IN ('division_approved_by','hq_approved_by');
-- =============================================================================
