import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageCatalog } from "@/lib/inventory";
import { listProducts, type ProductListFilters } from "@/lib/products";
import { listActiveCategories } from "@/lib/categories";
import { ProductFilters } from "./product-filters";
import { TypeBadge } from "./type-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products — Dealer Network" };

function money(v: string | number | null): string {
  const n = Number(v ?? 0);
  return "৳" + n.toLocaleString("en-BD");
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    category?: string;
    type?: string;
    active?: string;
  };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const filters: ProductListFilters = {
    search: searchParams.search || null,
    categoryId: searchParams.category || null,
    type: searchParams.type || null,
    active: searchParams.active || null,
  };

  const [products, categories] = await Promise.all([
    listProducts(filters),
    listActiveCategories(),
  ]);

  const canManage = canManageCatalog(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            {products.length} product{products.length === 1 ? "" : "s"} · central
            Dhaka warehouse
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <Link
              href="/products/categories"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Manage categories
            </Link>
            <Link
              href="/products/new"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              + New product
            </Link>
          </div>
        ) : null}
      </div>

      <ProductFilters
        categories={categories}
        current={{
          search: searchParams.search ?? "",
          category: searchParams.category ?? "",
          type: searchParams.type ?? "",
          active: searchParams.active ?? "",
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Cost</th>
              <th className="px-4 py-3 font-medium">Retail</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No products match the current filters.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const low = p.available <= p.min_stock_alert;
                return (
                  <tr key={p.id} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link href={`/products/${p.id}`} className="block">
                        {p.name}
                        {p.bn_name ? (
                          <span className="block text-xs font-normal text-slate-400">
                            {p.bn_name}
                          </span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {p.sku}
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={p.type} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.category_name ?? (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {money(p.cost_price)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {money(p.retail_price)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          low
                            ? "font-semibold text-red-600"
                            : "font-medium text-slate-800"
                        }
                      >
                        {p.available}
                      </span>
                      <span className="text-slate-400"> / {p.quantity}</span>
                      {low ? (
                        <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                          low
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
