import "server-only";
import { query, queryOne, withTransaction } from "./db";
import { isHQ, hasRole } from "./rbac";
import type {
  MovementListItem,
  MovementType,
  SessionUser,
  StockRow,
} from "./types";

// -----------------------------------------------------------------------------
// Central warehouse inventory helpers.
//
// The single Dhaka HQ warehouse is represented by central_warehouse_inventory
// (one row per product). Every stock change is written atomically together with
// an inventory_movements row for the audit trail (created_by = current user).
//
// The schema stores movement quantity as a positive integer (CHECK > 0); the
// DIRECTION of the change is implied by movement_type:
//   stock_in / return / adjustment(+)  -> add to quantity
//   adjustment(-) / stock_out / sale   -> subtract from quantity
// This module supports the HQ-facing manual movements: stock_in, return, and
// adjustment (which may correct up or down). Order fulfilment (sale/stock_out)
// lands in Task 5.
// -----------------------------------------------------------------------------

// ------------------------------ Authorization --------------------------------

/**
 * True if the user may create/edit products and adjust central stock.
 * HQ-level AND one of super_admin / hq_admin / hq_operations. hq_finance and
 * every other role can view the catalog but cannot manage it.
 */
export function canManageCatalog(user: SessionUser): boolean {
  return (
    isHQ(user) &&
    (hasRole(user, "super_admin") ||
      hasRole(user, "hq_admin") ||
      hasRole(user, "hq_operations"))
  );
}

// -------------------------------- Reads --------------------------------------

/** Fetch the central stock row for a product (null if none). */
export async function getStock(productId: string): Promise<StockRow | null> {
  return queryOne<StockRow>(
    `SELECT id, product_id, quantity, reserved, last_updated
       FROM central_warehouse_inventory
      WHERE product_id = $1`,
    [productId]
  );
}

const MOVEMENT_SELECT = `
  SELECT m.id,
         m.product_id,
         p.name AS product_name,
         p.sku  AS product_sku,
         m.movement_type,
         m.quantity,
         m.to_representative_id,
         m.reference_no,
         m.reference_type,
         m.reference_id,
         m.notes,
         m.created_by,
         u.full_name AS created_by_name,
         m.created_at
    FROM inventory_movements m
    JOIN products p ON p.id = m.product_id
    JOIN users u    ON u.id = m.created_by`;

/** List movements for a single product, newest first (optionally limited). */
export async function listMovements(
  productId: string,
  limit = 50
): Promise<MovementListItem[]> {
  return query<MovementListItem>(
    `${MOVEMENT_SELECT}
      WHERE m.product_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2`,
    [productId, limit]
  );
}

/** List movements across all products, newest first (for a global ledger). */
export async function listAllMovements(
  limit = 100
): Promise<MovementListItem[]> {
  return query<MovementListItem>(
    `${MOVEMENT_SELECT}
      ORDER BY m.created_at DESC
      LIMIT $1`,
    [limit]
  );
}

// ------------------------------- Mutations -----------------------------------

/** Movement types that HQ can record manually from the product stock panel. */
export type ManualMovementType = Extract<
  MovementType,
  "stock_in" | "return" | "adjustment"
>;

export interface AdjustStockInput {
  productId: string;
  movementType: ManualMovementType;
  /** Positive magnitude entered by the user (schema requires quantity > 0). */
  quantity: number;
  /**
   * For `adjustment` only: the direction of the correction. "increase" adds,
   * "decrease" removes. Ignored for stock_in / return (always additive).
   */
  adjustDirection?: "increase" | "decrease";
  referenceNo: string | null;
  notes: string | null;
  createdBy: string; // user id
}

/**
 * Apply a manual stock movement to the central warehouse and record the audit
 * trail row, all in one transaction. Guards against a negative resulting
 * quantity. Throws on invalid input so callers can surface a friendly error.
 */
export async function adjustStock(input: AdjustStockInput): Promise<void> {
  const { productId, movementType, quantity, referenceNo, notes, createdBy } =
    input;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a whole number greater than 0.");
  }

  // Determine the signed delta applied to central quantity.
  let delta: number;
  if (movementType === "adjustment") {
    delta = input.adjustDirection === "decrease" ? -quantity : quantity;
  } else {
    // stock_in and return both add stock back to the warehouse.
    delta = quantity;
  }

  await withTransaction(async (client) => {
    // Lock the inventory row so concurrent movements can't race the check.
    const stock = await client.query<{ quantity: number; reserved: number }>(
      `SELECT quantity, reserved
         FROM central_warehouse_inventory
        WHERE product_id = $1
        FOR UPDATE`,
      [productId]
    );
    if (stock.rowCount === 0) {
      throw new Error("This product has no central warehouse record.");
    }
    const current = stock.rows[0]!;
    const nextQuantity = current.quantity + delta;
    if (nextQuantity < 0) {
      throw new Error(
        `Not enough stock. Current quantity is ${current.quantity}.`
      );
    }
    if (nextQuantity < current.reserved) {
      throw new Error(
        `Cannot reduce below reserved quantity (${current.reserved} reserved).`
      );
    }

    await client.query(
      `UPDATE central_warehouse_inventory
          SET quantity = $1, last_updated = NOW()
        WHERE product_id = $2`,
      [nextQuantity, productId]
    );

    // reference_type mirrors the movement for the audit trail vocabulary.
    const referenceType =
      movementType === "stock_in"
        ? "restock"
        : movementType === "return"
          ? "return"
          : "adjustment";

    await client.query(
      `INSERT INTO inventory_movements
          (product_id, movement_type, quantity, reference_no, reference_type, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        productId,
        movementType,
        quantity, // stored positive; direction is in movement_type
        referenceNo,
        referenceType,
        notes,
        createdBy,
      ]
    );
  });
}
