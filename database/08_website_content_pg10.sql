-- =============================================================================
-- Dealer Network Management System â€” Migration 08: Public website content
-- Target: PLAIN PostgreSQL 18
--
-- Adds super-admin-managed content for the public marketing website (the
-- separate "website" Next.js app) plus an inbox for its contact form:
--
--   * website_insight_cards    â€” the "Insights & Opportunity" cards
--                                 (photo + title + date label + excerpt).
--   * website_network_cards    â€” the horizontal "Our Network" filmstrip cards
--                                 (photo + title + caption + accent colour).
--   * website_contact_messages â€” messages submitted through the site's contact
--                                 form, viewable from the management app.
--
-- All tables are ADDITIVE and self-contained (no changes to existing tables).
-- Seed rows mirror the current hard-coded content in website/lib/content.ts so
-- nothing on the live site changes until an admin edits it. Run this ONCE in
-- pgAdmin against the dealer_platform database. Safe to re-run (IF NOT EXISTS
-- + idempotent seeds keyed on sort_order).
-- =============================================================================

BEGIN;

-- Ensure public.gen_uuid_v4() is available (pgcrypto). No-op if already installed.
-- pgcrypto not needed: gen_uuid_v4() defined in 01_schema_pg10.sql

-- ---------------------------------------------------------------------------
-- 1. Insights & Opportunity cards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_insight_cards (
    id          UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    title       VARCHAR(200)  NOT NULL,
    date_label  VARCHAR(60)   NOT NULL DEFAULT '',   -- free text e.g. "Jan 15, 2026"
    image_url   TEXT          NOT NULL,              -- '/uploads/..' or external URL
    excerpt     TEXT          NOT NULL,
    sort_order  INTEGER       NOT NULL DEFAULT 0,
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by  UUID          REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_website_insight_cards_order
    ON website_insight_cards(sort_order) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- 2. Our Network filmstrip cards (horizontal photos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_network_cards (
    id           UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    title        VARCHAR(200) NOT NULL,
    caption      VARCHAR(300) NOT NULL DEFAULT '',
    image_url    TEXT         NOT NULL,              -- '/uploads/..' or external URL
    accent_color VARCHAR(20)  NOT NULL DEFAULT '#F9D616', -- hex used for overlay
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by   UUID         REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_website_network_cards_order
    ON website_network_cards(sort_order) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- 3. Contact-form messages (inbox)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_contact_messages (
    id            UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    full_name     VARCHAR(160) NOT NULL,
    business_name VARCHAR(200),
    email         VARCHAR(200) NOT NULL,
    mobile        VARCHAR(40)  NOT NULL,
    details       TEXT,
    is_read       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    read_at       TIMESTAMPTZ,
    read_by       UUID         REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_website_contact_messages_created
    ON website_contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_contact_messages_unread
    ON website_contact_messages(created_at DESC) WHERE is_read = FALSE;

-- ---------------------------------------------------------------------------
-- Seed the insight cards from the current static content (idempotent on
-- sort_order â€” re-running will not create duplicates).
-- ---------------------------------------------------------------------------
INSERT INTO website_insight_cards (title, date_label, image_url, excerpt, sort_order)
SELECT * FROM (
    VALUES
    (
      'Closing Bangladesh''s Digital Gap, One Upazila at a Time',
      'Jan 15, 2026',
      'https://picsum.photos/seed/mis-crowd/1000/1250',
      'Reliable technology is no longer optional for local businesses. MIS Solution brings dependable products, fair pricing, and real support to communities that big-city vendors overlook â€” putting a trusted technology partner within reach of every upazila.',
      1
    ),
    (
      'Everything Technology, Under One National Brand',
      'Dec 04, 2025',
      'https://picsum.photos/seed/mis-it/1000/1250',
      'Digital services, business hardware, and dependable maintenance usually mean juggling many vendors. MIS Solution unifies all three under one accountable brand, so homes, shops, offices and institutions deal with a single trusted partner from purchase to after-sales support.',
      2
    ),
    (
      'Why a Nationwide Standard Beats the Old Way',
      'Nov 18, 2025',
      'https://picsum.photos/seed/mis-map/1000/1250',
      'The traditional route means uneven prices, unclear warranties, and long waits for stock and repairs. A single national standard â€” uniform pricing, central stock, fast delivery, and end-to-end accountability â€” delivers a fairer, faster experience to every corner of the country.',
      3
    )
) AS seed(title, date_label, image_url, excerpt, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM website_insight_cards w WHERE w.sort_order = seed.sort_order
);

-- ---------------------------------------------------------------------------
-- Seed the network cards from the current static content.
-- ---------------------------------------------------------------------------
INSERT INTO website_network_cards (title, caption, image_url, accent_color, sort_order)
SELECT * FROM (
    VALUES
    ('Rooted Locally',          'A trusted point of contact in every upazila',        'https://picsum.photos/seed/mis-people/1000/1250',     '#F9D616', 1),
    ('Modern Technology',       'Products & software for real needs',                 'https://picsum.photos/seed/mis-it/1000/1250',         '#a8ecd8', 2),
    ('Support You Can Reach',   'Installation, repair & maintenance close to you',    'https://picsum.photos/seed/mis-support/1000/1250',    '#bcd4ff', 3),
    ('Enterprise Grade',        'Networks, servers & security built to last',         'https://picsum.photos/seed/mis-server/1000/1250',     '#F9D616', 4),
    ('Fast Delivery',           'From central stock in 1â€“2 days, anywhere in BD',     'https://picsum.photos/seed/mis-delivery/1000/1250',   '#a8ecd8', 5),
    ('For Every Bangladeshi',   'Homes, businesses & institutions across the country','https://picsum.photos/seed/mis-shopkeeper/1000/1250', '#bcd4ff', 6),
    ('Nationwide Reach',        '495+ upazilas Â· 64 districts Â· 8 divisions',         'https://picsum.photos/seed/mis-map/1000/1250',        '#F9D616', 7)
) AS seed(title, caption, image_url, accent_color, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM website_network_cards w WHERE w.sort_order = seed.sort_order
);

COMMIT;

-- =============================================================================
-- Verification (optional):
--   SELECT sort_order, title FROM website_insight_cards ORDER BY sort_order;
--   SELECT sort_order, title FROM website_network_cards ORDER BY sort_order;
--   SELECT count(*) FROM website_contact_messages;
-- =============================================================================

