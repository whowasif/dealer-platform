"use client";

import { useRouter } from "next/navigation";

// -----------------------------------------------------------------------------
// Filter bar for the order list. Pushes URL search params so the server
// component re-queries. Type / status / date range.
// -----------------------------------------------------------------------------

const TYPES = [
  { value: "warehouse_order", label: "Warehouse order" },
  { value: "customer_sale", label: "Customer sale" },
];

const STATUSES = [
  "pending",
  "approved",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

export function OrderFilters({
  current,
}: {
  current: { type: string; status: string; from: string; to: string };
}) {
  const router = useRouter();

  function push(next: Partial<typeof current>) {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    if (merged.type) params.set("type", merged.type);
    if (merged.status) params.set("status", merged.status);
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    const qs = params.toString();
    router.push(qs ? `/orders?${qs}` : "/orders");
  }

  const hasFilters =
    current.type || current.status || current.from || current.to;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Type</span>
        <select
          value={current.type}
          onChange={(e) => push({ type: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Status
        </span>
        <select
          value={current.status}
          onChange={(e) => push({ status: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm capitalize"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">From</span>
        <input
          type="date"
          value={current.from}
          onChange={(e) => push({ from: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">To</span>
        <input
          type="date"
          value={current.to}
          onChange={(e) => push({ to: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </label>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => router.push("/orders")}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
