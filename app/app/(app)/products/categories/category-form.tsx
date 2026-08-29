"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveCategoryAction, type ActionState } from "../actions";
import type { CategoryListItem } from "@/lib/types";

// -----------------------------------------------------------------------------
// Create/edit form for a product category. `editing` supplies an existing row;
// otherwise the form creates a new one. Parent options exclude the category
// being edited so it cannot become its own parent.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending
        ? "Saving…"
        : editing
          ? "Save changes"
          : "Add category"}
    </button>
  );
}

export function CategoryForm({
  categories,
  editing = null,
}: {
  categories: CategoryListItem[];
  editing?: CategoryListItem | null;
}) {
  const [state, formAction] = useFormState(saveCategoryAction, initialState);
  const isEditing = editing != null;

  // Only top-level categories may serve as a parent (one level of nesting),
  // and a category can never be its own parent.
  const parentOptions = categories.filter(
    (c) => c.parent_id === null && (!editing || c.id !== editing.id)
  );

  return (
    <form action={formAction} className="space-y-3">
      {isEditing ? (
        <input type="hidden" name="category_id" value={editing!.id} />
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Name <span className="text-red-500">*</span>
          </span>
          <input
            name="name"
            required
            defaultValue={editing?.name ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Name (Bangla)
          </span>
          <input
            name="bn_name"
            defaultValue={editing?.bn_name ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Parent category
          </span>
          <select
            name="parent_id"
            defaultValue={editing?.parent_id ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— Top level —</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Sort order
          </span>
          <input
            name="sort_order"
            type="number"
            min="0"
            defaultValue={editing?.sort_order ?? 0}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Description
          </span>
          <input
            name="description"
            defaultValue={editing?.description ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={editing?.is_active ?? true}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium text-slate-700">Active</span>
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

      <SubmitButton editing={isEditing} />
    </form>
  );
}
