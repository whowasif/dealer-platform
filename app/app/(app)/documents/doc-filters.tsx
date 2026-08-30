"use client";

import { useRouter } from "next/navigation";
import type { DocumentCategoryRow } from "@/lib/types";

// -----------------------------------------------------------------------------
// Filter bar for the documents library. Pushes URL search params so the server
// component re-queries with scope-safe filters (category, related type,
// verified status, and a title/document-number search).
// -----------------------------------------------------------------------------

const RELATED_TYPES = [
  "representative",
  "project",
  "order",
  "customer",
  "user",
];

export function DocumentFilters({
  categories,
  current,
}: {
  categories: DocumentCategoryRow[];
  current: {
    category: string;
    related_type: string;
    verified: string;
    search: string;
  };
}) {
  const router = useRouter();

  function apply(next: Partial<typeof current>) {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    if (merged.category) params.set("category", merged.category);
    if (merged.related_type) params.set("related_type", merged.related_type);
    if (merged.verified) params.set("verified", merged.verified);
    if (merged.search) params.set("search", merged.search);
    const qs = params.toString();
    router.push(qs ? `/documents?${qs}` : "/documents");
  }

  const hasFilters =
    current.category ||
    current.related_type ||
    current.verified ||
    current.search;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        apply({ search: String(data.get("search") ?? "") });
      }}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Category
        </span>
        <select
          value={current.category}
          onChange={(e) => apply({ category: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm capitalize"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Linked to
        </span>
        <select
          value={current.related_type}
          onChange={(e) => apply({ related_type: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm capitalize"
        >
          <option value="">All types</option>
          {RELATED_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Verified
        </span>
        <select
          value={current.verified}
          onChange={(e) => apply({ verified: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Any</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Search
        </span>
        <input
          name="search"
          defaultValue={current.search}
          placeholder="Title or document #"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </label>

      <button
        type="submit"
        className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
      >
        Search
      </button>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => router.push("/documents")}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
