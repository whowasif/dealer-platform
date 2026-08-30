import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getRepresentativeIdByUser } from "@/lib/representatives";
import { listProducts } from "@/lib/products";
import { listCustomers } from "@/lib/customers";
import { CustomerSaleForm, type SaleCustomer } from "./customer-sale-form";
import type { EditorProduct } from "../../line-item-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record sale — Dealer Network" };

export default async function NewSalePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Only representatives record customer sales — server-side gate.
  const repId = await getRepresentativeIdByUser(user.id);
  if (!repId) redirect("/orders");

  const [products, customers] = await Promise.all([
    listProducts({ active: "active" }),
    listCustomers(user),
  ]);

  const editorProducts: EditorProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    cost_price: p.cost_price,
    retail_price: p.retail_price,
    wholesale_price: p.wholesale_price,
  }));

  // listCustomers is already scoped to this rep (selfOnly) for a representative.
  const saleCustomers: SaleCustomer[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Record sale</h1>
          <p className="mt-1 text-sm text-slate-500">
            Record a completed sale to one of your customers. Recorded as
            delivered immediately.
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
          No active products are available to sell right now.
        </div>
      ) : (
        <CustomerSaleForm products={editorProducts} customers={saleCustomers} />
      )}
    </div>
  );
}
