"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createCustomerAction,
  updateCustomerAction,
  type ActionState,
} from "./actions";
import type { CustomerDetail, UpazilaRow } from "@/lib/types";

// -----------------------------------------------------------------------------
// Shared customer create/edit form. `customer` is null for the create flow and
// a CustomerDetail for the edit flow (which routes to updateCustomerAction).
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
          : "Create customer"}
    </button>
  );
}

export function CustomerForm({
  upazilas,
  customer = null,
}: {
  upazilas: UpazilaRow[];
  customer?: CustomerDetail | null;
}) {
  const editing = customer != null;
  const [state, formAction] = useFormState(
    editing ? updateCustomerAction : createCustomerAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      {editing ? (
        <input type="hidden" name="customer_id" value={customer!.id} />
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Customer details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </span>
            <input
              name="name"
              required
              defaultValue={customer?.name ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Type <span className="text-red-500">*</span>
            </span>
            <select
              name="type"
              required
              defaultValue={customer?.type ?? "retail"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="retail">Retail</option>
              <option value="institutional">Institutional</option>
              <option value="government">Government</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Phone
            </span>
            <input
              name="phone"
              defaultValue={customer?.phone ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </span>
            <input
              name="email"
              type="email"
              defaultValue={customer?.email ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Organization name
            </span>
            <input
              name="organization_name"
              defaultValue={customer?.organization_name ?? ""}
              placeholder="For institutional / government customers"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Upazila
            </span>
            <select
              name="upazila_id"
              defaultValue={customer?.upazila_id ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {upazilas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Address
            </span>
            <textarea
              name="address"
              rows={2}
              defaultValue={customer?.address ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Notes
            </span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={customer?.notes ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
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
          <Link href="/customers" className="font-semibold underline">
            View customers
          </Link>
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton editing={editing} />
        <Link
          href={editing ? `/customers/${customer!.id}` : "/customers"}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
