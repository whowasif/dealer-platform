import type { CustomerType } from "@/lib/types";

// -----------------------------------------------------------------------------
// Presentational badge for customer type. Server component (no client hooks).
// -----------------------------------------------------------------------------

const TYPE_STYLES: Record<CustomerType, string> = {
  retail: "bg-slate-100 text-slate-600",
  institutional: "bg-blue-50 text-blue-700",
  government: "bg-purple-50 text-purple-700",
};

export function CustomerTypeBadge({ type }: { type: CustomerType }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        TYPE_STYLES[type] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {type}
    </span>
  );
}
