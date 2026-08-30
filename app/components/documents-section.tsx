import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { listDocumentsForEntity } from "@/lib/documents";
import type { DocumentRelatedType } from "@/lib/types";
import {
  CategoryBadge,
  VerifiedBadge,
} from "@/app/(app)/documents/doc-badges";

// -----------------------------------------------------------------------------
// Compact, reusable "Documents" section for entity detail pages (rep / project
// / order / customer). Lists the documents linked to that entity (scope still
// enforced by listDocumentsForEntity) and offers an "Upload document" link that
// pre-scopes /documents/new to this entity. Server component.
// -----------------------------------------------------------------------------

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function DocumentsSection({
  relatedType,
  relatedId,
}: {
  relatedType: DocumentRelatedType;
  relatedId: string;
}) {
  const user = await getSessionUser();
  if (!user) return null;

  const documents = await listDocumentsForEntity(user, relatedType, relatedId);
  const uploadHref = `/documents/new?related_type=${relatedType}&related_id=${relatedId}`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Documents
        </h2>
        <Link
          href={uploadHref}
          className="rounded-lg border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
        >
          + Upload document
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Doc #</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  No documents linked yet.
                </td>
              </tr>
            ) : (
              documents.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">
                    <Link href={`/documents/${d.id}`} className="block">
                      {d.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <CategoryBadge name={d.category_name} />
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {d.document_number || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {fmtDate(d.document_date)}
                  </td>
                  <td className="px-3 py-2">
                    <VerifiedBadge verified={d.verified} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
