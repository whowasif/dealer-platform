"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  generateMonthlyInvoicesAction,
  createInvoiceAction,
  type ActionState,
} from "./actions";

// -----------------------------------------------------------------------------
// HQ-only panels: generate monthly software invoices for a period, and create a
// single manual invoice (contract renewal / other). Both post to server actions
// that run atomically and post the ledger debit server-side.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

/** Minimal rep option for the select. */
export interface RepOption {
  id: string;
  full_name: string;
}

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function SaveButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? busy : idle}
    </button>
  );
}

export function GenerateInvoicesPanel() {
  const [state, formAction] = useFormState(
    generateMonthlyInvoicesAction,
    initialState
  );
  const router = useRouter();
  const now = new Date();

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 400);
      }}
      className="space-y-4"
    >
      <p className="text-sm text-slate-500">
        Creates a monthly software fee invoice for every active representative
        for the chosen month. Safe to re-run — representatives already invoiced
        for that month are skipped.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Year
          </span>
          <select
            name="year"
            defaultValue={String(now.getFullYear())}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Month
          </span>
          <select
            name="month"
            defaultValue={String(now.getMonth() + 1)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <SaveButton idle="Generate invoices" busy="Generating…" />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700">{state.success}</p>
      ) : null}
    </form>
  );
}

export function NewInvoicePanel({ reps }: { reps: RepOption[] }) {
  const [state, formAction] = useFormState(createInvoiceAction, initialState);
  const router = useRouter();

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 400);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Representative
          </span>
          <select
            name="representative_id"
            required
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Select…
            </option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Fee type
          </span>
          <select
            name="fee_type"
            required
            defaultValue="contract_renewal"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="monthly_software">Monthly software</option>
            <option value="contract_renewal">Contract renewal</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Amount (৳)
          </span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Period start
          </span>
          <input
            name="period_start"
            type="date"
            required
            defaultValue={today()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Period end
          </span>
          <input
            name="period_end"
            type="date"
            required
            defaultValue={today()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Due date
          </span>
          <input
            name="due_date"
            type="date"
            required
            defaultValue={today()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700">{state.success}</p>
      ) : null}

      <SaveButton idle="Create invoice" busy="Creating…" />
    </form>
  );
}
