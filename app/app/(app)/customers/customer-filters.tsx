"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// -----------------------------------------------------------------------------
// Filter bar for the customer list. Pushes URL search params so the server
// component re-queries. Mirrors the products ProductFilters pattern.
// -----------------------------------------------------------------------------

const TYPES = ["retail", "institutional", "government"];

export function CustomerFilters({
  current,
}: {
  current: { search: string; type: string };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(current.search);

  function push(next: Partial<typeof current>) {
    const merged = { ...current, search, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.type) params.set("type", merged.type);
    const qs = params.toString();
    router.push(qs ? `/customers?${qs}` : "/customers");
  }

  const hasFilters = current.search || current.type;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        push({});
      }}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, phone or organization…"
        className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />

      <select
        value={current.type}
        onChange={(e) => push({ type: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm capitalize"
      >
        <option value="">All types</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-900"
      >
        Search
      </button>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            router.push("/customers");
          }}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
