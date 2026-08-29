-- =============================================================================
-- Dealer Network Management System — Combined Schema
-- Target: PLAIN PostgreSQL 18 (NOT Supabase)
-- File 01 of 03: run this FIRST.
--
-- Notes:
--   * No Supabase-specific features (no auth schema, no RLS, no storage).
--   * Auth is handled by the app layer; users table stores a password_hash.
--   * UUID primary keys use gen_random_uuid() (provided by pgcrypto).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. ENUM TYPES
-- =============================================================================
CREATE TYPE package_type AS ENUM ('standard', 'premium');
CREATE TYPE representative_status AS ENUM ('applied', 'approved', 'active', 'suspended', 'terminated', 'resigned');
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'bkash', 'nagad', 'rocket', 'check', 'other_dfs');
CREATE TYPE fee_type AS ENUM ('monthly_software', 'contract_renewal', 'other');
CREATE TYPE movement_type AS ENUM ('stock_in', 'stock_out', 'sale', 'return', 'adjustment');
CREATE TYPE customer_type AS ENUM ('retail', 'institutional', 'government');
CREATE TYPE product_type AS ENUM ('hardware', 'software', 'service');
CREATE TYPE disciplinary_action_type AS ENUM ('written_warning', 'suspension', 'termination');
CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE contract_status AS ENUM ('draft', 'pending_signature', 'active', 'expired', 'terminated', 'renewed');
CREATE TYPE order_type AS ENUM ('warehouse_order', 'customer_sale');
CREATE TYPE deposit_type AS ENUM ('investment_refundable', 'investment_non_refundable', 'onboarding_fee');
CREATE TYPE bank_account_type AS ENUM ('savings', 'current', 'other');
CREATE TYPE beneficiary_role AS ENUM ('representative', 'district_head', 'divisional_head', 'hq');
CREATE TYPE distribution_type AS ENUM ('profit_share', 'investment_return');
CREATE TYPE project_status AS ENUM ('draft', 'in_progress', 'completed', 'profit_distributed', 'cancelled');
CREATE TYPE payout_schedule AS ENUM ('monthly', 'annual');

-- =============================================================================
-- 2. GEOGRAPHY TABLES
-- =============================================================================

-- DIVISIONS (8 divisions of Bangladesh)
CREATE TABLE divisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    bn_name         VARCHAR(200) NOT NULL,
    code            VARCHAR(10) UNIQUE NOT NULL,
    head_user_id    UUID,  -- FK to users (HQ-appointed divisional head), added after users table
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- DISTRICTS (64 districts)
CREATE TABLE districts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id     UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
    name            VARCHAR(100) NOT NULL,
    bn_name         VARCHAR(200) NOT NULL,
    code            VARCHAR(10) UNIQUE NOT NULL,
    is_sadar        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_districts_division_id ON districts(division_id);

-- UPAZILAS (495+ upazilas)
CREATE TABLE upazilas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id     UUID NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    name            VARCHAR(100) NOT NULL,
    bn_name         VARCHAR(200) NOT NULL,
    code            VARCHAR(10) UNIQUE NOT NULL,
    is_sadar        BOOLEAN DEFAULT FALSE,
    population      INTEGER,
    area_sq_km      DECIMAL(10,2),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_upazilas_district_id ON upazilas(district_id);

-- =============================================================================
-- 3. USERS & ROLES TABLES (with Bank + Nominee info)
-- =============================================================================

-- USERS — auth handled at app layer (password_hash), no Supabase auth.users FK
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_hash       VARCHAR(255),
    full_name           VARCHAR(200) NOT NULL,
    phone               VARCHAR(20) UNIQUE NOT NULL,
    personal_email      VARCHAR(255),
    official_email      VARCHAR(255) UNIQUE,  -- Company-provided email
    nid_number          VARCHAR(20) UNIQUE,
    father_name         VARCHAR(200),
    mother_name         VARCHAR(200),
    date_of_birth       DATE,
    address             TEXT,
    avatar_url          TEXT,
    -- Bank Information
    bank_name           VARCHAR(150),
    bank_account_no     VARCHAR(50),
    bank_account_type   bank_account_type,
    bank_branch         VARCHAR(150),
    bank_routing_no     VARCHAR(50),
    mobile_banking_no   VARCHAR(20),
    -- Nominee Information
    nominee_name        VARCHAR(200),
    nominee_nid         VARCHAR(20),
    nominee_phone       VARCHAR(20),
    nominee_address     TEXT,
    nominee_relation    VARCHAR(50),
    -- Status
    status              VARCHAR(20) DEFAULT 'active',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ROLES
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) UNIQUE NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    description     TEXT,
    level           INTEGER NOT NULL,  -- 1=super_admin, 2=hq, 3=division, 4=district, 5=upazila
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- PERMISSIONS
CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) UNIQUE NOT NULL,
    display_name    VARCHAR(200) NOT NULL,
    description     TEXT,
    module          VARCHAR(50) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ROLE_PERMISSIONS
CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- USER_ROLES (supports dual-role: e.g., sadar rep is both upazila_representative and district_head)
CREATE TABLE user_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    -- Scope: which division/district/upazila this role applies to
    scope_division_id UUID REFERENCES divisions(id),
    scope_district_id UUID REFERENCES districts(id),
    scope_upazila_id  UUID REFERENCES upazilas(id),
    assigned_at     TIMESTAMPTZ DEFAULT NOW(),
    assigned_by     UUID REFERENCES users(id),
    UNIQUE(user_id, role_id)
);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Add FK from divisions.head_user_id now that users exists
ALTER TABLE divisions ADD CONSTRAINT fk_division_head
    FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================================================
-- 4. PACKAGES, REPRESENTATIVES, CONTRACTS, DEPOSITS
-- =============================================================================

-- PACKAGES (Standard / Premium) — all amounts configurable
CREATE TABLE packages (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    package_type NOT NULL UNIQUE,
    display_name            VARCHAR(50) NOT NULL,
    investment_amount       DECIMAL(12,2) NOT NULL,      -- e.g., 100000 for standard
    refundable_amount       DECIMAL(12,2) NOT NULL,      -- e.g., 70000 (70%)
    non_refundable_amount   DECIMAL(12,2) NOT NULL,      -- e.g., 30000 (30%)
    onboarding_fee          DECIMAL(12,2) NOT NULL DEFAULT 0,  -- e.g., 25000 (training+software)
    includes_laptop         BOOLEAN DEFAULT FALSE,
    investment_units        DECIMAL(6,2) NOT NULL DEFAULT 1,   -- 1 for standard, proportional for premium
    monthly_maintenance_fee DECIMAL(10,2) DEFAULT 0,     -- e.g., 500-1000
    benefits                JSONB NOT NULL DEFAULT '{}',
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_refund_split CHECK (refundable_amount + non_refundable_amount = investment_amount)
);

-- REPRESENTATIVES
CREATE TABLE representatives (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    upazila_id          UUID UNIQUE NOT NULL REFERENCES upazilas(id) ON DELETE RESTRICT,
    package_id          UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    status              representative_status NOT NULL DEFAULT 'applied',
    join_date           DATE,
    termination_date    DATE,
    -- Investment tracking
    investment_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,   -- actual amount invested (100000 or premium)
    investment_units    DECIMAL(6,2) NOT NULL DEFAULT 1,    -- amount / 100000
    refundable_balance  DECIMAL(12,2) NOT NULL DEFAULT 0,   -- how much is still refundable
    security_refunded   BOOLEAN DEFAULT FALSE,
    -- Laptop tracking
    laptop_provided     BOOLEAN DEFAULT FALSE,
    laptop_serial_no    VARCHAR(100),
    laptop_provided_date DATE,
    -- Dual role flag
    is_district_head    BOOLEAN DEFAULT FALSE,  -- TRUE if this is a sadar upazila rep
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_representatives_upazila_id ON representatives(upazila_id);
CREATE INDEX idx_representatives_status ON representatives(status);

-- CONTRACTS (3-year term with renewal fee)
CREATE TABLE contracts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_id   UUID NOT NULL REFERENCES representatives(id) ON DELETE RESTRICT,
    contract_number     VARCHAR(50) UNIQUE NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,  -- start_date + 3 years
    term_years          INTEGER NOT NULL DEFAULT 3,
    renewal_fee         DECIMAL(12,2) DEFAULT 0,  -- small renewal fee (configurable)
    terms               JSONB DEFAULT '{}',
    status              contract_status NOT NULL DEFAULT 'draft',
    signed_document_url TEXT,
    signed_at           TIMESTAMPTZ,
    renewed_from        UUID REFERENCES contracts(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_contracts_representative_id ON contracts(representative_id);

-- DEPOSITS (investment components + onboarding fee)
CREATE TABLE deposits (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_id   UUID NOT NULL REFERENCES representatives(id) ON DELETE RESTRICT,
    type                deposit_type NOT NULL,
    amount              DECIMAL(12,2) NOT NULL,
    is_refundable       BOOLEAN NOT NULL DEFAULT FALSE,
    payment_date        DATE NOT NULL,
    payment_method      payment_method NOT NULL,
    reference_no        VARCHAR(100) NOT NULL,
    receipt_url         TEXT,
    verified            BOOLEAN DEFAULT FALSE,
    verified_by         UUID REFERENCES users(id),
    verified_at         TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_deposits_representative_id ON deposits(representative_id);

-- =============================================================================
-- 5. PRODUCTS & CENTRAL WAREHOUSE INVENTORY
-- =============================================================================

-- PRODUCT CATEGORIES
CREATE TABLE product_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    bn_name         VARCHAR(200),
    parent_id       UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    description     TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    name            VARCHAR(200) NOT NULL,
    bn_name         VARCHAR(300),
    sku             VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    cost_price      DECIMAL(12,2) NOT NULL,
    retail_price    DECIMAL(12,2) NOT NULL,
    wholesale_price DECIMAL(12,2),
    type            product_type NOT NULL,
    unit            VARCHAR(20) DEFAULT 'piece',
    warranty_months INTEGER DEFAULT 0,
    images          JSONB DEFAULT '[]',
    specifications  JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT TRUE,
    min_stock_alert INTEGER DEFAULT 5,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);

-- CENTRAL WAREHOUSE INVENTORY (products stocked at Dhaka HQ)
CREATE TABLE central_warehouse_inventory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved        INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),  -- reserved for pending orders
    last_updated    TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY MOVEMENTS (audit trail for all stock changes)
CREATE TABLE inventory_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id),
    movement_type   movement_type NOT NULL,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    to_representative_id UUID REFERENCES representatives(id),  -- for supply/orders
    reference_no    VARCHAR(100),
    reference_type  VARCHAR(30),  -- 'order', 'restock', 'adjustment'
    reference_id    UUID,
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);

-- =============================================================================
-- 6. CUSTOMERS, ORDERS
-- =============================================================================

-- CUSTOMERS
CREATE TABLE customers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_id   UUID NOT NULL REFERENCES representatives(id),
    name                VARCHAR(200) NOT NULL,
    phone               VARCHAR(20),
    email               VARCHAR(255),
    address             TEXT,
    type                customer_type NOT NULL DEFAULT 'retail',
    organization_name   VARCHAR(200),
    upazila_id          UUID REFERENCES upazilas(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_representative_id ON customers(representative_id);

-- ORDERS (warehouse orders from reps + customer sales)
CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_id   UUID NOT NULL REFERENCES representatives(id),
    order_number        VARCHAR(50) UNIQUE NOT NULL,
    order_type          order_type NOT NULL,
    customer_id         UUID REFERENCES customers(id),
    order_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status              order_status NOT NULL DEFAULT 'pending',
    total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount     DECIMAL(12,2) DEFAULT 0,
    net_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    expected_delivery   DATE,  -- 1-2 days from order
    notes               TEXT,
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_representative_id ON orders(representative_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ORDER ITEMS
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      DECIMAL(12,2) NOT NULL,
    cost_price      DECIMAL(12,2) NOT NULL,
    subtotal        DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ORDER STATUS HISTORY
CREATE TABLE order_status_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status      order_status,
    new_status      order_status NOT NULL,
    changed_by      UUID NOT NULL REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

-- =============================================================================
-- 7. PROJECTS, PROFIT & INVESTMENT DISTRIBUTION (CORE FINANCIAL LOGIC)
-- =============================================================================

-- PROFIT DISTRIBUTION CONFIG (configurable percentages, versioned by date)
CREATE TABLE profit_distribution_config (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_percentage   DECIMAL(5,2) NOT NULL DEFAULT 20,  -- 20%
    hq_percentage               DECIMAL(5,2) NOT NULL DEFAULT 40,  -- 40%
    investment_percentage       DECIMAL(5,2) NOT NULL DEFAULT 40,  -- 40%
    effective_from              DATE NOT NULL,
    effective_to                DATE,
    created_by                  UUID REFERENCES users(id),
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_percentages CHECK (representative_percentage + hq_percentage + investment_percentage = 100)
);

-- INVESTMENT POOL CONFIG (configurable per-unit amount)
CREATE TABLE investment_pool_config (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    per_unit_amount         DECIMAL(12,2) NOT NULL DEFAULT 100000,  -- 1,00,000 = 1 unit
    total_working_capital   DECIMAL(16,2) DEFAULT 0,  -- sum of all investments
    effective_from          DATE NOT NULL,
    effective_to            DATE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECTS (each business deal/project that generates profit)
CREATE TABLE projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number      VARCHAR(50) UNIQUE NOT NULL,
    representative_id   UUID NOT NULL REFERENCES representatives(id),  -- the dealer who did the project
    upazila_id          UUID NOT NULL REFERENCES upazilas(id),
    customer_id         UUID REFERENCES customers(id),
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    -- Financials (example: 30,00,000 project)
    project_value       DECIMAL(14,2) NOT NULL,          -- 3000000 (total project/contract value)
    vat_tax_percentage  DECIMAL(5,2) DEFAULT 15,
    vat_tax_amount      DECIMAL(14,2) NOT NULL,          -- 450000 (15%)
    total_cost          DECIMAL(14,2) NOT NULL,          -- 2250000 (goods + expenses)
    net_profit          DECIMAL(14,2) NOT NULL,          -- 300000 (project_value - vat_tax - total_cost)
    -- Profit split (snapshot of config at time of calculation)
    rep_share_amount        DECIMAL(14,2) NOT NULL DEFAULT 0,   -- 60000 (20%)
    hq_share_amount         DECIMAL(14,2) NOT NULL DEFAULT 0,   -- 120000 (40%)
    investment_share_amount DECIMAL(14,2) NOT NULL DEFAULT 0,   -- 120000 (40%)
    -- Investment return per unit for THIS project
    -- = investment_share_amount / total_cost * per_unit_amount
    investment_return_per_unit DECIMAL(14,4) DEFAULT 0,  -- e.g., 5333.33
    status              project_status NOT NULL DEFAULT 'draft',
    completed_date      DATE,
    profit_year         INTEGER,  -- for annual investment payout grouping
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_projects_representative ON projects(representative_id);
CREATE INDEX idx_projects_upazila ON projects(upazila_id);
CREATE INDEX idx_projects_status ON projects(status);

-- PROJECT DISTRIBUTIONS (who gets what from each project)
CREATE TABLE project_distributions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    beneficiary_user_id UUID REFERENCES users(id),         -- NULL for HQ pool
    beneficiary_rep_id  UUID REFERENCES representatives(id),
    beneficiary_role    beneficiary_role NOT NULL,
    distribution_type   distribution_type NOT NULL,        -- 'profit_share' or 'investment_return'
    units               DECIMAL(6,2) DEFAULT 0,            -- investment units (0 for pure profit share)
    rate_or_percentage  DECIMAL(14,4),                     -- % for profit, per-unit amount for investment
    amount              DECIMAL(14,2) NOT NULL,
    payout_schedule     payout_schedule NOT NULL,          -- 'monthly' for profit, 'annual' for investment
    payout_year         INTEGER,
    payout_month        INTEGER,
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
    paid_date           DATE,
    payout_reference    VARCHAR(100),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_project_dist_project ON project_distributions(project_id);
CREATE INDEX idx_project_dist_user ON project_distributions(beneficiary_user_id);
CREATE INDEX idx_project_dist_status ON project_distributions(status);

-- =============================================================================
-- 8. FEES, PAYMENTS, FINANCIAL LEDGER
-- =============================================================================

-- FEE SCHEDULES (configurable)
CREATE TABLE fee_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_type        fee_type NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    description     TEXT,
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- FEE INVOICES
CREATE TABLE fee_invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_id   UUID NOT NULL REFERENCES representatives(id),
    fee_type            fee_type NOT NULL,
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    amount              DECIMAL(12,2) NOT NULL,
    due_date            DATE NOT NULL,
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
    paid_date           DATE,
    payment_reference   VARCHAR(100),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_fee_invoices_representative ON fee_invoices(representative_id);

-- PAYMENTS
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_id   UUID NOT NULL REFERENCES representatives(id),
    payment_type        VARCHAR(30) NOT NULL,  -- 'deposit', 'fee', 'order_payment', 'renewal', 'other'
    amount              DECIMAL(12,2) NOT NULL,
    payment_date        DATE NOT NULL,
    payment_method      payment_method NOT NULL,
    reference_no        VARCHAR(100) NOT NULL,
    related_invoice_id  UUID REFERENCES fee_invoices(id),
    verified            BOOLEAN DEFAULT FALSE,
    verified_by         UUID REFERENCES users(id),
    verified_at         TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payments_representative ON payments(representative_id);

-- FINANCIAL LEDGER (complete transaction history per representative)
CREATE TABLE financial_ledger (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_id   UUID NOT NULL REFERENCES representatives(id),
    transaction_date    DATE NOT NULL,
    transaction_type    VARCHAR(50) NOT NULL,
    description         TEXT NOT NULL,
    debit               DECIMAL(14,2) DEFAULT 0,
    credit              DECIMAL(14,2) DEFAULT 0,
    balance             DECIMAL(14,2) NOT NULL,
    reference_type      VARCHAR(30),
    reference_id        UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_financial_ledger_representative ON financial_ledger(representative_id);

-- =============================================================================
-- 9. DOCUMENTS & DOCUMENT CATEGORIES
-- =============================================================================

-- DOCUMENT CATEGORIES
CREATE TABLE document_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    bn_name         VARCHAR(200),
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- DOCUMENTS (all soft-copy documents, any type)
CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         UUID NOT NULL REFERENCES document_categories(id),
    -- Polymorphic linking: a document can relate to a rep, project, order, customer, etc.
    related_type        VARCHAR(30),  -- 'representative', 'project', 'order', 'customer', 'user'
    related_id          UUID,
    representative_id   UUID REFERENCES representatives(id),
    project_id          UUID REFERENCES projects(id),
    title               VARCHAR(200) NOT NULL,
    file_url            TEXT NOT NULL,
    file_size           INTEGER,
    mime_type           VARCHAR(100),
    document_number     VARCHAR(100),  -- e.g., bill no, work order no
    document_date       DATE,
    amount              DECIMAL(14,2),  -- for financial docs (bill, quotation, etc.)
    verified            BOOLEAN DEFAULT FALSE,
    verified_by         UUID REFERENCES users(id),
    verified_at         TIMESTAMPTZ,
    expiry_date         DATE,
    tags                JSONB DEFAULT '[]',
    notes               TEXT,
    uploaded_by         UUID REFERENCES users(id),
    uploaded_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_related ON documents(related_type, related_id);
CREATE INDEX idx_documents_representative ON documents(representative_id);
CREATE INDEX idx_documents_project ON documents(project_id);

-- =============================================================================
-- 10. COMPLIANCE & AUDIT
-- =============================================================================

-- AUDIT LOG (immutable)
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(20) NOT NULL,
    table_name      VARCHAR(100) NOT NULL,
    record_id       UUID NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);

-- DISCIPLINARY RECORDS
CREATE TABLE disciplinary_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_id   UUID NOT NULL REFERENCES representatives(id),
    action_type         disciplinary_action_type NOT NULL,
    reason              TEXT NOT NULL,
    evidence_urls       JSONB DEFAULT '[]',
    issued_by           UUID NOT NULL REFERENCES users(id),
    issued_date         DATE NOT NULL,
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    resolved            BOOLEAN DEFAULT FALSE,
    resolved_date       DATE,
    resolution_notes    TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_disciplinary_representative ON disciplinary_records(representative_id);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    type            VARCHAR(30) NOT NULL,
    action_url      TEXT,
    read            BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;

-- COMPLAINTS
CREATE TABLE complaints (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_number    VARCHAR(50) UNIQUE NOT NULL,
    complainant_type    VARCHAR(20) NOT NULL,
    complainant_id      UUID,
    complainant_name    VARCHAR(200),
    complainant_phone   VARCHAR(20),
    subject             VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL,
    category            VARCHAR(50),
    priority            VARCHAR(10) DEFAULT 'medium',
    status              complaint_status NOT NULL DEFAULT 'open',
    assigned_to         UUID REFERENCES users(id),
    resolved_date       TIMESTAMPTZ,
    resolution_notes    TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_complaints_status ON complaints(status);

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
