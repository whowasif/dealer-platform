import "server-only";
import { query, queryOne, withTransaction } from "./db";
import type {
  ProductDetail,
  ProductListItem,
  ProductRow,
  ProductType,
} from "./types";

// -----------------------------------------------------------------------------
// Product catalog read/write helpers.
//
// Products are stocked centrally at Dhaka HQ. Each product has exactly one
// central_warehouse_inventory row (created together with the product). "Stock"
// columns are joined from that table; available = quantity - reserved.
//
// Money columns (cost/retail/wholesale price) are DECIMAL in Postgres and come
// back as strings via node-postgres — callers format/parse with Number(), the
// same convention used for deposits/representatives amounts.
// -----------------------------------------------------------------------------

const LIST_SELECT = `
  SELECT p.id,
         p.name,
         p.bn_name,
         p.sku,
         p.type,
         p.unit,
         p.cost_price,
         p.retail_price,
         p.wholesale_price,
         p.is_active,
         p.min_stock_alert,
         p.category_id,
         c.name AS category_name,
         COALESCE(inv.quantity, 0) AS quantity,
         COALESCE(inv.reserved, 0) AS reserved,
         (COALESCE(inv.quantity, 0) - COALESCE(inv.reserved, 0)) AS available
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id
    LEFT JOIN central_warehouse_inventory inv ON inv.product_id = p.id`;

export interface ProductListFilters {
  search?: string | null;
  categoryId?: string | null;
  type?: string | null;
  active?: string | null; // 'active' | 'inactive' | '' (all)
}

/** List products with category name + central stock, filtered for the UI. */
export async function listProducts(
  filters: ProductListFilters = {}
): Promise<ProductListItem[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    conditions.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx})`);
  }
  if (filters.categoryId) {
    params.push(filters.categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    conditions.push(`p.type = $${params.length}`);
  }
  if (filters.active === "active") {
    conditions.push(`p.is_active = TRUE`);
  } else if (filters.active === "inactive") {
    conditions.push(`p.is_active = FALSE`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<ProductListItem>(
    `${LIST_SELECT} ${where} ORDER BY p.name ASC`,
    params
  );
}

/** Fetch full product detail incl. category name + current central stock. */
export async function getProduct(id: string): Promise<ProductDetail | null> {
  return queryOne<ProductDetail>(
    `SELECT p.id,
            p.category_id,
            p.name,
            p.bn_name,
            p.sku,
            p.description,
            p.cost_price,
            p.retail_price,
            p.wholesale_price,
            p.type,
            p.unit,
            p.warranty_months,
            p.images,
            p.specifications,
            p.is_active,
            p.min_stock_alert,
            p.created_at,
            p.updated_at,
            c.name AS category_name,
            COALESCE(inv.quantity, 0) AS quantity,
            COALESCE(inv.reserved, 0) AS reserved,
            (COALESCE(inv.quantity, 0) - COALESCE(inv.reserved, 0)) AS available
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
       LEFT JOIN central_warehouse_inventory inv ON inv.product_id = p.id
      WHERE p.id = $1`,
    [id]
  );
}

export interface ProductInput {
  category_id: string | null;
  name: string;
  bn_name: string | null;
  sku: string;
  description: string | null;
  cost_price: number;
  retail_price: number;
  wholesale_price: number | null;
  type: ProductType;
  unit: string;
  warranty_months: number;
  images: string[];
  is_active: boolean;
  min_stock_alert: number;
}

/**
 * Create a product AND its central_warehouse_inventory row (quantity 0) inside
 * a single transaction. Returns the new product id.
 */
export async function createProduct(input: ProductInput): Promise<string> {
  return withTransaction(async (client) => {
    const result = await client.query<Pick<ProductRow, "id">>(
      `INSERT INTO products
          (category_id, name, bn_name, sku, description, cost_price,
           retail_price, wholesale_price, type, unit, warranty_months,
           images, is_active, min_stock_alert)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)
       RETURNING id`,
      [
        input.category_id,
        input.name,
        input.bn_name,
        input.sku,
        input.description,
        input.cost_price,
        input.retail_price,
        input.wholesale_price,
        input.type,
        input.unit,
        input.warranty_months,
        JSON.stringify(input.images),
        input.is_active,
        input.min_stock_alert,
      ]
    );
    const productId = result.rows[0]!.id;
    // Every product gets exactly one central warehouse row, starting empty.
    await client.query(
      `INSERT INTO central_warehouse_inventory (product_id, quantity, reserved)
       VALUES ($1, 0, 0)`,
      [productId]
    );
    return productId;
  });
}

/** Update product fields (does not touch stock). */
export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<void> {
  await query(
    `UPDATE products
        SET category_id = $1,
            name = $2,
            bn_name = $3,
            sku = $4,
            description = $5,
            cost_price = $6,
            retail_price = $7,
            wholesale_price = $8,
            type = $9,
            unit = $10,
            warranty_months = $11,
            images = $12::jsonb,
            is_active = $13,
            min_stock_alert = $14,
            updated_at = NOW()
      WHERE id = $15`,
    [
      input.category_id,
      input.name,
      input.bn_name,
      input.sku,
      input.description,
      input.cost_price,
      input.retail_price,
      input.wholesale_price,
      input.type,
      input.unit,
      input.warranty_months,
      JSON.stringify(input.images),
      input.is_active,
      input.min_stock_alert,
      id,
    ]
  );
}
