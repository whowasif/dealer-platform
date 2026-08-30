import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getRepresentativeIdByUser } from "@/lib/representatives";
import { getCustomer, canAccessCustomer } from "@/lib/customers";
import { listCustomerSales } from "@/lib/orders";
import { listUpazilas } from "@/lib/users";
import { CustomerTypeBadge } from "../type-badge";
import { OrderStatusBadge } from "../../orders/status-badge";
import { CustomerForm } from "../customer-form";
import { DocumentsSection } from "@/components/documents-section";

export const dynamic = "force-dynamic";

function money(v: string | number | null): string {
  const n = Number(v ?? 0);
  return "৳" + n.toLocaleString("en-BD");
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const customer = await getCustomer(params.id);
  if (!customer) notFound();
  if (!canAccessCustomer(user, customer)) redirect("/customers");

  const [sales, repId, upazilas] = await Promise.all([
    listCustomerSales(customer.id),
    getRepresentativeIdByUser(user.id),
    listUpazilas(),
  ]);

  // The owning representative may edit their own customer.
  const canEdit = repId != null && repId === customer.representative_id;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
            <CustomerTypeBadge type={customer.type} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {customer.organization_name
              ? `${customer.organization_name} · `
              : ""}
            Managed by {customer.representative_name}
          </p>
        </div>
        <Link
          href="/customers"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contact
          </h2>
          <dl className="space-y-2 text-sm">
            <Row
              label="Phone"
              value={customer.phone ?? <span className="text-slate-400">—</span>}
            />
            <Row
              label="Email"
              value={customer.email ?? <span className="text-slate-400">—</span>}
            />
            <Row
              label="Upazila"
              value={
                customer.upazila_name ?? <span className="text-slate-400">—</span>
              }
            />
            <Row
              label="Address"
              value={
                customer.address ?? <span className="text-slate-400">—</span>
              }
            />
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {customer.notes ?? (
              <span className="text-slate-400">No notes recorded.</span>
            )}
          </p>
        </div>
      </section>

      {/* Sales history */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sales history
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Net amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    No sales recorded for this customer yet.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs text-brand-700">
                      <Link href={`/orders/${s.id}`}>{s.order_number}</Link>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {fmtDate(s.order_date)}
                    </td>
                    <td className="px-3 py-2">
                      <OrderStatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {money(s.net_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit — owning rep only */}
      {canEdit ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <details>
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-slate-500">
              Edit customer
            </summary>
            <div className="mt-4">
              <CustomerForm upazilas={upazilas} customer={customer} />
            </div>
          </details>
        </section>
      ) : null}

      {/* Documents */}
      <DocumentsSection relatedType="customer" relatedId={customer.id} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
