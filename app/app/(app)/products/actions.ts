"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { canManageCatalog, adjustStock } from "@/lib/inventory";
import {
  createProduct,
  updateProduct,
  getProduct,
  type ProductInput,
} from "@/lib/products";
import {
  createCategory,
  updateCategory,
  type CategoryInput,
} from "@/lib/categories";

// -----------------------------------------------------------------------------
// Server actions for the product catalog & central warehouse.
// Every action re-checks authorization server-side (canManageCatalog) — the UI
// hiding is defense-in-depth, not the enforcement point.
// -----------------------------------------------------------------------------

export interface ActionState {
  error?: string;
  success?: string;
}

// ------------------------------- Products ------------------------------------

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  bn_name: optionalText,
  sku: z.string().trim().min(1, "SKU is required"),
  category_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  type: z.enum(["hardware", "software", "service"]),
  description: optionalText,
  cost_price: z.coerce.number().min(0, "Cost price cannot be negative"),
  retail_price: z.coerce.number().min(0, "Retail price cannot be negative"),
  wholesale_price: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
  unit: z.string().trim().min(1).default("piece"),
  warranty_months: z.coerce.number().int().min(0).default(0),
  min_stock_alert: z.coerce.number().int().min(0).default(5),
  images: optionalText,
  is_active: z.coerce.boolean().default(true),
});

/** Parse the comma/newline separated image URL list into a clean array. */
function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function toProductInput(d: z.infer<typeof productSchema>): ProductInput {
  return {
    category_id: d.category_id ?? null,
    name: d.name,
    bn_name: d.bn_name ?? null,
    sku: d.sku,
    description: d.description ?? null,
    cost_price: d.cost_price,
    retail_price: d.retail_price,
    wholesale_price: d.wholesale_price,
    type: d.type,
    unit: d.unit,
    warranty_months: d.warranty_months,
    images: parseImages(d.images),
    is_active: d.is_active,
    min_stock_alert: d.min_stock_alert,
  };
}

function readProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    bn_name: formData.get("bn_name"),
    sku: formData.get("sku"),
    category_id: formData.get("category_id"),
    type: formData.get("type"),
    description: formData.get("description"),
    cost_price: formData.get("cost_price"),
    retail_price: formData.get("retail_price"),
    wholesale_price: formData.get("wholesale_price") ?? "",
    unit: formData.get("unit") || "piece",
    warranty_months: formData.get("warranty_months") || 0,
    min_stock_alert: formData.get("min_stock_alert") || 5,
    images: formData.get("images"),
    is_active: formData.get("is_active") === "on",
  });
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!canManageCatalog(actor)) {
    return { error: "You are not authorized to manage the catalog." };
  }

  const parsed = readProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  let newId: string;
  try {
    newId = await createProduct(toProductInput(parsed.data));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("products_sku_key")) {
      return { error: "That SKU is already in use. Choose a unique SKU." };
    }
    return { error: "Could not create product. Please try again." };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${newId}`);
  return { success: "Product created." };
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!canManageCatalog(actor)) {
    return { error: "You are not authorized to manage the catalog." };
  }

  const id = String(formData.get("product_id") ?? "");
  if (!id) return { error: "Missing product id." };

  const existing = await getProduct(id);
  if (!existing) return { error: "Product not found." };

  const parsed = readProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  try {
    await updateProduct(id, toProductInput(parsed.data));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("products_sku_key")) {
      return { error: "That SKU is already in use. Choose a unique SKU." };
    }
    return { error: "Could not update product. Please try again." };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { success: "Product updated." };
}

// -------------------------------- Stock --------------------------------------

const stockSchema = z.object({
  product_id: z.string().uuid(),
  movement_type: z.enum(["stock_in", "return", "adjustment"]),
  adjust_direction: z.enum(["increase", "decrease"]).optional(),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
  reference_no: optionalText,
  notes: optionalText,
});

export async function adjustStockAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!canManageCatalog(actor)) {
    return { error: "You are not authorized to adjust stock." };
  }

  const parsed = stockSchema.safeParse({
    product_id: formData.get("product_id"),
    movement_type: formData.get("movement_type"),
    adjust_direction: formData.get("adjust_direction") || undefined,
    quantity: formData.get("quantity"),
    reference_no: formData.get("reference_no"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const product = await getProduct(d.product_id);
  if (!product) return { error: "Product not found." };

  try {
    await adjustStock({
      productId: d.product_id,
      movementType: d.movement_type,
      quantity: d.quantity,
      adjustDirection: d.adjust_direction,
      referenceNo: d.reference_no ?? null,
      notes: d.notes ?? null,
      createdBy: actor.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not record movement.";
    return { error: msg };
  }

  revalidatePath(`/products/${d.product_id}`);
  revalidatePath("/products");
  return { success: "Stock movement recorded." };
}

// ------------------------------ Categories -----------------------------------

const categorySchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Category name is required"),
  bn_name: optionalText,
  parent_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  description: optionalText,
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.boolean().default(true),
});

function toCategoryInput(d: z.infer<typeof categorySchema>): CategoryInput {
  return {
    name: d.name,
    bn_name: d.bn_name ?? null,
    parent_id: d.parent_id ?? null,
    description: d.description ?? null,
    sort_order: d.sort_order,
    is_active: d.is_active,
  };
}

export async function saveCategoryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!canManageCatalog(actor)) {
    return { error: "You are not authorized to manage categories." };
  }

  const parsed = categorySchema.safeParse({
    category_id: formData.get("category_id") || undefined,
    name: formData.get("name"),
    bn_name: formData.get("bn_name"),
    parent_id: formData.get("parent_id"),
    description: formData.get("description"),
    sort_order: formData.get("sort_order") || 0,
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  // A category cannot be its own parent.
  if (d.category_id && d.parent_id && d.category_id === d.parent_id) {
    return { error: "A category cannot be its own parent." };
  }

  try {
    if (d.category_id) {
      await updateCategory(d.category_id, toCategoryInput(d));
    } else {
      await createCategory(toCategoryInput(d));
    }
  } catch {
    return { error: "Could not save category. Please try again." };
  }

  revalidatePath("/products/categories");
  revalidatePath("/products");
  return { success: d.category_id ? "Category updated." : "Category created." };
}
