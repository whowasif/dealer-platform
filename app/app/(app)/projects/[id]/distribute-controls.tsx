"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { distributeProjectAction, type ActionState } from "../actions";

// -----------------------------------------------------------------------------
// HQ-only "Distribute profit" control. Posts to distributeProjectAction, which
// runs the transactional, idempotent distribution in lib/projects.ts. On
// success the page is refreshed so the locked breakdown renders.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Distributing…" : "Distribute profit"}
    </button>
  );
}

export function DistributeControls({ projectId }: { projectId: string }) {
  const [state, formAction] = useFormState(
    distributeProjectAction,
    initialState
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      <p className="text-xs text-slate-500">
        This locks the split using the currently effective config, records every
        beneficiary payout, and cannot be undone or run twice.
      </p>
      <SubmitButton />
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
