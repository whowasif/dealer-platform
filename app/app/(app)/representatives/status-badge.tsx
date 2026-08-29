import type { ContractStatus, RepresentativeStatus } from "@/lib/types";

// -----------------------------------------------------------------------------
// Small presentational badges reused across the representatives feature.
// Server component (no client hooks) so it can render anywhere.
// -----------------------------------------------------------------------------

const REP_STYLES: Record<RepresentativeStatus, string> = {
  applied: "bg-slate-100 text-slate-600",
  approved: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
  suspended: "bg-amber-50 text-amber-700",
  terminated: "bg-red-50 text-red-700",
  resigned: "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: RepresentativeStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        REP_STYLES[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

const CONTRACT_STYLES: Record<ContractStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_signature: "bg-amber-50 text-amber-700",
  active: "bg-green-50 text-green-700",
  expired: "bg-slate-100 text-slate-500",
  terminated: "bg-red-50 text-red-700",
  renewed: "bg-blue-50 text-blue-700",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        CONTRACT_STYLES[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
