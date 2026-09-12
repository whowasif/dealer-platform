"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  createExecutiveAction,
  updateExecutiveAction,
  deleteExecutiveAction,
  type ExecActionState,
} from "./actions";
import type { HqExecutiveListItem } from "@/lib/types";

const initialState: ExecActionState = {};

export interface UserOption {
  id: string;
  full_name: string;
  phone: string;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

// Compute each executive's share of a sample pool, to preview weights.
function shareOf(weight: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((weight / total) * 1000) / 10}%`;
}

export function AddExecutiveForm({ users }: { users: UserOption[] }) {
  const [state, formAction] = useFormState(createExecutiveAction, initialState);
  const router = useRouter();

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 400);
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">User</span>
        <select
          name="user_id"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select a user…
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name} ({u.phone})
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Designation
        </span>
        <input
          name="designation"
          required
          placeholder="e.g. CEO, COO"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Role weight
        </span>
        <input
          name="role_weight"
          type="number"
          min="0"
          step="0.01"
          defaultValue="1"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex items-end gap-2 pb-2">
        <input name="is_ceo" type="checkbox" className="h-4 w-4" />
        <span className="text-sm font-medium text-slate-700">Is CEO</span>
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        {state.error ? (
          <p role="alert" className="mb-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="mb-2 text-sm text-green-700">{state.success}</p>
        ) : null}
        <SaveButton label="Add executive" />
      </div>
    </form>
  );
}

export function ExecutiveRow({
  exec,
  totalWeight,
}: {
  exec: HqExecutiveListItem;
  totalWeight: number;
}) {
  const [editing, setEditing] = useState(false);
  const [updState, updAction] = useFormState(updateExecutiveAction, initialState);
  const [delState, delAction] = useFormState(deleteExecutiveAction, initialState);
  const router = useRouter();
  const weight = Number(exec.role_weight);

  if (editing) {
    return (
      <tr className="bg-amber-50/40">
        <td className="px-3 py-2 font-medium text-slate-800">
          {exec.full_name}
        </td>
        <td colSpan={5} className="px-3 py-2">
          <form
            action={(fd) => {
              updAction(fd);
              setTimeout(() => {
                setEditing(false);
                router.refresh();
              }, 400);
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="id" value={exec.id} />
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Designation</span>
              <input
                name="designation"
                defaultValue={exec.designation}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Weight</span>
              <input
                name="role_weight"
                type="number"
                min="0"
                step="0.01"
                defaultValue={String(weight)}
                className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex items-center gap-1 pb-1 text-sm">
              <input
                name="is_ceo"
                type="checkbox"
                defaultChecked={exec.is_ceo}
                className="h-4 w-4"
              />
              CEO
            </label>
            <label className="flex items-center gap-1 pb-1 text-sm">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={exec.is_active}
                className="h-4 w-4"
              />
              Active
            </label>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            {updState.error ? (
              <span className="text-sm text-red-700">{updState.error}</span>
            ) : null}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-3 py-2 font-medium text-slate-800">
        {exec.full_name}
        {exec.is_ceo ? (
          <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            CEO
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2 text-slate-600">{exec.designation}</td>
      <td className="px-3 py-2 text-slate-700">{weight}</td>
      <td className="px-3 py-2 text-slate-600">
        {exec.is_active ? shareOf(weight, totalWeight) : "—"}
      </td>
      <td className="px-3 py-2">
        {exec.is_active ? (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            active
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            inactive
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={() => setEditing(true)}
          className="mr-3 text-sm font-medium text-brand-600 hover:text-brand-800"
        >
          Edit
        </button>
        <form
          action={(fd) => {
            delAction(fd);
            setTimeout(() => router.refresh(), 400);
          }}
          className="inline"
          onSubmit={(e) => {
            if (!confirm(`Remove ${exec.full_name} as an executive?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={exec.id} />
          <button
            type="submit"
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        </form>
        {delState.error ? (
          <p className="mt-1 text-xs text-red-700">{delState.error}</p>
        ) : null}
      </td>
    </tr>
  );
}
