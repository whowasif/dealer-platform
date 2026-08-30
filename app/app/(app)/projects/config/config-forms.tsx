"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  createProfitConfigAction,
  createInvestmentConfigAction,
  type ActionState,
} from "../actions";

// -----------------------------------------------------------------------------
// HQ-only config forms: create a new versioned profit split (must sum to 100%)
// and a new investment per-unit amount. Both post to server actions that close
// the previous window and enforce the rules server-side.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ProfitConfigForm({
  current,
}: {
  current: { rep: number; hq: number; invest: number };
}) {
  const [state, formAction] = useFormState(createProfitConfigAction, initialState);
  const router = useRouter();

  const [rep, setRep] = useState<string>(String(current.rep));
  const [hq, setHq] = useState<string>(String(current.hq));
  const [invest, setInvest] = useState<string>(String(current.invest));

  const sum =
    (Number(rep) || 0) + (Number(hq) || 0) + (Number(invest) || 0);
  const sumOk = Math.round(sum * 100) / 100 === 100;

  return (
    <form
      action={(fd) => {
        formAction(fd);
        // Refresh history after a successful save on next render tick.
        setTimeout(() => router.refresh(), 400);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Representative %
          </span>
          <input
            name="representative_percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={rep}
            onChange={(e) => setRep(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            HQ %
          </span>
          <input
            name="hq_percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={hq}
            onChange={(e) => setHq(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Investment %
          </span>
          <input
            name="investment_percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={invest}
            onChange={(e) => setInvest(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block max-w-xs">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Effective from
        </span>
        <input
          name="effective_from"
          type="date"
          defaultValue={today()}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <p
        className={`text-sm font-medium ${
          sumOk ? "text-green-700" : "text-red-700"
        }`}
      >
        Total: {sum}% {sumOk ? "✓" : "(must equal 100%)"}
      </p>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700">{state.success}</p>
      ) : null}

      <SaveButton label="Save new split" />
    </form>
  );
}

export function InvestmentConfigForm({
  currentPerUnit,
}: {
  currentPerUnit: number;
}) {
  const [state, formAction] = useFormState(
    createInvestmentConfigAction,
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
            Per-unit amount (৳)
          </span>
          <input
            name="per_unit_amount"
            type="number"
            min="1"
            step="0.01"
            defaultValue={String(currentPerUnit)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Total working capital (৳){" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            name="total_working_capital"
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block max-w-xs">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Effective from
        </span>
        <input
          name="effective_from"
          type="date"
          defaultValue={today()}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Notes <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <input
          name="notes"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Reason for the change"
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700">{state.success}</p>
      ) : null}

      <SaveButton label="Save per-unit amount" />
    </form>
  );
}
