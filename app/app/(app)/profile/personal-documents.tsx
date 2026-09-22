"use client";

import { useFormState, useFormStatus } from "react-dom";
import { deletePersonalDocumentAction, uploadPersonalDocumentAction, type PersonalDocumentActionState } from "./documents-actions";
import type { PersonalDocumentRow, SessionUser } from "@/lib/types";

const initialState: PersonalDocumentActionState = {};

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : children}</button>;
}

export function PersonalDocuments({
  actor,
  documents,
  users,
}: {
  actor: SessionUser;
  documents: PersonalDocumentRow[];
  users: { id: string; full_name: string }[];
}) {
  const [state, upload] = useFormState(uploadPersonalDocumentAction, initialState);
  const [deleteState, remove] = useFormState(deletePersonalDocumentAction, initialState);
  const canEdit = actor.roles.some((role) => ["super_admin", "hq_admin", "hq_operations", "hq_finance"].includes(role.role_name));

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Personal documents</h2>
        <p className="mt-1 text-xs text-slate-500">Identity and personal files only. You can view your files; HQ/admin maintains them.</p>
      </div>

      {canEdit ? (
        <form action={upload} encType="multipart/form-data" className="grid grid-cols-1 gap-3 rounded-lg border border-brand-100 bg-brand-50/40 p-4 md:grid-cols-6">
          <select name="user_id" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2">
            <option value="">User</option>
            {users.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
          </select>
          <select name="document_type" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Type</option><option value="nid">NID</option><option value="passport_photo">Passport-size photo</option><option value="passport">Passport</option><option value="other">Other</option>
          </select>
          <input name="title" required placeholder="Title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="file" type="file" required className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
          <SubmitButton>Upload</SubmitButton>
        </form>
      ) : null}

      {state.error || deleteState.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error || deleteState.error}</p> : null}
      {state.success || deleteState.success ? <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success || deleteState.success}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">File</th>{canEdit ? <th className="px-3 py-2">Action</th> : null}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((document) => <tr key={document.id}><td className="px-3 py-2">{document.user_name}</td><td className="px-3 py-2 capitalize">{document.document_type.replace(/_/g, " ")}</td><td className="px-3 py-2 font-medium">{document.title}</td><td className="px-3 py-2"><a className="text-brand-700 hover:underline" href={`/profile/documents/${document.id}`}>View</a></td>{canEdit ? <td className="px-3 py-2"><form action={remove}><input type="hidden" name="document_id" value={document.id} /><button className="text-red-600 hover:underline">Delete</button></form></td> : null}</tr>)}
            {documents.length === 0 ? <tr><td colSpan={canEdit ? 5 : 4} className="px-3 py-6 text-center text-slate-400">No personal documents stored yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}