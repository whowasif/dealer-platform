import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "./db";
import { isHQ } from "./rbac";
import { repScopeForUser } from "./representatives";
import type {
  OrderDetail,
  OrderItemRow,
  OrderListItem,
  OrderStatus,
  OrderStatusHistoryItem,
  SessionUser,
} from "./types";

// -----------------------------------------------------------------------------
// Order management: warehouse orders (rep restocks from the central Dhaka
// warehouse) and customer sales (rep sells to an end customer).
//
// Stock rules (central_warehouse_inventory only — reps hold no tracked stock):
//   warehouse_order APPROVE   -> reserve stock  (reserved += qty), guard available
//   warehouse_order DELIVERED -> quantity -= qty, reserved -= qty, +stock_out movement
//   warehouse_order CANCELLED -> if it was reserved, release reservation
//   customer_sale             -> recorded as 'delivered'; does NOT touch central stock
//
// Every stock-affecting transition uses SELECT ... FOR UPDATE row locks and is
// written atomically together with an order_status_history row (mirrors the
// inventory.ts adjustStock locking approach). Money DECIMALs are strings from
// node-postgres; numeric math is done with Number().
// -----------------------------------------------------------------------------

// ------------------------------ Order numbers --------------------------------

/**
 * Generate the next order number in the form ORD-YYYY-000123. Per calendar
 * year, based on MAX of existing numbers with the current prefix. Runs inside
 * the caller's transaction; the UNIQUE constraint is the final race guard.
 */
export async function nextOrderNumber(client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const { rows } = await client.query<{ max_seq: number | null }>(
    `SELECT MAX(
              CAST(NULLIF(regexp_replace(order_number, '^ORD-\\d{4}-', ''), '') AS INTEGER)
            ) AS max_seq
       FROM orders
      WHERE order_number LIKE $1`,
    [`${prefix}%`]
  );
  const next = (rows[0]?.max_seq ?? 0) + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}

// -------------------------------- Creation -----------------------------------

export interface OrderItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
}

/** A validated product snapshot used when building order line items. */
interface PricedItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  subtotal: number;
}

/**
 * Validate the requested items against active products and snapshot the
 * current cost_price for each (for later profit calc). Throws on invalid input.
 */
async function priceItems(
  client: PoolClient,
  items: OrderItemInput[]
): Promise<PricedItem[]> {
  if (items.length === 0) {
    throw new Error("Add at least one line item.");
  }
  const priced: PricedItem[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Each line item needs a whole quantity greater than 0.");
    }
    if (!(item.unit_price >= 0)) {
      throw new Error("Unit price cannot be negative.");
    }
    const product = await client.query<{ cost_price: string; is_active: boolean }>(
      `SELECT cost_price, is_active FROM products WHERE id = $1`,
      [item.product_id]
    );
    if (product.rowCount === 0) {
      throw new Error("One of the selected products no longer exists.");
    }
    if (!product.rows[0]!.is_active) {
      throw new Error("One of the selected products is inactive.");
    }
    const costPrice = Number(product.rows[0]!.cost_price);
    const subtotal = item.quantity * item.unit_price;
    priced.push({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: costPrice,
      subtotal,
    });
  }
  return priced;
}

/** Insert order_items rows for an order. */
async function insertItems(
  client: PoolClient,
  orderId: string,
  items: PricedItem[]
): Promise<void> {
  for (const it of items) {
    await client.query(
      `INSERT INTO order_items
          (order_id, product_id, quantity, unit_price, cost_price, subtotal)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [orderId, it.product_id, it.quantity, it.unit_price, it.cost_price, it.subtotal]
    );
  }
}

/** Write an order_status_history row. */
async function writeHistory(
  client: PoolClient,
  orderId: string,
  oldStatus: OrderStatus | null,
  newStatus: OrderStatus,
  changedBy: string,
  notes: string | null
): Promise<void> {
  await client.query(
    `INSERT INTO order_status_history
        (order_id, old_status, new_status, changed_by, notes)
     VALUES ($1,$2,$3,$4,$5)`,
    [orderId, oldStatus, newStatus, changedBy, notes]
  );
}

/**
 * Create a WAREHOUSE ORDER (rep restocking from the central warehouse).
 * Status starts at 'pending'; stock is only reserved on approval. Sets an
 * expected delivery 2 days out (business rule: 1-2 day fulfilment).
 * Returns the new order id.
 */
export async function createWarehouseOrder(
  repId: string,
  items: OrderItemInput[],
  notes: string | null,
  changedBy: string
): Promise<string> {
  return withTransaction(async (client) => {
    const priced = await priceItems(client, items);
    const total = priced.reduce((sum, it) => sum + it.subtotal, 0);
    const orderNumber = await nextOrderNumber(client);

    const result = await client.query<{ id: string }>(
      `INSERT INTO orders
          (representative_id, order_number, order_type, status,
           total_amount, discount_amount, net_amount, expected_delivery, notes)
       VALUES ($1,$2,'warehouse_order','pending',$3,0,$3,
               (CURRENT_DATE + INTERVAL '2 days')::date, $4)
       RETURNING id`,
      [repId, orderNumber, total, notes]
    );
    const orderId = result.rows[0]!.id;

    await insertItems(client, orderId, priced);
    await writeHistory(client, orderId, null, "pending", changedBy, "Order placed.");
    return orderId;
  });
}

/**
 * Create a CUSTOMER SALE (rep sells to an end customer). Recorded immediately
 * as 'delivered'; does NOT touch central warehouse stock. Applies a discount to
 * compute net_amount. Returns the new order id.
 */
export async function createCustomerSale(
  repId: string,
  customerId: string,
  items: OrderItemInput[],
  discount: number,
  notes: string | null,
  changedBy: string
): Promise<string> {
  return withTransaction(async (client) => {
    const priced = await priceItems(client, items);
    const total = priced.reduce((sum, it) => sum + it.subtotal, 0);
    const discountAmount = Math.max(0, discount || 0);
    if (discountAmount > total) {
      throw new Error("Discount cannot exceed the order total.");
    }
    const net = total - discountAmount;

    // Confirm the customer belongs to this representative.
    const customer = await client.query<{ id: string }>(
      `SELECT id FROM customers WHERE id = $1 AND representative_id = $2`,
      [customerId, repId]
    );
    if (customer.rowCount === 0) {
      throw new Error("Selected customer was not found for this representative.");
    }

    const orderNumber = await nextOrderNumber(client);
    const result = await client.query<{ id: string }>(
      `INSERT INTO orders
          (representative_id, order_number, order_type, customer_id, status,
           total_amount, discount_amount, net_amount, delivered_at, notes)
       VALUES ($1,$2,'customer_sale',$3,'delivered',$4,$5,$6,NOW(),$7)
       RETURNING id`,
      [repId, orderNumber, customerId, total, discountAmount, net, notes]
    );
    const orderId = result.rows[0]!.id;

    await insertItems(client, orderId, priced);
    await writeHistory(client, orderId, null, "delivered", changedBy, "Customer sale recorded.");
    return orderId;
  });
}

// --------------------------------- Reads -------------------------------------

const LIST_SELECT = `
  SELECT o.id,
         o.order_number,
         o.order_type,
         o.status,
         o.order_date,
         o.expected_delivery,
         o.total_amount,
         o.discount_amount,
         o.net_amount,
         o.representative_id,
         ru.full_name AS representative_name,
         rep.user_id  AS rep_user_id,
         o.customer_id,
         cust.name    AS customer_name
    FROM orders o
    JOIN representatives rep ON rep.id = o.representative_id
    JOIN users ru            ON ru.id = rep.user_id
    JOIN upazilas rup        ON rup.id = rep.upazila_id
    JOIN districts rd        ON rd.id = rup.district_id
    LEFT JOIN customers cust ON cust.id = o.customer_id`;

export interface OrderListFilters {
  type?: string | null;
  status?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

/**
 * List orders visible to `user`, optionally narrowed by filters. Geographic
 * scope is always enforced server-side (self / district / division / all).
 */
export async function listOrders(
  user: SessionUser,
  filters: OrderListFilters = {}
): Promise<OrderListItem[]> {
  const scope = repScopeForUser(user);
  const conditions: string[] = [];
  const params: unknown[] = [];

  // --- enforce scope ---
  if (scope.selfOnly) {
    params.push(user.id);
    conditions.push(`rep.user_id = $${params.length}`);
  } else if (scope.divisionId) {
    params.push(scope.divisionId);
    conditions.push(`rd.division_id = $${params.length}`);
  } else if (scope.districtId) {
    params.push(scope.districtId);
    conditions.push(`rd.id = $${params.length}`);
  }

  // --- optional UI filters ---
  if (filters.type) {
    params.push(filters.type);
    conditions.push(`o.order_type = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    conditions.push(`o.order_date >= $${params.length}`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    conditions.push(`o.order_date < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<OrderListItem>(
    `${LIST_SELECT} ${where} ORDER BY o.order_date DESC`,
    params
  );
}

/** Fetch full order header detail incl. rep + customer + geography scope. */
export async function getOrder(id: string): Promise<OrderDetail | null> {
  return queryOne<OrderDetail>(
    `SELECT o.id,
            o.order_number,
            o.order_type,
            o.status,
            o.order_date,
            o.expected_delivery,
            o.total_amount,
            o.discount_amount,
            o.net_amount,
            o.notes,
            o.approved_by,
            au.full_name AS approved_by_name,
            o.approved_at,
            o.delivered_at,
            o.created_at,
            o.updated_at,
            o.representative_id,
            ru.full_name  AS representative_name,
            rep.user_id   AS rep_user_id,
            rd.division_id AS rep_division_id,
            rd.id          AS rep_district_id,
            o.customer_id,
            cust.name     AS customer_name,
            cust.phone    AS customer_phone
       FROM orders o
       JOIN representatives rep ON rep.id = o.representative_id
       JOIN users ru            ON ru.id = rep.user_id
       JOIN upazilas rup        ON rup.id = rep.upazila_id
       JOIN districts rd        ON rd.id = rup.district_id
       LEFT JOIN customers cust ON cust.id = o.customer_id
       LEFT JOIN users au       ON au.id = o.approved_by
      WHERE o.id = $1`,
    [id]
  );
}

/** List sales recorded for a specific customer, newest first. */
export async function listCustomerSales(
  customerId: string
): Promise<OrderListItem[]> {
  return query<OrderListItem>(
    `${LIST_SELECT}
      WHERE o.customer_id = $1
      ORDER BY o.order_date DESC`,
    [customerId]
  );
}

/** List the line items for an order, joined with product name/sku. */
export async function getOrderItems(orderId: string): Promise<OrderItemRow[]> {
  return query<OrderItemRow>(
    `SELECT oi.id,
            oi.order_id,
            oi.product_id,
            p.name AS product_name,
            p.sku  AS product_sku,
            oi.quantity,
            oi.unit_price,
            oi.cost_price,
            oi.subtotal
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC`,
    [orderId]
  );
}

/** List the status history for an order, oldest first (timeline). */
export async function getOrderHistory(
  orderId: string
): Promise<OrderStatusHistoryItem[]> {
  return query<OrderStatusHistoryItem>(
    `SELECT h.id,
            h.order_id,
            h.old_status,
            h.new_status,
            h.changed_by,
            u.full_name AS changed_by_name,
            h.notes,
            h.created_at
       FROM order_status_history h
       JOIN users u ON u.id = h.changed_by
      WHERE h.order_id = $1
      ORDER BY h.created_at ASC`,
    [orderId]
  );
}

// ------------------------------ Authorization --------------------------------

/** True if `user` may view the given order (scope check). */
export function canViewOrder(user: SessionUser, order: OrderDetail): boolean {
  const scope = repScopeForUser(user);
  if (scope.all) return true;
  if (scope.selfOnly) return order.rep_user_id === user.id;
  if (scope.divisionId) return order.rep_division_id === scope.divisionId;
  if (scope.districtId) return order.rep_district_id === scope.districtId;
  return false;
}

// ---------------------------- Status transitions -----------------------------

// Warehouse-order lifecycle. Customer sales are terminal at 'delivered'.
const WAREHOUSE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["approved", "cancelled"],
  approved: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

/** Statuses at which stock is considered reserved for a warehouse order. */
const RESERVED_STATUSES: OrderStatus[] = ["approved", "processing", "shipped"];

export interface TransitionResult {
  order_number: string;
}

/**
 * Transition a warehouse order to a new status, applying the stock side-effects
 * and writing an order_status_history row — all inside one transaction with row
 * locks. Authorization:
 *   - HQ may drive approval/fulfilment (approved, processing, shipped,
 *     delivered, returned) and may cancel.
 *   - A representative may cancel their OWN order only while it is 'pending'.
 * Throws with a friendly message on any rule violation.
 */
export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  user: SessionUser,
  notes: string | null
): Promise<TransitionResult> {
  return withTransaction(async (client) => {
    // Lock the order row for the duration of the transition.
    const orderRes = await client.query<{
      id: string;
      order_number: string;
      order_type: string;
      status: OrderStatus;
      representative_id: string;
      rep_user_id: string;
    }>(
      `SELECT o.id, o.order_number, o.order_type, o.status,
              o.representative_id, rep.user_id AS rep_user_id
         FROM orders o
         JOIN representatives rep ON rep.id = o.representative_id
        WHERE o.id = $1
        FOR UPDATE OF o`,
      [orderId]
    );
    if (orderRes.rowCount === 0) {
      throw new Error("Order not found.");
    }
    const order = orderRes.rows[0]!;

    if (order.order_type !== "warehouse_order") {
      throw new Error("Only warehouse orders can change status.");
    }

    const current = order.status;
    const allowed = WAREHOUSE_TRANSITIONS[current] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Cannot change status from "${current}" to "${newStatus}".`);
    }

    // --- authorization ---
    const hq = isHQ(user);
    const isOwner = order.rep_user_id === user.id;
    if (newStatus === "cancelled") {
      // HQ can cancel any live order; a rep can cancel only their own pending one.
      const repMayCancel = isOwner && current === "pending";
      if (!hq && !repMayCancel) {
        throw new Error(
          "You can only cancel your own order while it is still pending."
        );
      }
    } else {
      // approval / fulfilment / returned are HQ-only.
      if (!hq) {
        throw new Error("Only HQ can advance an order through fulfilment.");
      }
    }

    // --- stock side-effects (central warehouse only) ---
    const items = await client.query<{ product_id: string; quantity: number }>(
      `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    if (newStatus === "approved") {
      // Reserve stock: lock each product's inventory row, guard availability.
      for (const it of items.rows) {
        const stock = await client.query<{ quantity: number; reserved: number }>(
          `SELECT quantity, reserved
             FROM central_warehouse_inventory
            WHERE product_id = $1
            FOR UPDATE`,
          [it.product_id]
        );
        if (stock.rowCount === 0) {
          throw new Error("A product on this order has no warehouse record.");
        }
        const { quantity, reserved } = stock.rows[0]!;
        const available = quantity - reserved;
        if (available < it.quantity) {
          const name = await client.query<{ name: string }>(
            `SELECT name FROM products WHERE id = $1`,
            [it.product_id]
          );
          const label = name.rows[0]?.name ?? "a product";
          throw new Error(
            `Insufficient stock for ${label}: need ${it.quantity}, only ${available} available.`
          );
        }
        await client.query(
          `UPDATE central_warehouse_inventory
              SET reserved = reserved + $1, last_updated = NOW()
            WHERE product_id = $2`,
          [it.quantity, it.product_id]
        );
      }
    } else if (newStatus === "delivered") {
      // Decrement quantity AND release the reservation; record stock_out moves.
      for (const it of items.rows) {
        await client.query(
          `SELECT quantity, reserved
             FROM central_warehouse_inventory
            WHERE product_id = $1
            FOR UPDATE`,
          [it.product_id]
        );
        await client.query(
          `UPDATE central_warehouse_inventory
              SET quantity = quantity - $1,
                  reserved = GREATEST(reserved - $1, 0),
                  last_updated = NOW()
            WHERE product_id = $2`,
          [it.quantity, it.product_id]
        );
        await client.query(
          `INSERT INTO inventory_movements
              (product_id, movement_type, quantity, to_representative_id,
               reference_no, reference_type, reference_id, notes, created_by)
           VALUES ($1,'stock_out',$2,$3,$4,'order',$5,$6,$7)`,
          [
            it.product_id,
            it.quantity,
            order.representative_id,
            order.order_number,
            orderId,
            "Warehouse order delivered to representative.",
            user.id,
          ]
        );
      }
    } else if (newStatus === "cancelled") {
      // Release any reservation that was placed while the order was live.
      if (RESERVED_STATUSES.includes(current)) {
        for (const it of items.rows) {
          await client.query(
            `SELECT reserved
               FROM central_warehouse_inventory
              WHERE product_id = $1
              FOR UPDATE`,
            [it.product_id]
          );
          await client.query(
            `UPDATE central_warehouse_inventory
                SET reserved = GREATEST(reserved - $1, 0), last_updated = NOW()
              WHERE product_id = $2`,
            [it.quantity, it.product_id]
          );
        }
      }
    }

    // --- update the order header ---
    await client.query(
      `UPDATE orders
          SET status = $1,
              approved_by = CASE WHEN $2 THEN $3 ELSE approved_by END,
              approved_at = CASE WHEN $2 THEN NOW() ELSE approved_at END,
              delivered_at = CASE WHEN $4 THEN NOW() ELSE delivered_at END,
              updated_at = NOW()
        WHERE id = $5`,
      [
        newStatus,
        newStatus === "approved",
        user.id,
        newStatus === "delivered",
        orderId,
      ]
    );

    await writeHistory(client, orderId, current, newStatus, user.id, notes);
    return { order_number: order.order_number };
  });
}
