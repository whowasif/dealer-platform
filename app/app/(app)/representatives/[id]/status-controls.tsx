"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateRepresentativeStatusAction,
  type ActionState,
} from "../actions";
import type { RepresentativeStatus } from "@/lib/types";

const initialState: ActionState = {};

// Which actions are offered for each current status, and their button label.
const NEXT_ACTIONS: Record<
  RepresentativeStatus,
  { value: RepresentativeStatus; label: string; tone: "primary" | "warn" | "danger" }[]
> = {
  applied: [
    { value: "approved", label: "Approve", tone: "primary" },
    { value: "terminated", label: "Reject / Terminate", tone: "danger" },
  ],
  approved: [
    { value: "active", label: "Activate", tone: "primary" },
    { value: "terminated", label: "Terminate", tone: "danger" },
  ],
  active: [
    { value: "suspended", label: "Suspend", tone: "warn" },
    { value: "resigned", label: "Mark resigned", tone: "warn" },
    { value: "terminated", label: "Terminate", tone: "danger" },
  ],
  suspended: [
    { value: "active", label: "Reactivate", tone: "primary" },
    { value: "terminated", label: "Terminate", tone: "danger" },
  ],
  terminated: [],
  resigned: [],
};

const TONE: Record<string, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  warn: "bg-amber-500 text-white hover:bg-amber-600",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

function ActionButton({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="next_status"
      value={value}
      disabled={pending}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${TONE[tone]}`}
    >
      {label}
    </button>
  );
}

export function StatusControls({
  representativeId,
  status,
}: {
  representativeId: string;
  status: RepresentativeStatus;
}) {
  const [state, formAction] = useFormState(
    updateRepresentativeStatusAction,
    initialState
  );
  const actions = NEXT_ACTIONS[status] ?? [];

  return (
    <div className="space-y-3">
      {actions.length === 0 ? (
        <p className="text-sm text-slate-500">
          No further status changes are available (final state).
        </p>
      ) : (
        <form action={formAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="representative_id" value={representativeId} />
          {actions.map((a) => (
            <ActionButton
              key={a.value}
              value={a.value}
              label={a.label}
              tone={a.tone}
            />
          ))}
        </form>
      )}

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700">{state.success}</p>
      ) : null}
    </div>
  );
}
