-- =============================================================================
-- Dealer Network Management System â€” Migration 07: v5.0 Company-Fund model
-- Target: PLAIN PostgreSQL 18
--
-- Aligns the database with the v5.0 plan. Net profit is still split 20/40/40
-- (profit_distribution_config, unchanged). What changes is the meaning of the
-- 40% "investment" slice: it is NO LONGER paid back to representatives as a
-- per-unit "investment return". Instead it is a COMPANY FUND, split further:
--
--   * Executives Profit           15% of net profit  -> distributed among the
--                                                        5-6 HQ Executives by an
--                                                        editable role_weight.
--   * Supervision + Support        5% of net profit  -> ~3% supervision incentive
--                                                        (district/divisional/
--                                                        upazila) + ~2% into the
--                                                        Representative Support Fund.
--   * Future Works Fund           20% of net profit  -> retained company capital.
--
-- (15 + 5 + 20 = 40, matching profit_distribution_config.investment_percentage.)
--
-- Plus three fund ledgers (representative support / future works / growth) and
-- an hq_executives table with editable role weights.
--
-- Everything here is ADDITIVE. The old investment_pool_config table and the
-- 'investment_return' distribution_type value are LEFT IN PLACE for backward
-- compatibility but are no longer used by the v5.0 engine. Run this ONCE in
-- pgAdmin against the dealer_platform database. Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM additions.
-- New ENUM values must be committed BEFORE they can be used by later statements,
-- and ALTER TYPE ... ADD VALUE cannot run inside the same transaction that then
-- uses the value. So these run first, each idempotent, outside an explicit txn.
-- -----------------------------------------------------------------------------
ALTER TYPE beneficiary_role ADD VALUE IF NOT EXISTS 'hq_executive';
ALTER TYPE beneficiary_role ADD VALUE IF NOT EXISTS 'support_fund';
ALTER TYPE beneficiary_role ADD VALUE IF NOT EXISTS 'future_works';

-- The 40% slice is a company fund now, not an investment return.
ALTER TYPE distribution_type ADD VALUE IF NOT EXISTS 'company_fund';

-- -----------------------------------------------------------------------------
-- 2. Tables + seed (transactional).
-- -----------------------------------------------------------------------------
BEGIN;

-- ---- INVESTMENT SPLIT CONFIG -----------------------------------------------
-- How the 40% "investment" slice of NET PROFIT is sub-divided. All three
-- percentages are expressed as a percentage of NET PROFIT (not of the 40%),
-- so the engine can read them directly. By default 15 + 5 + 20 = 40, which
-- must equal profit_distribution_config.investment_percentage.
--
-- The 5% supervision+support bucket is further split into a supervision
-- incentive part (~3%) and a representative-support-fund part (~2%); those two
-- must sum to supervision_percentage.
--
-- Versioned by [effective_from, effective_to] exactly like the other configs.
CREATE TABLE IF NOT EXISTS investment_split_config (
    id                          UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    -- shares of NET PROFIT
    executive_percentage        DECIMAL(5,2) NOT NULL DEFAULT 15,   -- 15%
    supervision_percentage      DECIMAL(5,2) NOT NULL DEFAULT 5,    -- 5% (supervision + support)
    future_works_percentage     DECIMAL(5,2) NOT NULL DEFAULT 20,   -- 20%
    -- sub-split of the supervision_percentage bucket (also % of NET PROFIT)
    supervision_sub_percentage  DECIMAL(5,2) NOT NULL DEFAULT 3,    -- ~3% supervision incentive
    support_fund_sub_percentage DECIMAL(5,2) NOT NULL DEFAULT 2,    -- ~2% representative support fund
    effective_from              DATE NOT NULL,
    effective_to                DATE,
    notes                       TEXT,
    created_by                  UUID REFERENCES users(id),
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    -- The three top-level buckets must add up to the total investment slice.
    CONSTRAINT chk_investment_split_sum
        CHECK (executive_percentage + supervision_percentage + future_works_percentage = 40),
    -- The 5% bucket must reconcile to its two sub-parts.
    CONSTRAINT chk_supervision_sub_sum
        CHECK (supervision_sub_percentage + support_fund_sub_percentage = supervision_percentage),
    CONSTRAINT chk_investment_split_nonneg
        CHECK (executive_percentage >= 0 AND supervision_percentage >= 0
               AND future_works_percentage >= 0 AND supervision_sub_percentage >= 0
               AND support_fund_sub_percentage >= 0)
);

-- Seed the current window (15 / 5 / 20, with 3 / 2 inside the 5).
INSERT INTO investment_split_config
    (executive_percentage, supervision_percentage, future_works_percentage,
     supervision_sub_percentage, support_fund_sub_percentage, effective_from, notes)
SELECT 15, 5, 20, 3, 2, CURRENT_DATE, 'v5.0 initial split (15/5/20; 3/2 within the 5)'
WHERE NOT EXISTS (SELECT 1 FROM investment_split_config);

-- ---- HQ EXECUTIVES ----------------------------------------------------------
-- The 5-6 people who run HQ (NOT partners). Each has a designation and an
-- editable role_weight that determines their share of the 15% executives-profit
-- bucket (shares are proportional to weight among the active executives). The
-- CEO is simply one of these executives (is_ceo flag, informational).
CREATE TABLE IF NOT EXISTS hq_executives (
    id              UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    designation     VARCHAR(150) NOT NULL,             -- e.g., 'CEO', 'COO', 'Head of Operations'
    role_weight     DECIMAL(8,2) NOT NULL DEFAULT 1 CHECK (role_weight >= 0),  -- editable any time
    is_ceo          BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hq_executives_active ON hq_executives(is_active);

-- ---- FUND LEDGERS -----------------------------------------------------------
-- Simple double-column ledgers (credit/debit) with a running balance, one row
-- per movement. Credits come from project distribution; debits from payouts /
-- fund usage. reference_type/reference_id tie a movement back to its source
-- (e.g., 'project'/<project_id>).

-- Representative Support Fund (funded from the ~2% support sub-bucket).
CREATE TABLE IF NOT EXISTS representative_support_fund_ledger (
    id                  UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    transaction_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    description         TEXT NOT NULL,
    credit              DECIMAL(16,2) NOT NULL DEFAULT 0,   -- money in
    debit               DECIMAL(16,2) NOT NULL DEFAULT 0,   -- money out
    balance             DECIMAL(16,2) NOT NULL,             -- running balance after this row
    reference_type      VARCHAR(30),                        -- 'project', 'grant', 'adjustment'
    reference_id        UUID,
    representative_id   UUID REFERENCES representatives(id),-- set when a payout targets a rep
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_fund_ref
    ON representative_support_fund_ledger(reference_type, reference_id);

-- Future Works Fund (funded from the 20% sub-bucket).
CREATE TABLE IF NOT EXISTS future_works_fund_ledger (
    id                  UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    transaction_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    description         TEXT NOT NULL,
    credit              DECIMAL(16,2) NOT NULL DEFAULT 0,
    debit               DECIMAL(16,2) NOT NULL DEFAULT 0,
    balance             DECIMAL(16,2) NOT NULL,
    reference_type      VARCHAR(30),                        -- 'project', 'expense', 'adjustment'
    reference_id        UUID,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_future_works_ref
    ON future_works_fund_ledger(reference_type, reference_id);

-- Growth / Reserve Fund (from investing pooled refundable deposits â€” NOT from
-- project net profit; managed by HQ; representatives have no claim on it).
CREATE TABLE IF NOT EXISTS growth_fund_ledger (
    id                  UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    transaction_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    description         TEXT NOT NULL,
    credit              DECIMAL(16,2) NOT NULL DEFAULT 0,   -- investment returns in
    debit               DECIMAL(16,2) NOT NULL DEFAULT 0,   -- usage out
    balance             DECIMAL(16,2) NOT NULL,
    reference_type      VARCHAR(30),                        -- 'deposit_investment', 'return', 'usage'
    reference_id        UUID,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_growth_fund_ref
    ON growth_fund_ledger(reference_type, reference_id);

COMMIT;

-- =============================================================================
-- Verification (optional):
--   SELECT executive_percentage, supervision_percentage, future_works_percentage,
--          supervision_sub_percentage, support_fund_sub_percentage
--     FROM investment_split_config WHERE effective_to IS NULL;
--   SELECT unnest(enum_range(NULL::beneficiary_role));
--   SELECT unnest(enum_range(NULL::distribution_type));
-- =============================================================================

