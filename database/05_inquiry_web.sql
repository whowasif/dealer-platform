-- =============================================================================
-- Dealer Network Management System — Public Website Inquiries
-- File 05: run AFTER 01_schema.sql (needs divisions/districts/upazilas).
--
-- Adds ONE new table used ONLY by the standalone public website
-- (d:\Office\Dealer\website) to capture inquiry / quotation submissions from
-- visitors. It does NOT modify any existing table. The website reads the
-- geography + representatives tables read-only and only INSERTS into this one.
--
-- Safe to run more than once (guards with IF NOT EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS inquiry_web (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_number   VARCHAR(50) UNIQUE NOT NULL,   -- e.g. INQ-YYYY-000123
    full_name        VARCHAR(200) NOT NULL,
    organization     VARCHAR(200),
    email            VARCHAR(255),
    phone            VARCHAR(30) NOT NULL,
    division_id      UUID REFERENCES divisions(id),
    district_id      UUID REFERENCES districts(id),
    upazila_id       UUID REFERENCES upazilas(id),
    service_interest VARCHAR(100),                  -- hardware/software/service/networking/security/other
    subject          VARCHAR(200),
    message          TEXT NOT NULL,
    attachment_url   TEXT,                          -- relative storage key, nullable
    attachment_name  VARCHAR(255),
    attachment_size  INTEGER,
    status           VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
    ip_address       INET,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_web_created ON inquiry_web(created_at);
CREATE INDEX IF NOT EXISTS idx_inquiry_web_status ON inquiry_web(status);
