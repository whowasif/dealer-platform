"use client";

import { useRouter } from "next/navigation";

// -----------------------------------------------------------------------------
// Filter bar for the fee invoices list. Updates URL search params so the server
// component re-queries with the scope-safe filters. "overdue" is a virtual
// status (pending + past due).
// -----------------------------------------------------------------------------

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "waived", label: "Waived" },
];

const FEE_TYPES = [
  { value: "monthly_software", label: "Monthly software" },
  { value: "contract_renewal", label: "Contract renewal" },
  { value: "other", label: "Other" },
];

export function InvoiceFilters({
  current,
}: {
  current: { status: string; feeType: string; search: string; period: string };
}) {
  const router = useRouter();

  function apply(next: Partial<typeof current>) {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    if (merged.status) params.set("status", merged.status);
    if (merged.feeType) params.set("feeType", merged.feeType);
    if (merged.search) params.set("search", merged.search);
    if (merged.period) params.set("period", merged.period);
    const qs = params.toString();
    router.push(qs ? `/fees?${qs}` : "/fees");
  }

  const hasFilters =
    current.status || current.feeType || current.search || current.period;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <select
        value={current.status}
        onChange={(e) => apply({ status: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={current.feeType}
        onChange={(e) => apply({ feeType: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        <option value="">All fee types</option>
        {FEE_TYPES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <input
        type="month"
        value={current.period}
        onChange={(e) => apply({ period: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        aria-label="Period month"
      />

      <input
        type="search"
        defaultValue={current.search}
        placeholder="Search representative…"
        onKeyDown={(e) => {
          if (e.key === "Enter") apply({ search: e.currentTarget.value });
        }}
        className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />

      {hasFilters ? (
        <button
          type="button"
          onClick={() => router.push("/fees")}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
