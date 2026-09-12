"use client";

import { useRouter, useSearchParams } from "next/navigation";

// -----------------------------------------------------------------------------
// Sub-section tabs for the Documents library. Each tab maps to a related_type
// filter (project / user / representative), plus an "All" tab. Selecting a tab
// updates the `tab` search param while preserving the other filters.
// -----------------------------------------------------------------------------

const TABS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "project", label: "Project documents" },
  { key: "user", label: "User documents" },
  { key: "representative", label: "Representative documents" },
];

export function DocTabs({
  active,
  counts,
}: {
  active: string;
  counts: { project: number; user: number; representative: number; all: number };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function select(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key) next.set("tab", key);
    else next.delete("tab");
    const qs = next.toString();
    router.push(qs ? `/documents?${qs}` : "/documents");
  }

  function countFor(key: string): number {
    if (key === "project") return counts.project;
    if (key === "user") return counts.user;
    if (key === "representative") return counts.representative;
    return counts.all;
  }

  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key || "all"}
            type="button"
            onClick={() => select(t.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              isActive
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {countFor(t.key)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
