"use client";

import { useFormState, useFormStatus } from "react-dom";
import { transitionOrderAction, type ActionState } from "../actions";
import type { OrderStatus } from "@/lib/types";

// -----------------------------------------------------------------------------
// Renders the status-transition buttons available to the current viewer. Each
// allowed transition is its own mini-form posting to transitionOrderAction with
// an optional note. The server re-validates the transition + authorization.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

export interface StatusAction {
  status: OrderStatus;
  label: string;
  tone: "primary" | "danger" | "neutral";
}

function toneClass(tone: StatusAction["tone"]): string {
  if (tone === "danger") {
    return "bg-red-600 hover:bg-red-700 text-white";
  }
  if (tone === "neutral") {
    return "border border-slate-300 text-slate-700 hover:bg-slate-50";
  }
  return "bg-brand-600 hover:bg-brand-700 text-white";
}

function ActionButton({ action }: { action: StatusAction }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="next_status"
      value={action.status}
      disabled={pending}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${toneClass(
        action.tone
      )}`}
    >
      {pending ? "Working…" : action.label}
    </button>
  );
}

export function StatusControls({
  orderId,
  actions,
}: {
  orderId: string;
  actions: StatusAction[];
}) {
  const [state, formAction] = useFormState(
    transitionOrderAction,
    initialState
  );

  if (actions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No further status changes are available for this order.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Note (optional)
        </span>
        <input
          name="notes"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Reason or comment for this change"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <ActionButton key={a.status} action={a} />
        ))}
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
