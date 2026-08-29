"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createProductAction,
  updateProductAction,
  type ActionState,
} from "./actions";
import type { CategoryListItem, ProductDetail } from "@/lib/types";

// -----------------------------------------------------------------------------
// Shared product create/edit form. `product` is null for the create flow and a
// ProductDetail for the edit flow (which routes to updateProductAction).
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending
        ? editing
          ? "Saving…"
          : "Creating…"
        : editing
          ? "Save changes"
          : "Create product"}
    </button>
  );
}

export function ProductForm({
  categories,
  product = null,
}: {
  categories: CategoryListItem[];
  product?: ProductDetail | null;
}) {
  const editing = product != null;
  const [state, formAction] = useFormState(
    editing ? updateProductAction : createProductAction,
    initialState
  );

  const imagesText = product?.images?.length ? product.images.join(", ") : "";

  return (
    <form action={formAction} className="space-y-5">
      {editing ? (
        <input type="hidden" name="product_id" value={product!.id} />
      ) : null}

      {/* Identity */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Identity
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </span>
            <input
              name="name"
              required
              defaultValue={product?.name ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Name (Bangla)
            </span>
            <input
              name="bn_name"
              defaultValue={product?.bn_name ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              SKU <span className="text-red-500">*</span>
            </span>
            <input
              name="sku"
              required
              defaultValue={product?.sku ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Category
            </span>
            <select
              name="category_id"
              defaultValue={product?.category_id ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_name ? `${c.parent_name} › ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Type <span className="text-red-500">*</span>
            </span>
            <select
              name="type"
              required
              defaultValue={product?.type ?? "hardware"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="service">Service</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Unit
            </span>
            <input
              name="unit"
              defaultValue={product?.unit ?? "piece"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </span>
            <textarea
              name="description"
              rows={3}
              defaultValue={product?.description ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Pricing (৳)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Cost price <span className="text-red-500">*</span>
            </span>
            <input
              name="cost_price"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={product ? Number(product.cost_price) : ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Retail price <span className="text-red-500">*</span>
            </span>
            <input
              name="retail_price"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={product ? Number(product.retail_price) : ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Wholesale price
            </span>
            <input
              name="wholesale_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={
                product?.wholesale_price != null
                  ? Number(product.wholesale_price)
                  : ""
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {/* Catalog settings */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Catalog settings
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Warranty (months)
            </span>
            <input
              name="warranty_months"
              type="number"
              min="0"
              defaultValue={product?.warranty_months ?? 0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Low-stock alert at
            </span>
            <input
              name="min_stock_alert"
              type="number"
              min="0"
              defaultValue={product?.min_stock_alert ?? 5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={product?.is_active ?? true}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>

          <label className="block sm:col-span-3">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Image URLs
            </span>
            <input
              name="images"
              defaultValue={imagesText}
              placeholder="https://…/a.jpg, https://…/b.jpg"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-400">
              Optional. Comma-separated URLs, stored as a JSON array.
            </span>
          </label>
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}{" "}
          <Link href="/products" className="font-semibold underline">
            View products
          </Link>
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton editing={editing} />
        <Link
          href={editing ? `/products/${product!.id}` : "/products"}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
