"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  markReadAction,
  markAllReadAction,
  type ActionState,
} from "./actions";

// -----------------------------------------------------------------------------
// Client controls for notifications: mark one read, mark all read. Both post to
// server actions scoped to the current user.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

function MarkReadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-brand-600 transition hover:text-brand-700 disabled:opacity-60"
    >
      {pending ? "…" : "Mark read"}
    </button>
  );
}

export function MarkReadButtonForm({ id }: { id: string }) {
  const [, formAction] = useFormState(markReadAction, initialState);
  const router = useRouter();
  return (
    <form
      action={(fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 300);
      }}
    >
      <input type="hidden" name="id" value={id} />
      <MarkReadButton />
    </form>
  );
}

function MarkAllButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
    >
      {pending ? "Working…" : "Mark all read"}
    </button>
  );
}

export function MarkAllReadForm() {
  const [, formAction] = useFormState(markAllReadAction, initialState);
  const router = useRouter();
  return (
    <form
      action={(fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 300);
      }}
    >
      <MarkAllButton />
    </form>
  );
}
