import type { DocumentRelatedType } from "@/lib/types";

// -----------------------------------------------------------------------------
// Presentational badges for the documents feature. Server components (no hooks).
// -----------------------------------------------------------------------------

/** A soft coloured pill for the document category name. */
export function CategoryBadge({ name }: { name: string }) {
  return (
    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-700">
      {name.replace(/_/g, " ")}
    </span>
  );
}

/** Verified / unverified indicator. */
export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      Verified
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
      Unverified
    </span>
  );
}

const RELATED_STYLES: Record<DocumentRelatedType, string> = {
  representative: "bg-brand-50 text-brand-700",
  project: "bg-indigo-50 text-indigo-700",
  order: "bg-blue-50 text-blue-700",
  customer: "bg-teal-50 text-teal-700",
  user: "bg-slate-100 text-slate-700",
};

/** A small pill describing what the document is linked to. */
export function LinkedEntity({
  relatedType,
  label,
}: {
  relatedType: DocumentRelatedType | null;
  label: string | null;
}) {
  if (!label) {
    return <span className="text-xs text-slate-400">Unlinked</span>;
  }
  const style =
    (relatedType && RELATED_STYLES[relatedType]) ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
