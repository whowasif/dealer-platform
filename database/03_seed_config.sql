-- =============================================================================
-- Dealer Network Management System — Default Configuration Seed Data
-- File 03 of 03: run this THIRD (after 01_schema.sql and 02_seed_geography.sql).
--
-- Contents:
--   * roles           (7 roles, hierarchy levels 1-5)
--   * packages        (Standard, Premium)
--   * profit_distribution_config
--   * investment_pool_config
--   * document_categories
-- =============================================================================

-- =============================================================================
-- ROLES
-- level: 1=super_admin, 2=hq, 3=division, 4=district, 5=upazila
-- =============================================================================
INSERT INTO roles (name, display_name, description, level) VALUES
    ('super_admin',            'Super Admin',            'Full system access and configuration control',        1),
    ('hq_admin',               'HQ Admin',               'Headquarters administrator',                          2),
    ('hq_finance',             'HQ Finance',             'Headquarters finance and accounts',                   2),
    ('hq_operations',          'HQ Operations',          'Headquarters operations and logistics',               2),
    ('divisional_head',        'Divisional Head',        'HQ-appointed head of a division',                     3),
    ('district_head',          'District Head',          'Sadar upazila representative acting as district head', 4),
    ('upazila_representative',  'Upazila Representative', 'Upazila-level dealer/representative',                  5);

-- =============================================================================
-- PACKAGES
-- =============================================================================
INSERT INTO packages (
    name, display_name, investment_amount, refundable_amount, non_refundable_amount,
    onboarding_fee, includes_laptop, investment_units, monthly_maintenance_fee, benefits, is_active
) VALUES
    ('standard', 'Standard Package',
        100000, 70000, 30000,
        25000, TRUE, 1, 1000,
        '{"description": "Standard dealer package with 1 investment unit"}', TRUE),
    ('premium', 'Premium Package',
        500000, 350000, 150000,
        25000, TRUE, 5, 1000,
        '{"description": "Premium dealer package with 5 investment units"}', TRUE);

-- =============================================================================
-- PROFIT DISTRIBUTION CONFIG (20% rep / 40% HQ / 40% investment)
-- =============================================================================
INSERT INTO profit_distribution_config (
    representative_percentage, hq_percentage, investment_percentage, effective_from
) VALUES
    (20, 40, 40, CURRENT_DATE);

-- =============================================================================
-- INVESTMENT POOL CONFIG (per-unit amount = 100000)
-- =============================================================================
INSERT INTO investment_pool_config (
    per_unit_amount, effective_from
) VALUES
    (100000, CURRENT_DATE);

-- =============================================================================
-- DOCUMENT CATEGORIES
-- =============================================================================
INSERT INTO document_categories (name, bn_name, description, sort_order) VALUES
    ('technical_specification', 'কারিগরি স্পেসিফিকেশন', 'Technical specification documents',    1),
    ('quotation',               'কোটেশন',              'Price quotations',                     2),
    ('work_order',              'ওয়ার্ক অর্ডার',        'Work orders',                          3),
    ('bill',                    'বিল',                 'Bills and invoices',                   4),
    ('chalan',                  'চালান',               'Delivery challans',                    5),
    ('pay_order',               'পে-অর্ডার',           'Pay orders',                           6),
    ('money_receipt',           'মানি রিসিট',          'Money receipts',                       7),
    ('nid_card_copy',           'এনআইডি কার্ড কপি',    'National ID card copies',              8),
    ('photo',                   'ছবি',                 'Photographs',                          9),
    ('contract',                'চুক্তিপত্র',           'Contracts and agreements',            10),
    ('trade_license',           'ট্রেড লাইসেন্স',       'Trade licenses',                      11),
    ('other',                   'অন্যান্য',            'Other miscellaneous documents',       12);

-- =============================================================================
-- END OF CONFIG SEED
-- =============================================================================
