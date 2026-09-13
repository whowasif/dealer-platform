"use client";

import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  markMessageReadAction,
  deleteMessageAction,
  type WebsiteActionState,
} from "../actions";
import type { ContactMessageRow } from "@/lib/website-content";

const initialState: WebsiteActionState = {};

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function MessageCard({ msg }: { msg: ContactMessageRow }) {
  const [readState, readAction] = useFormState(
    markMessageReadAction,
    initialState
  );
  const [delState, delAction] = useFormState(deleteMessageAction, initialState);
  const router = useRouter();

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        msg.is_read
          ? "border-slate-200 bg-white"
          : "border-brand-200 bg-brand-50/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-slate-900">
            {msg.full_name}
            {!msg.is_read ? (
              <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                new
              </span>
            ) : null}
          </h3>
          {msg.business_name ? (
            <p className="text-xs text-slate-500">{msg.business_name}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {fmt(msg.created_at)}
        </span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-slate-400">Email</dt>
          <dd>
            <a
              href={`mailto:${msg.email}`}
              className="text-brand-700 hover:underline"
            >
              {msg.email}
            </a>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate-400">Mobile</dt>
          <dd>
            <a
              href={`tel:${msg.mobile}`}
              className="text-brand-700 hover:underline"
            >
              {msg.mobile}
            </a>
          </dd>
        </div>
      </dl>

      {msg.details ? (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {msg.details}
        </p>
      ) : (
        <p className="mt-3 text-sm italic text-slate-400">No message body.</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <form
          action={(fd) => {
            readAction(fd);
            setTimeout(() => router.refresh(), 400);
          }}
        >
          <input type="hidden" name="id" value={msg.id} />
          <input type="hidden" name="read" value={msg.is_read ? "false" : "true"} />
          <button
            type="submit"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {msg.is_read ? "Mark unread" : "Mark read"}
          </button>
        </form>
        <form
          action={(fd) => {
            delAction(fd);
            setTimeout(() => router.refresh(), 400);
          }}
          onSubmit={(e) => {
            if (!confirm("Delete this message?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={msg.id} />
          <button
            type="submit"
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </form>
      </div>
      {readState.error || delState.error ? (
        <p className="mt-1 text-xs text-red-700">
          {readState.error ?? delState.error}
        </p>
      ) : null}
    </div>
  );
}
