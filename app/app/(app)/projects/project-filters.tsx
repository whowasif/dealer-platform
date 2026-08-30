"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { DistrictRow, DivisionRow } from "@/lib/types";

// -----------------------------------------------------------------------------
// Filter bar for the projects list. Pushes URL search params so the server
// component re-queries with scope-safe filters. Status / geography / year.
// Geography selects are only shown when the viewer is allowed to see > 1 area.
// -----------------------------------------------------------------------------

const STATUSES = [
  "draft",
  "in_progress",
  "completed",
  "profit_distributed",
  "cancelled",
];

export function ProjectFilters({
  divisions,
  districts,
  showGeography,
  years,
  current,
}: {
  divisions: DivisionRow[];
  districts: DistrictRow[];
  showGeography: boolean;
  years: number[];
  current: { status: string; division: string; district: string; year: string };
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
    if (next.division !== undefined) merged.district = "";
    const params = new URLSearchParams();
    if (merged.status) params.set("status", merged.status);
    if (merged.division) params.set("division", merged.division);
    if (merged.district) params.set("district", merged.district);
    if (merged.year) params.set("year", merged.year);
    const qs = params.toString();
    router.push(qs ? `/projects?${qs}` : "/projects");
  }

  const hasFilters =
    current.status || current.division || current.district || current.year;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Status
        </span>
        <select
          value={current.status}
          onChange={(e) => apply({ status: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm capitalize"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      {showGeography ? (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Division
            </span>
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
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              District
            </span>
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
          </label>
        </>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Profit year
        </span>
        <select
          value={current.year}
          onChange={(e) => apply({ year: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </label>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
