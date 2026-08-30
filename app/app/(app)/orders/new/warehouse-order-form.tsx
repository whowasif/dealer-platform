"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createWarehouseOrderAction, type ActionState } from "../actions";
import { LineItemEditor, type EditorProduct } from "../line-item-editor";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Placing order…" : "Place order"}
    </button>
  );
}

export function WarehouseOrderForm({ products }: { products: EditorProduct[] }) {
  const [state, formAction] = useFormState(
    createWarehouseOrderAction,
    initialState
  );
  const router = useRouter();

  // On success, route to the new order's detail page.
  useEffect(() => {
    if (state.orderId) {
      router.push(`/orders/${state.orderId}`);
    }
  }, [state.orderId, router]);

  return (
    <form action={formAction} className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Products to restock
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Ordered from the central Dhaka warehouse. Unit price defaults to the
          wholesale price; you can override it. Stock is reserved only after HQ
          approves the order.
        </p>
        <LineItemEditor products={products} defaultPrice="wholesale" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Notes
          </span>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional notes for HQ"
          />
        </label>
      </section>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link
          href="/orders"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
