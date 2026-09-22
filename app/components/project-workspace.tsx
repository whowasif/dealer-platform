"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ProjectFileRow, ProjectMessageRow, ProjectParticipant, ProjectProgressRow, ProjectProgressStageRow, WorkFileCategoryRow } from "@/lib/types";
import { createProjectFileAction, createWorkFileCategoryAction, sendProjectMessageAction, transitionProjectProgressAction, updateProjectFileAction, type ActionState } from "@/app/(app)/projects/actions";

const initialState: ActionState = {};

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : children}</button>;
}

function Feedback({ state }: { state: ActionState }) {
  return state.error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : state.success ? <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p> : null;
}

function EditableFile({ file }: { file: ProjectFileRow }) {
  const [state, action] = useFormState(updateProjectFileAction, initialState);
  if (file.content_text == null) return null;
  return <form action={action} className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
    <input type="hidden" name="file_id" value={file.id} />
    <input name="title" defaultValue={file.title} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
    <textarea name="content_text" defaultValue={file.content_text} rows={8} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono" />
    <div className="flex gap-2"><Submit>Save edits</Submit><a target="_blank" rel="noreferrer" href={`/projects/files/${file.id}/print`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Print</a></div>
    <Feedback state={state} />
  </form>;
}

export function ProjectWorkspace({
  projectId,
  files,
  categories,
  participants,
  messages,
  progress,
  stages,
  canManageCategories,
}: {
  projectId: string;
  files: ProjectFileRow[];
  categories: WorkFileCategoryRow[];
  participants: ProjectParticipant[];
  messages: ProjectMessageRow[];
  progress: ProjectProgressRow | null;
  stages: ProjectProgressStageRow[];
  canManageCategories: boolean;
}) {
  const [fileState, fileAction] = useFormState(createProjectFileAction, initialState);
  const [messageState, messageAction] = useFormState(sendProjectMessageAction, initialState);
  const [progressState, progressAction] = useFormState(transitionProjectProgressAction, initialState);
  const [categoryState, categoryAction] = useFormState(createWorkFileCategoryAction, initialState);
  return <div className="space-y-6">
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Project progress</h2><p className="mt-1 text-lg font-semibold text-slate-900">{progress?.display_name ?? "Run migration 09 first"}</p></div><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Role-controlled</span></div>
      <form action={progressAction} className="mt-4 flex flex-col gap-3 sm:flex-row"><input type="hidden" name="project_id" value={projectId} /><select name="stage_id" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Move to stage</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.display_name}</option>)}</select><input name="note" placeholder="Optional progress note" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><Submit>Change status</Submit></form><Feedback state={progressState} />
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Project files</h2><p className="mt-1 text-xs text-slate-500">Send quotations, specifications, or another necessary project file. Text documents can be edited and printed.</p></div>{canManageCategories ? <form action={categoryAction} className="flex gap-2"><input name="name" required placeholder="New category" className="w-32 rounded border border-slate-300 px-2 py-1.5 text-xs" /><button className="rounded border border-brand-300 px-2 py-1.5 text-xs font-medium text-brand-700">Add category</button></form> : null}</div>
      <form action={fileAction} encType="multipart/form-data" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"><input type="hidden" name="project_id" value={projectId} /><select name="category_id" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name.replace(/_/g, " ")}</option>)}</select><select name="recipient_id" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Send to related people</option>{participants.map((person) => <option key={person.id} value={person.id}>{person.full_name} ({person.role_name.replace(/_/g, " ")})</option>)}</select><input name="title" required placeholder="Quotation or specification title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input name="file" type="file" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /><textarea name="content_text" rows={7} placeholder="Type the quotation/specification here, or leave blank when attaching a file." className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" /><div><Submit>Send project file</Submit></div></form><Feedback state={fileState} />
      <Feedback state={categoryState} /><div className="mt-5 space-y-3">{files.map((file) => <article key={file.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-slate-900">{file.title}</h3><p className="text-xs text-slate-500">{file.category_name} · From {file.sender_name}{file.recipient_name ? ` to ${file.recipient_name}` : ""}</p></div>{file.file_url ? <a href={`/projects/files/${file.id}`} className="text-sm text-brand-700 hover:underline">Download attachment</a> : null}</div><EditableFile file={file} /></article>)}{files.length === 0 ? <p className="py-5 text-sm text-slate-400">No project files yet.</p> : null}</div>
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Project communication</h2><p className="mt-1 text-xs text-slate-500">Only the representative, district/division heads, and HQ personnel related to this project can participate.</p></div><div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3">{messages.map((message) => <div key={message.id} className="rounded-lg bg-white p-3 text-sm shadow-sm"><p className="font-medium text-slate-800">{message.sender_name}{message.recipient_name ? ` → ${message.recipient_name}` : ""}</p><p className="mt-1 whitespace-pre-wrap text-slate-600">{message.body}</p></div>)}{messages.length === 0 ? <p className="py-5 text-center text-sm text-slate-400">No messages yet.</p> : null}</div><form action={messageAction} className="mt-3 space-y-3"><input type="hidden" name="project_id" value={projectId} /><select name="recipient_id" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Message everyone related to this project</option>{participants.map((person) => <option key={person.id} value={person.id}>{person.full_name} ({person.role_name.replace(/_/g, " ")})</option>)}</select><textarea name="body" required rows={3} placeholder="Write a project message" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><Submit>Send message</Submit></form><Feedback state={messageState} /></section>
  </div>;
}