import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getProjectFile } from "@/lib/project-workflow";

export const dynamic = "force-dynamic";

export default async function PrintProjectFilePage({ params }: { params: { id: string } }) {
  const actor = await getSessionUser();
  if (!actor) redirect("/login");
  const file = await getProjectFile(params.id, actor);
  if (!file || !file.content_text) notFound();
  return <main className="mx-auto max-w-3xl p-10 text-slate-900 print:p-0"><div className="mb-6 flex items-center justify-between print:hidden"><h1 className="text-xl font-bold">{file.title}</h1><button id="print-file" className="rounded border border-slate-300 px-3 py-2 text-sm" type="button">Print</button></div><article className="whitespace-pre-wrap font-serif text-base leading-7"><h1 className="mb-8 text-center text-2xl font-bold">{file.title}</h1>{file.content_text}</article><script dangerouslySetInnerHTML={{ __html: "window.addEventListener('load', function () { document.getElementById('print-file')?.addEventListener('click', function () { window.print(); }); });" }} /></main>;
}