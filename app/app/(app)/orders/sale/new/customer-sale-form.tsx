"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createCustomerSaleAction, type ActionState } from "../../actions";
import { LineItemEditor, type EditorProduct } from "../../line-item-editor";

const initialState: ActionState = {};

export interface SaleCustomer {
  id: string;
  name: string;
  type: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Recording sale…" : "Record sale"}
    </button>
  );
}

export function CustomerSaleForm({
  products,
  customers,
}: {
  products: EditorProduct[];
  customers: SaleCustomer[];
}) {
  const [state, formAction] = useFormState(
    createCustomerSaleAction,
    initialState
  );
  const router = useRouter();

  useEffect(() => {
    if (state.orderId) {
      router.push(`/orders/${state.orderId}`);
    }
  }, [state.orderId, router]);

  return (
    <form action={formAction} className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Customer
        </h2>
        {customers.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You have no customers yet.{" "}
            <Link href="/customers/new" className="font-semibold underline">
              Add a customer
            </Link>{" "}
            first.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Sell to <span className="text-red-500">*</span>
            </span>
            <select
              name="customer_id"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select a customer…
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-400">
              Only your own customers are listed.{" "}
              <Link href="/customers/new" className="underline">
                Add a new one
              </Link>
              .
            </span>
          </label>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Items sold
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Unit price defaults to the retail price; you can override it. This sale
          does not affect central warehouse stock.
        </p>
        <LineItemEditor products={products} defaultPrice="retail" discountable />
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
            placeholder="Optional notes"
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
