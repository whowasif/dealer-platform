import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getRepresentativeIdByUser } from "@/lib/representatives";
import { listProducts } from "@/lib/products";
import { WarehouseOrderForm } from "./warehouse-order-form";
import type { EditorProduct } from "../line-item-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Place order — Dealer Network" };

export default async function NewOrderPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Only representatives place warehouse orders — server-side gate.
  const repId = await getRepresentativeIdByUser(user.id);
  if (!repId) redirect("/orders");

  const products = await listProducts({ active: "active" });
  const editorProducts: EditorProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    cost_price: p.cost_price,
    retail_price: p.retail_price,
    wholesale_price: p.wholesale_price,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Place order</h1>
          <p className="mt-1 text-sm text-slate-500">
            Restock from the central Dhaka warehouse. Expected delivery in 1-2
            days after HQ approval.
          </p>
        </div>
        <Link
          href="/orders"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to orders
        </Link>
      </div>

      {editorProducts.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No active products are available to order right now.
        </div>
      ) : (
        <WarehouseOrderForm products={editorProducts} />
      )}
    </div>
  );
}
