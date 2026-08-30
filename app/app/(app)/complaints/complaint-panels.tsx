"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  fileComplaintAction,
  assignComplaintAction,
  updateComplaintStatusAction,
  type ActionState,
} from "./actions";

// -----------------------------------------------------------------------------
// Client panels for complaints: file (any user), assign (HQ), update status
// (HQ or assignee). Each posts to a server action that re-checks authorization.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

export interface AssigneeOption {
  id: string;
  full_name: string;
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

export function FileComplaintPanel() {
  const [state, formAction] = useFormState(fileComplaintAction, initialState);
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
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Subject
          </span>
          <input
            name="subject"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Category{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            name="category"
            placeholder="e.g. delivery, payment"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Priority
          </span>
          <select
            name="priority"
            defaultValue="medium"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Complainant name{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            name="complainant_name"
            placeholder="Defaults to you"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Complainant phone{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            name="complainant_phone"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Description
          </span>
          <textarea
            name="description"
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

      <SubmitButton idle="File complaint" busy="Filing…" />
    </form>
  );
}

function SmallButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
    >
      {pending ? busy : idle}
    </button>
  );
}

export function AssignPanel({
  id,
  assignees,
}: {
  id: string;
  assignees: AssigneeOption[];
}) {
  const [state, formAction] = useFormState(assignComplaintAction, initialState);
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
      <select
        name="assignee_user_id"
        required
        defaultValue=""
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
      >
        <option value="" disabled>
          Assign to…
        </option>
        {assignees.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name}
          </option>
        ))}
      </select>
      <SmallButton idle="Assign" busy="…" />
      {state.error ? (
        <span role="alert" className="text-xs text-red-700">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function StatusPanel({
  id,
  current,
}: {
  id: string;
  current: string;
}) {
  const [state, formAction] = useFormState(
    updateComplaintStatusAction,
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
      <select
        name="status"
        defaultValue={current}
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
      >
        <option value="open">Open</option>
        <option value="in_progress">In progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
      <input
        name="resolution_notes"
        placeholder="Notes (optional)"
        className="min-w-[10rem] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
      />
      <SmallButton idle="Update" busy="…" />
      {state.error ? (
        <span role="alert" className="text-xs text-red-700">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
