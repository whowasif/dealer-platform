"use client";

import { useRouter } from "next/navigation";

// -----------------------------------------------------------------------------
// Filter bar for the HQ audit log viewer. Pushes URL search params so the server
// component re-queries. Table/action option lists come from the distinct values
// present in the log.
// -----------------------------------------------------------------------------

export function AuditFilters({
  current,
  tables,
  actions,
}: {
  current: { table: string; action: string; from: string; to: string };
  tables: string[];
  actions: string[];
}) {
  const router = useRouter();

  function apply(next: Partial<typeof current>) {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    if (merged.table) params.set("table", merged.table);
    if (merged.action) params.set("action", merged.action);
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    const qs = params.toString();
    router.push(qs ? `/audit?${qs}` : "/audit");
  }

  const hasFilters =
    current.table || current.action || current.from || current.to;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <select
        value={current.table}
        onChange={(e) => apply({ table: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        <option value="">All tables</option>
        {tables.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        value={current.action}
        onChange={(e) => apply({ action: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        <option value="">All actions</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm text-slate-500">
        From
        <input
          type="date"
          value={current.from}
          onChange={(e) => apply({ from: e.target.value })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-slate-500">
        To
        <input
          type="date"
          value={current.to}
          onChange={(e) => apply({ to: e.target.value })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => router.push("/audit")}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
