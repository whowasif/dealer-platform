"use client";

import { useFormState, useFormStatus } from "react-dom";
import { approveAction, type ApprovalActionState } from "@/app/(app)/approvals/actions";

// -----------------------------------------------------------------------------
// ApprovalPanel — shows the two-stage (Divisional head + HQ) approval status of
// a rep-created order/project, and an Approve button when the current user is
// allowed to act on the next stage.
// -----------------------------------------------------------------------------

const initial: ApprovalActionState = {};

function StageRow({
  label,
  done,
}: {
  label: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-700">{label}</span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}
      >
        {done ? "Approved" : "Pending"}
      </span>
    </div>
  );
}

function ApproveButton({ stage }: { stage: "division" | "hq" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending
        ? "Approving…"
        : stage === "division"
        ? "Approve (Divisional head)"
        : "Approve (HQ)"}
    </button>
  );
}

export function ApprovalPanel({
  kind,
  id,
  divisionApproved,
  hqApproved,
  canApprove,
}: {
  kind: "order" | "project";
  id: string;
  divisionApproved: boolean;
  hqApproved: boolean;
  canApprove: "division" | "hq" | null;
}) {
  const [state, action] = useFormState(approveAction, initial);
  const fullyApproved = divisionApproved && hqApproved;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Approval status
      </h2>

      <div className="divide-y divide-slate-100">
        <StageRow label="Divisional head" done={divisionApproved} />
        <StageRow label="Head office (HQ)" done={hqApproved} />
      </div>

      <div className="mt-3">
        {fullyApproved ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Fully approved and active.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Requires approval from BOTH the divisional head and HQ before it
            becomes active.
          </p>
        )}
      </div>

      {canApprove ? (
        <form action={action} className="mt-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <ApproveButton stage={canApprove} />
        </form>
      ) : null}

      {state.error ? (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      ) : null}
    </section>
  );
}
