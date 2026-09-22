"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ProjectMessageRow, ProjectParticipant } from "@/lib/types";
import { sendSupportMessageAction, type SupportActionState } from "./actions";

function Submit() { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Sending…" : "Send message"}</button>; }

export function SupportWorkspace({ actorIsHQ, messages, hqPeople }: { actorIsHQ: boolean; messages: ProjectMessageRow[]; hqPeople: ProjectParticipant[] }) {
  const [state, action] = useFormState<SupportActionState, FormData>(sendSupportMessageAction, {});
  const recipients = actorIsHQ ? Array.from(new Map(messages.filter((message) => message.sender_id !== message.recipient_id).map((message) => [message.sender_id, { id: message.sender_id, full_name: message.sender_name, role_name: "support requester" }])).values()) : hqPeople;
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3">{messages.map((message) => <div key={message.id} className="rounded-lg bg-white p-3 text-sm"><p className="font-medium text-slate-800">{message.sender_name}{message.recipient_name ? ` → ${message.recipient_name}` : ""}</p><p className="mt-1 whitespace-pre-wrap text-slate-600">{message.body}</p></div>)}{messages.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No technical support messages yet.</p> : null}</div><form action={action} className="mt-4 space-y-3"><select name="recipient_id" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Choose recipient</option>{recipients.map((person) => <option key={person.id} value={person.id}>{person.full_name} ({person.role_name.replace(/_/g, " ")})</option>)}</select><textarea name="body" required rows={4} placeholder="Describe the issue" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><Submit />{state.error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}{state.success ? <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p> : null}</form></section>;
}