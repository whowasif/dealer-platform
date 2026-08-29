import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageCatalog } from "@/lib/inventory";
import { listCategories } from "@/lib/categories";
import { CategoryForm } from "./category-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Product categories — Dealer Network" };

export default async function CategoriesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // Server-side authorization: not just UI hiding.
  if (!canManageCatalog(user)) redirect("/products");

  const categories = await listCategories();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Product categories
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} ·
            organise the catalog into a two-level tree.
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to products
        </Link>
      </div>

      {/* Add new */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Add category
        </h2>
        <CategoryForm categories={categories} />
      </section>

      {/* Existing */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Existing categories
        </h2>

        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No categories yet. Add the first one above.
          </p>
        ) : (
          <div className="space-y-3">
            {categories.map((c) => (
              <details
                key={c.id}
                className="rounded-lg border border-slate-200"
              >
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {c.parent_name ? (
                        <span className="text-slate-400">
                          {c.parent_name} ›{" "}
                        </span>
                      ) : null}
                      {c.name}
                    </span>
                    {c.bn_name ? (
                      <span className="text-xs text-slate-400">{c.bn_name}</span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">sort {c.sort_order}</span>
                    {c.is_active ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                        Inactive
                      </span>
                    )}
                  </span>
                </summary>
                <div className="border-t border-slate-100 px-4 py-4">
                  <CategoryForm categories={categories} editing={c} />
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
