"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryListItem } from "@/lib/types";

// -----------------------------------------------------------------------------
// Filter bar for the product catalog. Updates the URL search params so the
// server component re-queries. Mirrors the representatives RepFilters pattern.
// -----------------------------------------------------------------------------

const TYPES = ["hardware", "software", "service"];

export function ProductFilters({
  categories,
  current,
}: {
  categories: CategoryListItem[];
  current: { search: string; category: string; type: string; active: string };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(current.search);

  function push(next: Partial<typeof current>) {
    const merged = { ...current, search, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.category) params.set("category", merged.category);
    if (merged.type) params.set("type", merged.type);
    if (merged.active) params.set("active", merged.active);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  }

  const hasFilters =
    current.search || current.category || current.type || current.active;

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
        placeholder="Search name or SKU…"
        className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />

      <select
        value={current.category}
        onChange={(e) => push({ category: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.parent_name ? `${c.parent_name} › ${c.name}` : c.name}
          </option>
        ))}
      </select>

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

      <select
        value={current.active}
        onChange={(e) => push({ active: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
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
            router.push("/products");
          }}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
