import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageCatalog } from "@/lib/inventory";
import { listActiveCategories } from "@/lib/categories";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New product — Dealer Network" };

export default async function NewProductPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // Server-side authorization: not just UI hiding.
  if (!canManageCatalog(user)) redirect("/products");

  const categories = await listActiveCategories();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New product</h1>
          <p className="mt-1 text-sm text-slate-500">
            Added to the catalog with a central warehouse stock of 0. Record
            stock afterwards on the product page.
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to products
        </Link>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
