import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageCatalog, listMovements } from "@/lib/inventory";
import { getProduct } from "@/lib/products";
import { listActiveCategories } from "@/lib/categories";
import { TypeBadge, MovementBadge } from "../type-badge";
import { ProductForm } from "../product-form";
import { StockPanel } from "./stock-panel";

export const dynamic = "force-dynamic";

function money(v: string | number | null): string {
  const n = Number(v ?? 0);
  return "৳" + n.toLocaleString("en-BD");
}

function fmtDateTime(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const product = await getProduct(params.id);
  if (!product) notFound();

  const canManage = canManageCatalog(user);

  const [movements, categories] = await Promise.all([
    listMovements(product.id, 50),
    canManage ? listActiveCategories() : Promise.resolve([]),
  ]);

  const low = product.available <= product.min_stock_alert;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            <TypeBadge type={product.type} />
            {product.is_active ? (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-mono">{product.sku}</span>
            {product.category_name ? ` · ${product.category_name}` : ""}
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back
        </Link>
      </div>

      {/* Info & pricing & stock */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Details
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Unit" value={product.unit} />
            <Row label="Warranty" value={`${product.warranty_months} months`} />
            <Row
              label="Bangla name"
              value={product.bn_name ?? <span className="text-slate-400">—</span>}
            />
            <Row
              label="Low-stock alert"
              value={`≤ ${product.min_stock_alert}`}
            />
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pricing
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Cost price" value={money(product.cost_price)} />
            <Row label="Retail price" value={money(product.retail_price)} />
            <Row
              label="Wholesale price"
              value={
                product.wholesale_price != null
                  ? money(product.wholesale_price)
                  : <span className="text-slate-400">—</span>
              }
            />
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Central warehouse stock
          </h2>
          <div className="flex items-end gap-4">
            <div>
              <p
                className={`text-3xl font-bold ${
                  low ? "text-red-600" : "text-slate-900"
                }`}
              >
                {product.available}
              </p>
              <p className="text-xs text-slate-500">Available</p>
            </div>
            <div className="text-xs text-slate-500">
              <p>
                Total: <strong className="text-slate-800">{product.quantity}</strong>
              </p>
              <p>
                Reserved: <strong className="text-slate-800">{product.reserved}</strong>
              </p>
            </div>
          </div>
          {low ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              Low stock — available quantity is at or below the alert threshold
              of {product.min_stock_alert}.
            </p>
          ) : null}
        </div>
      </section>

      {product.description ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Description
          </h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {product.description}
          </p>
        </section>
      ) : null}

      {/* Stock panel — HQ managers only */}
      {canManage ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Manage stock
          </h2>
          <StockPanel productId={product.id} />
        </section>
      ) : null}

      {/* Movement history */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Movement history
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium">By</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-slate-600">
                      {fmtDateTime(m.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <MovementBadge type={m.movement_type} />
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {m.quantity}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {m.reference_no ?? (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {m.created_by_name}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {m.notes ?? <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit product — HQ managers only */}
      {canManage ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <details>
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-slate-500">
              Edit product
            </summary>
            <div className="mt-4">
              <ProductForm categories={categories} product={product} />
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
