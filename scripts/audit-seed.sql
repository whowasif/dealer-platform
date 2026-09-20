\set ON_ERROR_STOP on
BEGIN;

-- 1. Reset all existing (test) users to a known password so each role can be exercised.
UPDATE users SET password_hash = '$2a$10$rYm47Y1huEU3S0JFTC3A9uG.lh/4bmnRxFtqOXFtrf1CSvJkg2yMC'
WHERE phone IN ('01700000000','222','333','444','555','666','777','888','999','1010','1111');

-- 2. Product catalog + central warehouse stock.
INSERT INTO product_categories (name, bn_name, description, sort_order, is_active)
VALUES ('TEST Catalog', 'টেস্ট ক্যাটালগ', 'Seeded for lifecycle verification', 1, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, bn_name, sku, description, cost_price, retail_price, wholesale_price, type, unit, warranty_months, is_active, min_stock_alert)
SELECT c.id, v.name, v.bn, v.sku, v.dsc, v.cost, v.retail, v.whole, v.typ::product_type, 'piece', v.war, TRUE, 5
FROM product_categories c,
     (VALUES
       ('TEST Laptop 14in','টেস্ট ল্যাপটপ','TST-LAP-001','Business laptop',45000::numeric,60000::numeric,52000::numeric,'hardware',12),
       ('TEST Antivirus 1yr','টেস্ট অ্যান্টিভাইরাস','TST-SW-002','Annual endpoint licence',1500::numeric,3000::numeric,2000::numeric,'software',0),
       ('TEST Network Setup','টেস্ট নেটওয়ার্ক','TST-SVC-003','On-site networking service',5000::numeric,12000::numeric,8000::numeric,'service',0)
     ) AS v(name,bn,sku,dsc,cost,retail,whole,typ,war)
WHERE c.name = 'TEST Catalog'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO central_warehouse_inventory (product_id, quantity, reserved)
SELECT p.id, v.qty, 0 FROM products p
JOIN (VALUES ('TST-LAP-001',20),('TST-SW-002',100),('TST-SVC-003',50)) AS v(sku,qty) ON v.sku = p.sku
ON CONFLICT (product_id) DO UPDATE SET quantity = EXCLUDED.quantity, reserved = 0;

-- 3. HQ executives with weights 2 / 1 / 1 (exercises the weighted exec-pool split).
INSERT INTO users (full_name, phone, official_email, status)
VALUES ('TEST CEO','01711100001','ceo@test.local','active'),
       ('TEST CFO','01711100002','cfo@test.local','active'),
       ('TEST COO','01711100003','coo@test.local','active')
ON CONFLICT (phone) DO NOTHING;

UPDATE users SET password_hash = '$2a$10$rYm47Y1huEU3S0JFTC3A9uG.lh/4bmnRxFtqOXFtrf1CSvJkg2yMC'
WHERE phone IN ('01711100001','01711100002','01711100003');

INSERT INTO hq_executives (user_id, designation, role_weight, is_ceo, is_active, notes)
SELECT u.id, v.desig, v.w, v.ceo, TRUE, 'Seeded for lifecycle verification'
FROM users u JOIN (VALUES ('01711100001','Chief Executive Officer',2.00::numeric,TRUE),
                         ('01711100002','Chief Financial Officer',1.00::numeric,FALSE),
                         ('01711100003','Chief Operating Officer',1.00::numeric,FALSE)) AS v(ph,desig,w,ceo)
  ON v.ph = u.phone
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

SELECT 'products' AS what, count(*) FROM products
UNION ALL SELECT 'inventory_rows', count(*) FROM central_warehouse_inventory
UNION ALL SELECT 'total_stock_units', COALESCE(sum(quantity),0) FROM central_warehouse_inventory
UNION ALL SELECT 'hq_executives', count(*) FROM hq_executives
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'divisions_with_head', count(*) FROM divisions WHERE head_user_id IS NOT NULL;
