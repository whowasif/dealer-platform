import type { FeeInvoiceStatus } from "@/lib/types";

// -----------------------------------------------------------------------------
// Presentational badges for fee invoices and payment verification state.
// "Overdue" is virtual (a pending invoice past its due date), so it is rendered
// from the is_overdue flag rather than a stored status.
// -----------------------------------------------------------------------------

const INVOICE_STYLES: Record<FeeInvoiceStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-green-50 text-green-700",
  overdue: "bg-red-50 text-red-700",
  waived: "bg-slate-100 text-slate-600",
};

export function InvoiceStatusBadge({
  status,
  isOverdue,
}: {
  status: FeeInvoiceStatus;
  isOverdue?: boolean;
}) {
  // A pending invoice past due shows as "overdue" even if not yet persisted.
  const effective: FeeInvoiceStatus =
    isOverdue && status === "pending" ? "overdue" : status;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${INVOICE_STYLES[effective]}`}
    >
      {effective}
    </span>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      Verified
    </span>
  ) : (
    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
      Unverified
    </span>
  );
}
