import type { OrderStatus, OrderType } from "@/lib/types";

// -----------------------------------------------------------------------------
// Presentational badges for orders. Server components (no client hooks).
// -----------------------------------------------------------------------------

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  approved: "bg-blue-50 text-blue-700",
  processing: "bg-indigo-50 text-indigo-700",
  shipped: "bg-amber-50 text-amber-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  returned: "bg-orange-50 text-orange-700",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

const TYPE_STYLES: Record<OrderType, string> = {
  warehouse_order: "bg-teal-50 text-teal-700",
  customer_sale: "bg-purple-50 text-purple-700",
};

const TYPE_LABELS: Record<OrderType, string> = {
  warehouse_order: "Warehouse order",
  customer_sale: "Customer sale",
};

export function OrderTypeBadge({ type }: { type: OrderType }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        TYPE_STYLES[type] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}
