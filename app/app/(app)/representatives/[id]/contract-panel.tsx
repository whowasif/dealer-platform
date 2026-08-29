"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createContractAction,
  updateContractStatusAction,
  type ActionState,
} from "../actions";
import type { ContractStatus } from "@/lib/types";

const initialState: ActionState = {};

// Next actions offered per contract status.
const CONTRACT_NEXT: Record<
  ContractStatus,
  { value: ContractStatus; label: string }[]
> = {
  draft: [
    { value: "pending_signature", label: "Send for signature" },
    { value: "terminated", label: "Terminate" },
  ],
  pending_signature: [
    { value: "active", label: "Activate (signed)" },
    { value: "terminated", label: "Terminate" },
  ],
  active: [
    { value: "expired", label: "Mark expired" },
    { value: "renewed", label: "Mark renewed" },
    { value: "terminated", label: "Terminate" },
  ],
  expired: [{ value: "renewed", label: "Mark renewed" }],
  terminated: [],
  renewed: [],
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Working…" : label}
    </button>
  );
}

function TransitionButton({ value, label }: { value: string; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="next_status"
      value={value}
      disabled={pending}
      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
    >
      {label}
    </button>
  );
}

export function ContractPanel({
  representativeId,
  contractId,
  status,
  createMode = false,
}: {
  representativeId: string;
  contractId?: string;
  status?: ContractStatus;
  createMode?: boolean;
}) {
  const [createState, createAction] = useFormState(
    createContractAction,
    initialState
  );
  const [statusState, statusAction] = useFormState(
    updateContractStatusAction,
    initialState
  );

  if (createMode) {
    const today = new Date().toISOString().slice(0, 10);
    return (
      <form action={createAction} className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Generate a contract</p>
        <input type="hidden" name="representative_id" value={representativeId} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Start date
            </span>
            <input
              name="start_date"
              type="date"
              required
              defaultValue={today}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Term (years)
            </span>
            <input
              name="term_years"
              type="number"
              min="1"
              max="20"
              defaultValue={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Renewal fee
            </span>
            <input
              name="renewal_fee"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {createState.error ? (
          <p role="alert" className="text-sm text-red-700">
            {createState.error}
          </p>
        ) : null}
        {createState.success ? (
          <p className="text-sm text-green-700">{createState.success}</p>
        ) : null}
        <SubmitButton label="Generate contract" />
      </form>
    );
  }

  // Per-row transition controls.
  const actions = status ? CONTRACT_NEXT[status] ?? [] : [];
  if (actions.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="space-y-1">
      <form action={statusAction} className="flex flex-wrap gap-1">
        <input type="hidden" name="representative_id" value={representativeId} />
        <input type="hidden" name="contract_id" value={contractId} />
        {actions.map((a) => (
          <TransitionButton key={a.value} value={a.value} label={a.label} />
        ))}
      </form>
      {statusState.error ? (
        <p role="alert" className="text-xs text-red-700">
          {statusState.error}
        </p>
      ) : null}
      {statusState.success ? (
        <p className="text-xs text-green-700">{statusState.success}</p>
      ) : null}
    </div>
  );
}
