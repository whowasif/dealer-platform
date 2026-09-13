"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  createInsightAction,
  updateInsightAction,
  deleteInsightAction,
  type WebsiteActionState,
} from "../actions";
import { ImageField } from "../image-field";
import { previewUrl } from "../preview-url";
import type { InsightCardRow } from "@/lib/website-content";

const initialState: WebsiteActionState = {};

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

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

function Fields({ card }: { card?: InsightCardRow }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>Title</span>
          <input
            name="title"
            required
            defaultValue={card?.title ?? ""}
            className={inputClass}
            placeholder="Article headline"
          />
        </label>
        <label className="block">
          <span className={labelClass}>Date label</span>
          <input
            name="date_label"
            defaultValue={card?.date_label ?? ""}
            className={inputClass}
            placeholder="e.g. Jan 15, 2026"
          />
        </label>
        <label className="block">
          <span className={labelClass}>Sort order</span>
          <input
            name="sort_order"
            type="number"
            min="0"
            defaultValue={String(card?.sort_order ?? 0)}
            className={inputClass}
          />
        </label>
      </div>
      <label className="block">
        <span className={labelClass}>Excerpt</span>
        <textarea
          name="excerpt"
          required
          rows={4}
          defaultValue={card?.excerpt ?? ""}
          className={`${inputClass} resize-y`}
          placeholder="The text shown when the card is opened."
        />
      </label>
      <ImageField currentRef={card?.image_url} />
      <label className="flex items-center gap-2">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={card ? card.is_active : true}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-slate-700">
          Show on website
        </span>
      </label>
    </div>
  );
}

export function AddInsightForm() {
  const [state, formAction] = useFormState(createInsightAction, initialState);
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        + Add insight card
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 500);
      }}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        New insight card
      </h2>
      <Fields />
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700">{state.success}</p>
      ) : null}
      <div className="flex gap-3">
        <SaveButton label="Add card" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function InsightCard({ card }: { card: InsightCardRow }) {
  const [editing, setEditing] = useState(false);
  const [updState, updAction] = useFormState(updateInsightAction, initialState);
  const [delState, delAction] = useFormState(deleteInsightAction, initialState);
  const router = useRouter();

  if (editing) {
    return (
      <form
        action={(fd) => {
          updAction(fd);
          setTimeout(() => {
            setEditing(false);
            router.refresh();
          }, 500);
        }}
        className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-5"
      >
        <input type="hidden" name="id" value={card.id} />
        <Fields card={card} />
        {updState.error ? (
          <p className="text-sm text-red-700">{updState.error}</p>
        ) : null}
        <div className="flex gap-3">
          <SaveButton label="Save changes" />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl(card.image_url)}
        alt={card.title}
        className="h-24 w-32 shrink-0 rounded-md border border-slate-200 object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-medium text-slate-900">
              {card.title}
            </h3>
            <p className="text-xs text-slate-500">
              {card.date_label || "—"} · order {card.sort_order}
              {!card.is_active ? (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  hidden
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-brand-600 hover:text-brand-800"
            >
              Edit
            </button>
            <form
              action={(fd) => {
                delAction(fd);
                setTimeout(() => router.refresh(), 500);
              }}
              className="inline"
              onSubmit={(e) => {
                if (!confirm(`Delete "${card.title}"?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={card.id} />
              <input type="hidden" name="image_ref" value={card.image_url} />
              <button
                type="submit"
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
          {card.excerpt}
        </p>
        {delState.error ? (
          <p className="mt-1 text-xs text-red-700">{delState.error}</p>
        ) : null}
      </div>
    </div>
  );
}
