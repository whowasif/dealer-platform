"use client";

import { useFormState, useFormStatus } from "react-dom";
import { recordDepositAction, type ActionState } from "../actions";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Recording…" : "Record deposit"}
    </button>
  );
}

export function DepositForm({ representativeId }: { representativeId: string }) {
  const [state, formAction] = useFormState(recordDepositAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm font-medium text-slate-700">Record a deposit</p>
      <input type="hidden" name="representative_id" value={representativeId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Type
          </span>
          <select
            name="type"
            required
            defaultValue="investment_refundable"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="investment_refundable">Investment · refundable</option>
            <option value="investment_non_refundable">
              Investment · non-refundable
            </option>
            <option value="onboarding_fee">Onboarding fee</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Amount
          </span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
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
            Reference no.
          </span>
          <input
            name="reference_no"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Notes
          </span>
          <input
            name="notes"
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

      <SubmitButton />
    </form>
  );
}
