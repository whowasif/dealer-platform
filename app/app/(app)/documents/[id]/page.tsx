import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDocument, canViewDocument, canManageDocuments } from "@/lib/documents";
import { CategoryBadge, VerifiedBadge, LinkedEntity } from "../doc-badges";
import { DocControls } from "./doc-controls";

export const dynamic = "force-dynamic";

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

function fmtSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Map a related_type to its detail-page link, when we have an id. */
function linkHref(
  relatedType: string | null,
  relatedId: string | null
): string | null {
  if (!relatedId) return null;
  switch (relatedType) {
    case "representative":
      return `/representatives/${relatedId}`;
    case "project":
      return `/projects/${relatedId}`;
    case "order":
      return `/orders/${relatedId}`;
    case "customer":
      return `/customers/${relatedId}`;
    default:
      return null;
  }
}

export default async function DocumentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const doc = await getDocument(params.id);
  if (!doc) notFound();

  // Server-side authorization: not just UI hiding.
  if (!canViewDocument(user, doc)) redirect("/documents");

  const canManage = canManageDocuments(user);
  const fileUrl = `/documents/${doc.id}/file`;

  const isImage = (doc.mime_type ?? "").startsWith("image/");
  const isPdf = doc.mime_type === "application/pdf";
  const entityHref = linkHref(doc.related_type, doc.related_id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{doc.title}</h1>
            <CategoryBadge name={doc.category_name} />
            <VerifiedBadge verified={doc.verified} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Uploaded by {doc.uploaded_by_name ?? "—"} · {fmtDate(doc.uploaded_at)}
          </p>
        </div>
        <Link
          href="/documents"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Metadata */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Details
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Category" value={doc.category_name.replace(/_/g, " ")} />
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Linked to</dt>
              <dd className="text-right">
                {entityHref ? (
                  <Link
                    href={entityHref}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    <LinkedEntity
                      relatedType={doc.related_type}
                      label={doc.link_label}
                    />
                  </Link>
                ) : (
                  <LinkedEntity
                    relatedType={doc.related_type}
                    label={doc.link_label}
                  />
                )}
              </dd>
            </div>
            <Row label="Document #" value={doc.document_number || "—"} />
            <Row label="Document date" value={fmtDate(doc.document_date)} />
            <Row label="Amount" value={money(doc.amount)} />
            <Row label="Expiry date" value={fmtDate(doc.expiry_date)} />
            <Row label="File type" value={doc.mime_type || "—"} />
            <Row label="File size" value={fmtSize(doc.file_size)} />
            {doc.verified ? (
              <Row
                label="Verified by"
                value={`${doc.verified_by_name ?? "—"} · ${fmtDate(doc.verified_at)}`}
              />
            ) : null}
          </dl>

          {doc.tags.length > 0 ? (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {doc.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {doc.notes ? (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-sm text-slate-600">
                {doc.notes}
              </p>
            </div>
          ) : null}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Download / open
            </a>
          </div>
        </section>

        {/* Preview */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Preview
          </h2>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={doc.title}
              className="max-h-[70vh] w-full rounded-lg border border-slate-200 object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={doc.title}
              className="h-[70vh] w-full rounded-lg border border-slate-200"
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-16 text-center">
              <p className="text-sm text-slate-500">
                No inline preview for this file type.
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Download file
              </a>
            </div>
          )}
        </section>
      </div>

      {/* HQ controls */}
      {canManage ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Manage (HQ)
          </h2>
          <DocControls documentId={doc.id} verified={doc.verified} />
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
