import type { MovementType, ProductType } from "@/lib/types";

// -----------------------------------------------------------------------------
// Small presentational badges reused across the products feature.
// Server components (no client hooks) so they can render anywhere.
// -----------------------------------------------------------------------------

const TYPE_STYLES: Record<ProductType, string> = {
  hardware: "bg-blue-50 text-blue-700",
  software: "bg-purple-50 text-purple-700",
  service: "bg-teal-50 text-teal-700",
};

export function TypeBadge({ type }: { type: ProductType }) {
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

const MOVEMENT_STYLES: Record<MovementType, string> = {
  stock_in: "bg-green-50 text-green-700",
  return: "bg-emerald-50 text-emerald-700",
  adjustment: "bg-amber-50 text-amber-700",
  stock_out: "bg-red-50 text-red-700",
  sale: "bg-slate-100 text-slate-600",
};

export function MovementBadge({ type }: { type: MovementType }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        MOVEMENT_STYLES[type] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}
