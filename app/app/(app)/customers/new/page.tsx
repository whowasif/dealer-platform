import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getRepresentativeIdByUser } from "@/lib/representatives";
import { listUpazilas } from "@/lib/users";
import { CustomerForm } from "../customer-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New customer — Dealer Network" };

export default async function NewCustomerPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Only representatives own customers — server-side gate, not just UI hiding.
  const repId = await getRepresentativeIdByUser(user.id);
  if (!repId) redirect("/customers");

  const upazilas = await listUpazilas();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New customer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Added under your representative record. Use for recording customer
            sales.
          </p>
        </div>
        <Link
          href="/customers"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to customers
        </Link>
      </div>

      <CustomerForm upazilas={upazilas} />
    </div>
  );
}
