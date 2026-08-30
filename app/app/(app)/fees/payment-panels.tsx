"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  recordPaymentAction,
  verifyPaymentAction,
  type ActionState,
} from "./actions";
import type { RepOption } from "./invoice-panels";

// -----------------------------------------------------------------------------
// HQ-only panels: record a payment (optionally linked to an invoice) and verify
// a payment. Recording posts a ledger credit server-side; linking to an invoice
// that the payment covers marks it paid — all atomic in lib/fees.recordPayment.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

/** Minimal open-invoice option for linking a payment. */
export interface OpenInvoiceOption {
  id: string;
  representative_id: string;
  label: string;
}

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
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

export function RecordPaymentPanel({
  reps,
  openInvoices,
}: {
  reps: RepOption[];
  openInvoices: OpenInvoiceOption[];
}) {
  const [state, formAction] = useFormState(recordPaymentAction, initialState);
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
            Payment date
          </span>
          <input
            name="payment_date"
            type="date"
            required
            defaultValue={today()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Method
          </span>
          <select
            name="payment_method"
            required
            defaultValue="bank_transfer"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="bank_transfer">Bank transfer</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
            <option value="check">Check</option>
            <option value="other_dfs">Other DFS</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Payment type
          </span>
          <select
            name="payment_type"
            required
            defaultValue="fee"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="fee">Fee</option>
            <option value="renewal">Renewal</option>
            <option value="deposit">Deposit</option>
            <option value="order_payment">Order payment</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Reference no.
          </span>
          <input
            name="reference_no"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Link to invoice{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <select
            name="related_invoice_id"
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Not linked</option>
            {openInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            name="notes"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <p className="text-xs text-slate-400">
        Linking a payment that covers the invoice amount marks that invoice paid.
      </p>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700">{state.success}</p>
      ) : null}

      <SubmitButton idle="Record payment" busy="Recording…" />
    </form>
  );
}

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-brand-600 px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
    >
      {pending ? "Verifying…" : "Verify"}
    </button>
  );
}

export function VerifyPaymentButton({ paymentId }: { paymentId: string }) {
  const [, formAction] = useFormState(verifyPaymentAction, initialState);
  const router = useRouter();
  return (
    <form
      action={(fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 400);
      }}
    >
      <input type="hidden" name="payment_id" value={paymentId} />
      <VerifyButton />
    </form>
  );
}
