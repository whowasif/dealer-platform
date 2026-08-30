"use client";

import { useRouter } from "next/navigation";

// -----------------------------------------------------------------------------
// Reports filter bar. Adjusts the trend window (number of months) via URL search
// params so the scope-safe server component re-queries. Kept intentionally
// simple — scope itself is always enforced server-side, never here.
// -----------------------------------------------------------------------------

const MONTH_OPTIONS = [
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "24", label: "Last 24 months" },
];

export function ReportFilters({ months }: { months: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="text-sm text-slate-600">Trend window</label>
      <select
        value={months || "12"}
        onChange={(e) => {
          const params = new URLSearchParams();
          params.set("months", e.target.value);
          router.push(`/reports?${params.toString()}`);
        }}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        {MONTH_OPTIONS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <a
        href="/reports/export?type=rollup"
        className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Export roll-up (CSV)
      </a>
      <a
        href="/reports/export?type=top-reps"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Export top reps (CSV)
      </a>
    </div>
  );
}
