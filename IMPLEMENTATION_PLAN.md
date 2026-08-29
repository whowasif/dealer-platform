# Implementation Plan — Core Platform System
## Dealer/Representative Network Management System
### [Company Name] — A Subsidiary of Mis Solution

**Document Version:** 2.0  
**Date:** August 25, 2026  
**Status:** Approved (Revised)  

---

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Requirements](#requirements)
3. [Tech Stack](#tech-stack)
4. [System Architecture Diagram](#system-architecture-diagram)
5. [Organizational Hierarchy](#organizational-hierarchy)
6. [Package Structure](#package-structure)
7. [Database Entity-Relationship Diagram](#database-entity-relationship-diagram)
8. [Detailed Database Schema](#detailed-database-schema)
9. [Profit-Sharing & Investment Return Model](#profit-sharing--investment-return-model)
10. [User Role Hierarchy & Access Matrix](#user-role-hierarchy--access-matrix)
11. [Task Breakdown](#task-breakdown)
12. [Phases & Timeline](#phases--timeline)
13. [Hosting Recommendation](#hosting-recommendation)
14. [Next Steps](#next-steps)

---

## Problem Statement

Build a centrally-controlled platform that manages an ICT product & service distribution network across all 495+ upazilas of Bangladesh, handling representative onboarding, hierarchical profit-sharing with an investment-return model, inventory, orders, financial auditing, compliance, and reporting.

**Business Context:**
- 8 Divisions -> 64 Districts -> 495+ Upazilas
- One representative (dealer) per upazila
- Each dealer invests ৳1,00,000 (one-time) forming the shared working capital
- 495 x ৳1,00,000 = ৳4,95,00,000+ working capital pool
- Products stocked centrally at Dhaka HQ, supplied within 1-2 days
- ICT products: Hardware, Software, Services
- Three-way profit sharing: Representative 20%, HQ 40%, Investment pool 40%

---

## Requirements

### Functional Requirements
- Multi-tier organizational hierarchy (HQ -> Division -> District -> Upazila)
- Divisional heads are HQ-appointed officials (non-investing)
- District heads are Sadar Upazila representatives (investing dealers)
- Package-based onboarding (Standard / Premium) with refundable + non-refundable components
- Free laptop provision tracked per dealer
- Product catalog (hardware, software, services) stocked centrally at Dhaka HQ
- Order management with central warehouse fulfillment (1-2 day delivery)
- Three-way profit calculation (Representative / HQ / Investment)
- Investment-return distribution per project (paid annually)
- Configurable percentages & amounts (never hardcoded)
- Contract management (3-year term with renewal fee)
- Fee management (monthly software maintenance + renewal fees)
- Complete document management (technical specs, quotations, work orders, bills, chalan, pay orders, money receipts, NID copies, photos)
- Audit trail for all financial transactions
- Role-based access control
- Reporting (weekly/monthly/annual sales, inventory, financial, investment returns)
- Disciplinary tracking and compliance
- Notifications and communications (real-time)
- Complaint management system

### Non-Functional Requirements
- Support 500+ concurrent users
- 99.9% uptime
- Data encryption at rest and in transit
- Mobile-responsive web interface
- Offline capability for mobile app (sync when online)
- Bangla language support
- Audit-proof financial records (immutable logs)
- All financial rates/percentages stored as configurable data, not code

---

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Database** | PostgreSQL (Supabase) | Robust, ACID-compliant, JSONB support, Row-Level Security for RBAC |
| **Backend** | Supabase (Auth + Edge Functions + Realtime + Storage) | Managed, auto-scaling, built-in auth, real-time subscriptions |
| **Frontend (Web)** | Next.js 14+ (React, TypeScript) | Server-side rendering, API routes, fast, SEO-friendly |
| **Frontend (Mobile)** | React Native with Expo (Phase 2) | Code sharing with web team, single codebase for iOS/Android |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development, consistent UI components |
| **State Management** | TanStack Query (React Query) | Server state caching, auto-refetch, optimistic updates |
| **Charts** | Recharts | Composable, React-native compatible |
| **PDF/Export** | @react-pdf/renderer + xlsx | Report generation |
| **Language** | TypeScript (everywhere) | Type safety, fewer runtime bugs |
| **Testing** | Vitest + Playwright | Unit + E2E testing |

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────────┐          ┌──────────────────────────┐            │
│   │   Next.js Web App    │          │  React Native Mobile App │            │
│   │   (HQ, Division,     │          │  (Field Representatives) │            │
│   │    District, Rep)     │          │                          │            │
│   └──────────┬───────────┘          └────────────┬─────────────┘            │
│              │                                    │                          │
└──────────────┼────────────────────────────────────┼──────────────────────────┘
               │              HTTPS                 │
               ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE PLATFORM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐   │
│   │    Auth      │  │   Realtime   │  │   Storage   │  │ Edge Functions │   │
│   │  (JWT +     │  │ (WebSocket   │  │ (Documents, │  │ (CRON jobs,    │   │
│   │   RBAC)     │  │  Subscriptions│  │  Images,    │  │  Webhooks,     │   │
│   │             │  │  for live     │  │  Receipts)  │  │  Profit &      │   │
│   │             │  │  notifications│  │             │  │  Investment    │   │
│   │             │  │               │  │             │  │  Calculator)   │   │
│   └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └───────┬────────┘   │
│          │                 │                  │                 │            │
│          ▼                 ▼                  ▼                 ▼            │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     PostgreSQL Database                              │   │
│   │                  (with Row-Level Security)                           │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │                                                                      │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐   │   │
│   │  │ Geography │ │ Users &   │ │ Products  │ │ Finance, Profit & │   │   │
│   │  │ Tables    │ │ Roles     │ │ & Orders  │ │ Investment        │   │   │
│   │  └───────────┘ └───────────┘ └───────────┘ └───────────────────┘   │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐   │   │
│   │  │ Reps &    │ │ Central   │ │ Reporting │ │ Documents, Audit  │   │   │
│   │  │ Contracts │ │ Warehouse │ │ Views     │ │ & Compliance      │   │   │
│   │  └───────────┘ └───────────┘ └───────────┘ └───────────────────┘   │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Organizational Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REVISED ORGANIZATIONAL HIERARCHY                        │
└─────────────────────────────────────────────────────────────────────────────┘

Level 1:  ┌──────────────────────────────────────────────────────┐
          │              HQ (Central Office, Dhaka)                │
          │  - Controls EVERYTHING                                 │
          │  - Central product warehouse (1-2 day supply)          │
          │  - Roles: super_admin, hq_admin, hq_finance,          │
          │           hq_operations                                │
          └──────────────────────┬───────────────────────────────┘
                                 │  HQ officials manage divisions
                                 ▼
Level 2:  ┌──────────────────────────────────────────────────────┐
          │        DIVISIONAL HEADS (8 total)                      │
          │  *** APPOINTED HQ OFFICIALS — NOT dealers ***          │
          │  - Did NOT invest ৳1L                                  │
          │  - Receive investment-return portion for effort/work   │
          │  - District heads are accountable to them              │
          └──────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
Level 3:  ┌──────────────────────────────────────────────────────┐
          │        DISTRICT HEADS (64 total)                       │
          │  = Sadar Upazila Representative (an investing dealer)  │
          │  - Invested ৳1L (or premium amount)                    │
          │  - Controls the whole district                         │
          │  - Upazila reps are accountable to them                │
          └──────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
Level 4:  ┌──────────────────────────────────────────────────────┐
          │      UPAZILA REPRESENTATIVES (495+ total)              │
          │  = Investing dealers (৳1L each)                        │
          │  - Accountable to their District Head                  │
          │  - Also directly report key info to HQ                 │
          └──────────────────────────────────────────────────────┘

KEY POINTS:
- Sadar Upazila Rep = District Head (same person, investing dealer)
- Divisional Head = separate HQ-appointed official (NON-investing)
- Everyone ultimately accountable to HQ
```

---

## Package Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PACKAGE STRUCTURE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

╔══════════════════════════════════════════════════════════════════════════╗
║  STANDARD PACKAGE                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  Investment Component: ৳1,00,000 (one-time)                               ║
║    ├─ 70% = ৳70,000  → REFUNDABLE (security deposit)                       ║
║    └─ 30% = ৳30,000  → NON-REFUNDABLE                                      ║
║                                                                            ║
║  Onboarding Fee: ৳25,000 (NON-REFUNDABLE)                                 ║
║    └─ Covers: training fee + initial software purchase + other fees        ║
║                                                                            ║
║  Included FREE: 1x Laptop (for dealer's work)                             ║
║                                                                            ║
║  Recurring: Monthly software maintenance fee (৳500 - ৳1,000)              ║
║                                                                            ║
║  Investment Units: 1 (invested ৳1L = 1 unit for return calc)             ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════╗
║  PREMIUM PACKAGE                                                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  Investment Component: (subject to discussion, e.g., ৳5,00,000)           ║
║    └─ Higher investment = proportionally higher investment return          ║
║       (৳5L invested = 5 units = 5x the per-unit investment return)         ║
║                                                                            ║
║  Other benefits: subject to discussion                                     ║
║                                                                            ║
║  Investment Units: proportional (invested ÷ ৳1,00,000)                    ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════╝

NOTE: All amounts, percentages, and fees are CONFIGURABLE and can be
      modified at any time by HQ. They are stored in config tables,
      NOT hardcoded in the application.
```

---

## Database Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ENTITY-RELATIONSHIP DIAGRAM                             │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │  divisions   │
                    │──────────────│
                    │ id (PK)      │
                    │ name         │
                    │ code         │
                    │ head_user_id │──── FK (HQ-appointed divisional head)
                    └──────┬───────┘
                           │ 1:N
                           ▼
                    ┌──────────────┐
                    │  districts   │
                    │──────────────│
                    │ id (PK)      │
                    │ division_id  │──── FK
                    │ name         │
                    │ is_sadar     │
                    └──────┬───────┘
                           │ 1:N
                           ▼
                    ┌──────────────┐         ┌──────────────────────┐
                    │  upazilas    │         │    packages           │
                    │──────────────│         │──────────────────────│
                    │ id (PK)      │         │ id (PK)              │
                    │ district_id  │── FK    │ name                 │
                    │ name         │         │ investment_amount    │
                    │ is_sadar     │         │ refundable_amount    │
                    └──────┬───────┘         │ non_refundable_amount│
                           │                 │ onboarding_fee       │
                           │                 │ includes_laptop      │
                           │                 │ investment_units     │
                           │                 │ benefits (JSONB)     │
                           │                 └──────────┬───────────┘
                           ▼                            │
┌──────────────────┐  ┌────────────────────┐           │
│  users           │  │  representatives   │◄──────────┘
│──────────────────│  │────────────────────│
│ id (PK)          │◄─│ user_id (FK)       │
│ auth_id          │  │ upazila_id (FK)    │──── FK to upazilas
│ full_name        │  │ package_id (FK)    │──── FK to packages
│ phone            │  │ status             │
│ personal_email   │  │ join_date          │
│ official_email   │  │ investment_amount  │
│ nid_number       │  │ investment_units   │
│ + bank info      │  │ laptop_serial_no   │
│ + nominee info   │  │ is_district_head   │
│ address          │  │ security_refunded  │
└────┬─────────────┘  └──┬───┬───┬───┬─────┘
     │                   │   │   │   │
     ▼                   │   │   │   └──────────────────────────┐
┌──────────┐             │   │   │                              │
│user_roles│             │   │   ▼                              ▼
│──────────│             │   │  ┌──────────────────┐  ┌──────────────────────┐
│ user_id  │── FK        │   │  │   contracts      │  │     deposits         │
│ role_id  │── FK        │   │  │──────────────────│  │──────────────────────│
└──────────┘             │   │  │ id (PK)          │  │ id (PK)              │
                         │   │  │ representative_id│  │ representative_id    │
┌──────────┐             │   │  │ start_date       │  │ type                 │
│  roles   │             │   │  │ end_date (3 yrs) │  │ amount               │
│──────────│             │   │  │ renewal_fee      │  │ is_refundable        │
│ id (PK)  │             │   │  │ status           │  │ payment_method       │
│ name     │             │   │  │ signed_doc_url   │  │ reference_no         │
│ level    │             │   │  └──────────────────┘  └──────────────────────┘
└──────────┘             │   │
                         ▼   ▼
              ┌──────────────────────┐          ┌─────────────────────┐
              │  representative_     │          │      orders         │
              │  inventory (optional)│          │─────────────────────│
              └──────────────────────┘          │ id (PK)             │
                                                │ representative_id   │── FK
                    ┌──────────────────┐        │ order_type          │
                    │ central_warehouse│        │ status              │
                    │ _inventory       │        │ total_amount        │
                    │──────────────────│        └──────────┬──────────┘
                    │ product_id (FK)  │                   │ 1:N
                    │ quantity         │                   ▼
                    └────────┬─────────┘        ┌─────────────────────┐
                             │                  │    order_items      │
                             ▼                  │─────────────────────│
                    ┌──────────────────┐        │ product_id (FK)     │
                    │    products      │◄───────│ order_id (FK)       │
                    │──────────────────│        │ quantity            │
                    │ id (PK)          │        │ unit_price          │
                    │ category_id (FK) │        │ subtotal            │
                    │ name, sku        │        └─────────────────────┘
                    │ cost_price       │
                    │ retail_price     │
                    │ type             │
                    └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                  PROJECTS, PROFIT & INVESTMENT TABLES                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐         ┌──────────────────────────────┐          │
│  │      projects        │         │  profit_distribution_config   │          │
│  │──────────────────────│         │──────────────────────────────│          │
│  │ id (PK)              │         │ representative_percentage     │          │
│  │ representative_id    │── FK    │ hq_percentage                 │          │
│  │ upazila_id (FK)      │         │ investment_percentage         │          │
│  │ project_value        │         │ effective_from / to           │          │
│  │ vat_tax_amount       │         └──────────────────────────────┘          │
│  │ total_cost           │                                                    │
│  │ net_profit           │         ┌──────────────────────────────┐          │
│  │ rep_share (20%)      │         │  investment_pool_config       │          │
│  │ hq_share (40%)       │         │──────────────────────────────│          │
│  │ investment_share(40%)│         │ per_unit_amount (৳1,00,000)  │          │
│  │ status               │         │ total_working_capital         │          │
│  └──────────┬───────────┘         └──────────────────────────────┘          │
│             │ 1:N                                                            │
│             ▼                                                                │
│  ┌──────────────────────────────────┐                                       │
│  │  project_distributions            │                                       │
│  │──────────────────────────────────│                                       │
│  │ id (PK)                          │                                       │
│  │ project_id (FK)                  │                                       │
│  │ beneficiary_user_id (FK)         │                                       │
│  │ beneficiary_role  (rep/dist/div/hq)│                                     │
│  │ distribution_type (profit/invest)│                                       │
│  │ units (investment units)         │                                       │
│  │ amount                           │                                       │
│  │ payout_schedule (monthly/annual) │                                       │
│  │ status                           │                                       │
│  └──────────────────────────────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│              FEES, PAYMENTS, LEDGER, DOCUMENTS & COMPLIANCE                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌─────────────┐ ┌────────────────┐ ┌───────────────────┐  │
│  │ fee_invoices │ │  payments   │ │financial_ledger│ │    documents      │  │
│  │ fee_schedules│ │             │ │                │ │ document_categories│ │
│  └──────────────┘ └─────────────┘ └────────────────┘ └───────────────────┘  │
│  ┌──────────────┐ ┌─────────────┐ ┌────────────────┐ ┌───────────────────┐  │
│  │  audit_log   │ │disciplinary_│ │ notifications  │ │    complaints     │  │
│  │              │ │  records    │ │                │ │                   │  │
│  └──────────────┘ └─────────────┘ └────────────────┘ └───────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Database Schema

### 1. Enum Types

```sql
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
```

### 2. Geography Tables

```sql
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
```

### 3. Users & Roles Tables (with Bank + Nominee info)

```sql
-- USERS (extends Supabase auth.users) — with bank info, official email, nominee
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id             UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Add FK from divisions.head_user_id now that users exists
ALTER TABLE divisions ADD CONSTRAINT fk_division_head
    FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;

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
```

### 4. Packages, Representatives, Contracts, Deposits

```sql
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
```

### 5. Products & Central Warehouse Inventory

```sql
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
```

### 6. Customers, Orders

```sql
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
```

### 7. Projects, Profit & Investment Distribution (CORE FINANCIAL LOGIC)

```sql
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
    per_unit_amount         DECIMAL(12,2) NOT NULL DEFAULT 100000,  -- ৳1,00,000 = 1 unit
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
-- For each completed project, rows are generated for:
--   1. Representative: profit_share (20%) + investment_return (their units)
--   2. District Head: investment_return (their units)  [if different from rep]
--   3. Divisional Head: investment_return (1 unit, for effort — did not invest)
--   4. HQ: profit_share (40%) + remaining investment
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
```

### 8. Fees, Payments, Financial Ledger

```sql
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
```

### 9. Documents & Document Categories

```sql
-- DOCUMENT CATEGORIES (extensible: technical specs, quotations, work orders, etc.)
CREATE TABLE document_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    bn_name         VARCHAR(200),
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- Seed categories: technical_specification, quotation, work_order, bill,
--                  chalan, pay_order, money_receipt, nid_card_copy, photo,
--                  contract, trade_license, other

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
```

### 10. Compliance & Audit

```sql
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
```

---

## Profit-Sharing & Investment Return Model

### The Three-Way Split (per project)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  PROFIT SPLIT — WORKED EXAMPLE                                │
│                  (all percentages/amounts CONFIGURABLE)                       │
└─────────────────────────────────────────────────────────────────────────────┘

PROJECT FINANCIALS:
  Project Value ................................ ৳30,00,000
  VAT + Tax (15%) .............................. ৳ 4,50,000
  Total Cost (goods + expenses) ................ ৳22,50,000
  ─────────────────────────────────────────────────────────
  NET PROFIT ................................... ৳ 3,00,000


STEP 1 — Split Net Profit 3 ways:
─────────────────────────────────
  ┌────────────────────────────────────────────────────────┐
  │ Representative (Dealer)  20%  =  ৳60,000                │
  │ HQ                       40%  =  ৳1,20,000              │
  │ Investment Pool          40%  =  ৳1,20,000              │
  └────────────────────────────────────────────────────────┘


STEP 2 — Distribute the Investment Pool (৳1,20,000):
────────────────────────────────────────────────────
  Investment return PER UNIT (per ৳1,00,000 invested) for THIS project:
  
    = (Investment Pool ÷ Total Cost) × Per-Unit Amount
    = (৳1,20,000 ÷ ৳22,50,000) × ৳1,00,000
    = 0.05333 × ৳1,00,000
    = ৳5,333  per ৳1,00,000 invested

  Distributed to THREE parties (only those connected to the project):

  ┌────────────────────────────────────────────────────────────────────┐
  │ 1. MAIN DEALER (did the project)                                    │
  │    - Invested ৳1L (1 unit) → gets ৳5,333                            │
  │    - Premium invested ৳5L (5 units) → gets ৳26,666                  │
  │    - THIS IS ON TOP of their 20% profit share (৳60,000)            │
  ├────────────────────────────────────────────────────────────────────┤
  │ 2. DISTRICT HEAD (sadar upazila rep of that district)               │
  │    - Invested ৳1L (1 unit) → gets ৳5,333                            │
  │    - (scales with their actual investment units)                    │
  ├────────────────────────────────────────────────────────────────────┤
  │ 3. DIVISIONAL HEAD (HQ-appointed official, did NOT invest)          │
  │    - Gets 1 unit's worth → ৳5,333                                   │
  │    - This is for their EFFORT & hard work (not for investment)      │
  ├────────────────────────────────────────────────────────────────────┤
  │ 4. HQ gets the REMAINDER of the investment pool                     │
  │    = ৳1,20,000 − (3 × ৳5,333) = ৳1,20,000 − ৳16,000 = ৳1,04,000    │
  └────────────────────────────────────────────────────────────────────┘


STEP 3 — Total HQ take for this project:
─────────────────────────────────────────
  HQ profit share (40%) ........... ৳1,20,000
  + Investment pool remainder ..... ৳1,04,000
  ─────────────────────────────────────────
  HQ TOTAL ........................ ৳2,24,000


┌─────────────────────────────────────────────────────────────────────────────┐
│                        SPECIAL CASE                                          │
│         When the project is in a SADAR UPAZILA (dealer = district head)      │
└─────────────────────────────────────────────────────────────────────────────┘

  The SAME person is both the "main dealer" AND the "district head".
  They receive:
    - 20% profit share (৳60,000)                    [as representative]
    - Investment return for being MAIN DEALER        [1 portion]
    - Investment return for being DISTRICT HEAD      [1 portion]
    (= TWO investment portions, scaled by their units)

  The Divisional Head STILL gets their portion.
  HQ gets the remainder.


┌─────────────────────────────────────────────────────────────────────────────┐
│                       PAYOUT SCHEDULE                                        │
└─────────────────────────────────────────────────────────────────────────────┘

  - Profit share (20% rep share):  calculated per project, paid MONTHLY
  - Investment return (40% pool):  calculated per project, ACCUMULATED,
                                   and paid ANNUALLY (end of year)
  - All payouts via Bank / DFS (no cash)
  - TDS and other lawful deductions applied before payout
```

### Calculation Formula Reference

```
investment_return_per_unit  =  (investment_share_amount / total_cost) * per_unit_amount

For any beneficiary:
    their_investment_return  =  investment_return_per_unit * their_investment_units

Where:
    - investment_share_amount = net_profit × investment_percentage (default 40%)
    - per_unit_amount         = ৳1,00,000 (configurable)
    - their_investment_units  = their_actual_investment ÷ per_unit_amount
      (Standard = 1 unit; Premium ৳5L = 5 units; Divisional Head = 1 unit fixed, for effort)

HQ investment remainder = investment_share_amount − sum(all beneficiary investment returns)
```

---

## User Role Hierarchy & Access Matrix

```
ACCESS MATRIX:
┌────────────────────────┬───────┬──────────┬──────────┬──────────┬────────┐
│ Feature/Module         │ Super │ HQ Admin │ Div Head │ Dist Head│ Rep    │
│                        │ Admin │          │ (HQ off.)│(Sadar Rep)│        │
├────────────────────────┼───────┼──────────┼──────────┼──────────┼────────┤
│ System Configuration   │  ✓    │    ✓     │    ✗     │    ✗     │   ✗    │
│ Profit/Invest Config   │  ✓    │    ✓     │    ✗     │    ✗     │   ✗    │
│ User Management        │  ✓    │    ✓     │    ✗     │    ✗     │   ✗    │
│ All Representatives    │  ✓    │    ✓     │ Division │ District │  Self  │
│ Projects (create)      │  ✗    │    ✗     │    ✓     │    ✓     │   ✓    │
│ Projects (view)        │  ✓    │    ✓     │ Division │ District │  Self  │
│ Approve Payouts        │  ✓    │    ✓     │    ✗     │    ✗     │   ✗    │
│ Approve Orders         │  ✓    │    ✓     │    ✗     │    ✗     │   ✗    │
│ Place Orders (to HQ)   │  ✗    │    ✗     │    ✓     │    ✓     │   ✓    │
│ Central Warehouse      │  ✓    │    ✓     │  View    │  View    │   ✗    │
│ View Reports (National)│  ✓    │    ✓     │    ✗     │    ✗     │   ✗    │
│ View Reports (Division)│  ✓    │    ✓     │    ✓     │    ✗     │   ✗    │
│ View Reports (District)│  ✓    │    ✓     │    ✓     │    ✓     │   ✗    │
│ View Reports (Own)     │  ✓    │    ✓     │    ✓     │    ✓     │   ✓    │
│ Investment Returns     │  ✓    │    ✓     │   Own    │   Own    │  Own   │
│ Audit Logs             │  ✓    │    ✓     │    ✗     │    ✗     │   ✗    │
│ Disciplinary Actions   │  ✓    │    ✓     │    ✓     │    ✗     │   ✗    │
│ Document Upload        │  ✓    │    ✓     │    ✓     │    ✓     │   ✓    │
│ Complaint Management   │  ✓    │    ✓     │    ✓     │    ✓     │  File  │
│ Fee Management         │  ✓    │    ✓     │  View    │  View    │  View  │
└────────────────────────┴───────┴──────────┴──────────┴──────────┴────────┘

Accountability chain:
  Upazila Rep → District Head → Divisional Head → HQ
  (Sadar Upazila Rep = District Head; Divisional Head = HQ-appointed official)
```

---

## Task Breakdown

### Task 1: Project Setup & Database Foundation
**Objective:** Initialize the project, set up Supabase, create enum types and geography tables, seed Bangladesh geography.
**Test:** All 8 divisions, 64 districts, 495+ upazilas seeded with correct is_sadar flags and hierarchy.
**Demo:** Seeded database with complete Bangladesh geographic hierarchy.

---

### Task 2: Authentication & Role-Based Access Control
**Objective:** User auth with bank info, official email, nominee info; roles, permissions, dual-role support, RLS policies.
**Test:** Login as each role; verify hierarchical data access; dual-role user (sadar rep = district head) works.
**Demo:** Working login with role-based dashboards; divisional head is a non-investing HQ official.

---

### Task 3: Package, Onboarding, Contract & Deposit Management
**Objective:** Standard/Premium packages, representative onboarding, 3-year contracts with renewal fee, deposit tracking (refundable/non-refundable split), laptop tracking.
**Test:** Standard package splits ৳1L into ৳70k refundable + ৳30k non-refundable + ৳25k onboarding fee; laptop recorded; sadar rep auto-flagged as district head; premium investment units computed.
**Demo:** Full onboarding with correct deposit split and hierarchy.

---

### Task 4: Product Catalog & Central Warehouse
**Objective:** Product categories, products (hardware/software/service), central Dhaka warehouse inventory, stock movements.
**Test:** Products added with pricing; central stock managed; movement audit trail works.
**Demo:** Product catalog with central warehouse stock (supplied within 1-2 days).

---

### Task 5: Order Management System
**Objective:** Rep orders from central warehouse (1-2 day delivery), customer sales, order lifecycle, status history.
**Test:** Order placed → HQ approves → delivered within 1-2 days; central stock decreases; status history logged.
**Demo:** End-to-end order flow from rep to central warehouse fulfillment.

---

### Task 6: Projects, Profit & Investment Engine (CORE)
**Objective:** Build the project financial engine implementing the three-way split (Rep 20% / HQ 40% / Investment 40%) and per-project investment-return distribution to the 3 connected parties (main dealer, district head, divisional head), with configurable percentages.
**Implementation guidance:**
- Create profit_distribution_config, investment_pool_config, projects, project_distributions tables
- PostgreSQL function `calculate_project_distribution(project_id)`:
  - net_profit = project_value − vat_tax − total_cost
  - rep_share = net_profit × rep% ; hq_share = net_profit × hq% ; investment_share = net_profit × invest%
  - investment_return_per_unit = investment_share / total_cost × per_unit_amount
  - Generate distributions: main dealer (profit + investment units), district head (investment units), divisional head (1 unit for effort), HQ (profit share + investment remainder)
  - Handle special case: if dealer = district head, give TWO investment portions
- Profit paid monthly; investment paid annually
**Test:**
- Verify worked example: ৳30L project → rep ৳60k + ৳5,333; district head ৳5,333; divisional head ৳5,333; HQ ৳2,24,000
- Premium dealer (5 units) gets 5 × per-unit
- Sadar upazila project: dealer gets 2 investment portions
- Changing config percentages reflects in new calculations
**Demo:** Enter a project, run distribution, verify all parties get correct amounts matching the worked example.

---

### Task 7: Fee Management & Financial Ledger
**Objective:** Monthly software maintenance fees, contract renewal fees, payment recording, complete financial ledger.
**Test:** Auto-invoice generation; payment updates status; ledger running balance correct.
**Demo:** Automated fee invoicing with complete financial history.

---

### Task 8: Document Management System
**Objective:** Document categories (technical specs, quotations, work orders, bills, chalan, pay orders, money receipts, NID copies, photos — extensible), upload to Supabase Storage, link to projects/reps/orders, verification.
**Test:** Upload each document type; link to a project; verify categorization and retrieval; add a new custom category.
**Demo:** Complete document repository with all soft-copy documents, categorized and searchable.

---

### Task 9: Reporting, Analytics & Compliance
**Objective:** Role-based dashboards, aggregation views, PDF/Excel export, audit logging, disciplinary tracking, notifications, complaints.
**Test:** Aggregation correct at each level; audit log captures changes; notifications real-time; investment return reports accurate.
**Demo:** Interactive dashboards + compliance system with audit trails.

---

### Task 10: Mobile App (React Native)
**Objective:** Field app for representatives — login, dashboard, quick order/sale, project entry, inventory check, documents, notifications, offline sync.
**Test:** Same data as web; offline sale syncs; project photo upload appears in web; push notifications work.
**Demo:** Fully functional field app synced with web platform.

---

## Phases & Timeline

| Phase | Tasks | Estimated Duration | Deliverable |
|-------|-------|-------------------|-------------|
| **Phase 1: Foundation** | Tasks 1-2 | 2-3 weeks | Database + Auth + RBAC + Bank/Nominee info |
| **Phase 2: Core Business** | Tasks 3-5 | 4-5 weeks | Onboarding + Products + Central Warehouse + Orders |
| **Phase 3: Financial Engine** | Tasks 6-7 | 4-5 weeks | Profit/Investment Engine + Fees + Ledger |
| **Phase 4: Docs & Intelligence** | Tasks 8-9 | 3-4 weeks | Document Mgmt + Reporting + Compliance |
| **Phase 5: Mobile** | Task 10 | 3-4 weeks | Field app for representatives |

**Total estimated: 16-21 weeks** for a complete system.

---

## Hosting Recommendation

| Stage | Recommendation | Cost (approx.) |
|-------|---------------|------|
| Development | Supabase Free Tier | $0/month |
| Staging/Testing | Supabase Pro | $25/month |
| Production (initial) | Supabase Pro | $25/month |
| Production (scaled) | Supabase Team or Self-hosted | $100-599/month |
| Alternative | Self-hosted PostgreSQL on DigitalOcean/Hetzner VPS | $20-50/month |

**Note:** System is host-agnostic — the PostgreSQL schema works anywhere. Traditional shared hosting (Hostinger, GoDaddy) does NOT support PostgreSQL.

---

## Next Steps

1. ✅ Plan approved & revised (v2.0)
2. → Begin Task 1: Database foundation with geography seed data
3. → Then Task 2 onwards per phase plan

---

## Change Log

**v2.0 (this revision):**
- Packages changed to Standard (৳1L: 70% refundable + 30% non-refundable, + ৳25k onboarding fee, + free laptop, + monthly maintenance) and Premium (proportional investment)
- Users table: added official email, full bank info (name/no/branch/account type/routing), nominee info (name/NID/phone/address/relation)
- Added dedicated document management (document_categories + documents) for all doc types
- Revised hierarchy: Divisional Heads are HQ-appointed non-investing officials; District Head = Sadar Upazila Rep; accountability chain clarified
- Contracts changed to 3-year term with configurable renewal fee
- Products stocked centrally at Dhaka HQ, supplied within 1-2 days (removed district warehouses)
- **NEW three-way profit model:** Representative 20% / HQ 40% / Investment 40%, with per-project investment-return distribution to main dealer + district head + divisional head (scaled by investment units), remainder to HQ
- Investment return paid annually; profit share paid monthly
- All percentages and amounts are configurable (stored in config tables)
- Restructured tasks to 10 tasks reflecting new financial engine and document management

---

*Document prepared for: Core Platform System Development*  
*Organization: [Company Name] — Subsidiary of Mis Solution*  
*Version: 2.0 | Status: Approved (Revised)*
