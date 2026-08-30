"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createDisciplinaryAction,
  resolveDisciplinaryAction,
  type ActionState,
} from "./actions";

// -----------------------------------------------------------------------------
// Client panels for the disciplinary feature: the create form (HQ + div head)
// and a resolve form. Both post to server actions that re-check authorization.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

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

export function CreateDisciplinaryPanel({
  reps,
  fixedRepId,
}: {
  reps: RepOption[];
  fixedRepId?: string;
}) {
  const [state, formAction] = useFormState(
    createDisciplinaryAction,
    initialState
  );
  const router = useRouter();

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 400);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fixedRepId ? (
          <input type="hidden" name="representative_id" value={fixedRepId} />
        ) : (
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
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Action type
          </span>
          <select
            name="action_type"
            required
            defaultValue="written_warning"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="written_warning">Written warning</option>
            <option value="suspension">Suspension</option>
            <option value="termination">Termination</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Issue date
          </span>
          <input
            name="issued_date"
            type="date"
            required
            defaultValue={today()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
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
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Effective to{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            name="effective_to"
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Reason
          </span>
          <textarea
            name="reason"
            required
            rows={3}
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

      <SubmitButton idle="Record action" busy="Saving…" />
    </form>
  );
}

function ResolveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
    >
      {pending ? "Resolving…" : "Resolve"}
    </button>
  );
}

export function ResolvePanel({ id }: { id: string }) {
  const [state, formAction] = useFormState(
    resolveDisciplinaryAction,
    initialState
  );
  const router = useRouter();

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 400);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <input
        name="resolution_notes"
        required
        placeholder="Resolution notes…"
        className="min-w-[14rem] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />
      <ResolveButton />
      {state.error ? (
        <span role="alert" className="text-xs text-red-700">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
