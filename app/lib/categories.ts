import "server-only";
import { query, queryOne } from "./db";
import type { CategoryListItem, CategoryRow } from "./types";

// -----------------------------------------------------------------------------
// Product category read/write helpers.
// Categories form a self-referential tree via parent_id. The catalog is managed
// centrally by HQ; authorization is enforced in the calling server actions.
// -----------------------------------------------------------------------------

/**
 * List every category (flat), joined with its parent's name. Ordered so that a
 * simple client-side grouping can render the tree. `sort_order` then name.
 */
export async function listCategories(): Promise<CategoryListItem[]> {
  return query<CategoryListItem>(
    `SELECT c.id,
            c.name,
            c.bn_name,
            c.parent_id,
            c.description,
            c.sort_order,
            c.is_active,
            c.created_at,
            p.name AS parent_name
       FROM product_categories c
       LEFT JOIN product_categories p ON p.id = c.parent_id
      ORDER BY COALESCE(p.name, c.name) ASC, c.sort_order ASC, c.name ASC`
  );
}

/** Only active categories, for product-form dropdowns (top-level first). */
export async function listActiveCategories(): Promise<CategoryListItem[]> {
  return query<CategoryListItem>(
    `SELECT c.id,
            c.name,
            c.bn_name,
            c.parent_id,
            c.description,
            c.sort_order,
            c.is_active,
            c.created_at,
            p.name AS parent_name
       FROM product_categories c
       LEFT JOIN product_categories p ON p.id = c.parent_id
      WHERE c.is_active = TRUE
      ORDER BY COALESCE(p.name, c.name) ASC, c.sort_order ASC, c.name ASC`
  );
}

/** Fetch a single category by id. */
export async function getCategory(id: string): Promise<CategoryRow | null> {
  return queryOne<CategoryRow>(
    `SELECT id, name, bn_name, parent_id, description, sort_order, is_active, created_at
       FROM product_categories
      WHERE id = $1`,
    [id]
  );
}

export interface CategoryInput {
  name: string;
  bn_name: string | null;
  parent_id: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

/** Insert a new category. Returns the new id. */
export async function createCategory(input: CategoryInput): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO product_categories
        (name, bn_name, parent_id, description, sort_order, is_active)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [
      input.name,
      input.bn_name,
      input.parent_id,
      input.description,
      input.sort_order,
      input.is_active,
    ]
  );
  return row!.id;
}

/** Update an existing category. */
export async function updateCategory(
  id: string,
  input: CategoryInput
): Promise<void> {
  await query(
    `UPDATE product_categories
        SET name = $1,
            bn_name = $2,
            parent_id = $3,
            description = $4,
            sort_order = $5,
            is_active = $6
      WHERE id = $7`,
    [
      input.name,
      input.bn_name,
      input.parent_id,
      input.description,
      input.sort_order,
      input.is_active,
      id,
    ]
  );
}
