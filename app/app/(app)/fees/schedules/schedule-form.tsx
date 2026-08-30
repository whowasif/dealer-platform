"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createFeeScheduleAction, type ActionState } from "../actions";

// -----------------------------------------------------------------------------
// HQ-only form: create a new versioned fee schedule for a fee_type. Posting
// closes the previous open window for that fee_type (handled server-side).
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save fee schedule"}
    </button>
  );
}

export function FeeScheduleForm() {
  const [state, formAction] = useFormState(
    createFeeScheduleAction,
    initialState
  );
  const router = useRouter();

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 400);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Fee type
          </span>
          <select
            name="fee_type"
            required
            defaultValue="monthly_software"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="monthly_software">Monthly software</option>
            <option value="contract_renewal">Contract renewal</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Amount (৳)
          </span>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Effective from
          </span>
          <input
            name="effective_from"
            type="date"
            required
            defaultValue={today()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Description{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            name="description"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Reason for the change"
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

      <SaveButton />
    </form>
  );
}
