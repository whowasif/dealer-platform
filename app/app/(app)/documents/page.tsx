import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { repScopeForUser } from "@/lib/representatives";
import {
  listDocuments,
  listCategories,
  type DocumentListFilters,
} from "@/lib/documents";
import { DocumentFilters } from "./doc-filters";
import { CategoryBadge, VerifiedBadge, LinkedEntity } from "./doc-badges";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents — Dealer Network" };

function money(v: string | number | null): string {
  if (v == null) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: {
    category?: string;
    related_type?: string;
    verified?: string;
    search?: string;
  };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const filters: DocumentListFilters = {
    category: searchParams.category || null,
    relatedType: searchParams.related_type || null,
    verified: searchParams.verified || null,
    search: searchParams.search || null,
  };

  const [documents, categories] = await Promise.all([
    listDocuments(user, filters),
    listCategories(),
  ]);

  const scope = repScopeForUser(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {scope.selfOnly ? "My documents" : "Documents"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {documents.length} document{documents.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/documents/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          + Upload document
        </Link>
      </div>

      <DocumentFilters
        categories={categories}
        current={{
          category: searchParams.category ?? "",
          related_type: searchParams.related_type ?? "",
          verified: searchParams.verified ?? "",
          search: searchParams.search ?? "",
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Linked to</th>
              <th className="px-4 py-3 font-medium">Doc #</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No documents match the current filters.
                </td>
              </tr>
            ) : (
              documents.map((d) => (
                <tr key={d.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/documents/${d.id}`} className="block">
                      {d.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadge name={d.category_name} />
                  </td>
                  <td className="px-4 py-3">
                    <LinkedEntity
                      relatedType={d.related_type}
                      label={d.link_label}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {d.document_number || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmtDate(d.document_date)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {money(d.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <VerifiedBadge verified={d.verified} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="block">{d.uploaded_by_name ?? "—"}</span>
                    <span className="block text-xs text-slate-400">
                      {fmtDate(d.uploaded_at)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
