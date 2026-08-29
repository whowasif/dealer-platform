"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { DistrictRow, DivisionRow } from "@/lib/types";

// -----------------------------------------------------------------------------
// Filter bar for the representatives list. Updates the URL search params so the
// server component re-queries with the scope-safe filters.
// -----------------------------------------------------------------------------

const STATUSES = [
  "applied",
  "approved",
  "active",
  "suspended",
  "terminated",
  "resigned",
];

export function RepFilters({
  divisions,
  districts,
  showGeography,
  current,
}: {
  divisions: DivisionRow[];
  districts: DistrictRow[];
  showGeography: boolean;
  current: { division: string; district: string; status: string; package: string };
}) {
  const router = useRouter();

  const filteredDistricts = useMemo(
    () =>
      current.division
        ? districts.filter((d) => d.division_id === current.division)
        : districts,
    [districts, current.division]
  );

  function apply(next: Partial<typeof current>) {
    const merged = { ...current, ...next };
    // Changing division clears a now-inconsistent district selection.
    if (next.division !== undefined) merged.district = "";
    const params = new URLSearchParams();
    if (merged.division) params.set("division", merged.division);
    if (merged.district) params.set("district", merged.district);
    if (merged.status) params.set("status", merged.status);
    if (merged.package) params.set("package", merged.package);
    const qs = params.toString();
    router.push(qs ? `/representatives?${qs}` : "/representatives");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {showGeography ? (
        <>
          <select
            value={current.division}
            onChange={(e) => apply({ division: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All divisions</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={current.district}
            onChange={(e) => apply({ district: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All districts</option>
            {filteredDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </>
      ) : null}

      <select
        value={current.status}
        onChange={(e) => apply({ status: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm capitalize"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={current.package}
        onChange={(e) => apply({ package: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        <option value="">All packages</option>
        <option value="standard">Standard</option>
        <option value="premium">Premium</option>
      </select>

      {(current.division || current.district || current.status || current.package) ? (
        <button
          type="button"
          onClick={() => router.push("/representatives")}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
