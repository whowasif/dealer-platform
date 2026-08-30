"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { getRepresentativeIdByUser } from "@/lib/representatives";
import {
  createWarehouseOrder,
  createCustomerSale,
  transitionOrderStatus,
  getOrder,
  canViewOrder,
  type OrderItemInput,
} from "@/lib/orders";
import { getCustomer, canAccessCustomer } from "@/lib/customers";

// -----------------------------------------------------------------------------
// Server actions for orders. Every action re-checks authorization server-side.
// Line items arrive as a JSON string in the `items` field, built by the client
// line-item editor. Stock side-effects live in lib/orders.ts (transactional).
// -----------------------------------------------------------------------------

export interface ActionState {
  error?: string;
  success?: string;
  orderId?: string;
}

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

// A single line item as posted by the client editor.
const itemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().min(0),
});

/** Parse and validate the JSON items payload into OrderItemInput[]. */
function parseItems(raw: FormDataEntryValue | null): OrderItemInput[] | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = z.array(itemSchema).min(1).safeParse(data);
  if (!parsed.success) return null;
  return parsed.data.map((i) => ({
    product_id: i.product_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }));
}

// --------------------------- Warehouse orders --------------------------------

export async function createWarehouseOrderAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const repId = await getRepresentativeIdByUser(actor.id);
  if (!repId) {
    return { error: "Only representatives can place warehouse orders." };
  }

  const items = parseItems(formData.get("items"));
  if (!items) {
    return { error: "Add at least one valid line item." };
  }
  const notes = (optionalText.parse(formData.get("notes") ?? "") as string | null) ?? null;

  let orderId: string;
  try {
    orderId = await createWarehouseOrder(repId, items, notes, actor.id);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not place order.";
    return { error: msg };
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return { success: "Order placed. Awaiting HQ approval.", orderId };
}

// ----------------------------- Customer sales --------------------------------

export async function createCustomerSaleAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const repId = await getRepresentativeIdByUser(actor.id);
  if (!repId) {
    return { error: "Only representatives can record customer sales." };
  }

  const customerId = String(formData.get("customer_id") ?? "");
  if (!customerId) return { error: "Select a customer." };

  // Confirm the customer belongs to this representative.
  const customer = await getCustomer(customerId);
  if (!customer || customer.representative_id !== repId) {
    return { error: "That customer is not one of yours." };
  }

  const items = parseItems(formData.get("items"));
  if (!items) {
    return { error: "Add at least one valid line item." };
  }

  const discountRaw = Number(formData.get("discount") ?? 0);
  const discount = Number.isFinite(discountRaw) && discountRaw > 0 ? discountRaw : 0;
  const notes = (optionalText.parse(formData.get("notes") ?? "") as string | null) ?? null;

  let orderId: string;
  try {
    orderId = await createCustomerSale(repId, customerId, items, discount, notes, actor.id);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not record sale.";
    return { error: msg };
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/customers/${customerId}`);
  return { success: "Customer sale recorded.", orderId };
}

// --------------------------- Status transitions ------------------------------

const transitionSchema = z.object({
  order_id: z.string().uuid(),
  next_status: z.enum([
    "approved",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ]),
  notes: optionalText,
});

export async function transitionOrderAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const parsed = transitionSchema.safeParse({
    order_id: formData.get("order_id"),
    next_status: formData.get("next_status"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Invalid status change request." };
  const { order_id, next_status, notes } = parsed.data;

  // View scope must be satisfied before any change is attempted.
  const order = await getOrder(order_id);
  if (!order) return { error: "Order not found." };
  if (!canViewOrder(actor, order)) {
    return { error: "You are not authorized to change this order." };
  }

  try {
    await transitionOrderStatus(order_id, next_status, actor, notes ?? null);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not update order.";
    return { error: msg };
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${order_id}`);
  return { success: `Order status updated to "${next_status}".` };
}
