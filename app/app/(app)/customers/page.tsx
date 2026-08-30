import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import { getRepresentativeIdByUser } from "@/lib/representatives";
import { listCustomers, type CustomerListFilters } from "@/lib/customers";
import { CustomerFilters } from "./customer-filters";
import { CustomerTypeBadge } from "./type-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers — Dealer Network" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { search?: string; type?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const filters: CustomerListFilters = {
    search: searchParams.search || null,
    type: searchParams.type || null,
  };

  const [customers, repId] = await Promise.all([
    listCustomers(user, filters),
    getRepresentativeIdByUser(user.id),
  ]);

  // Only reps own customers; HQ/heads view (scoped) but don't create here.
  const canCreate = repId != null;
  const showRepColumn = !user || isHQ(user) || !repId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">
            {customers.length} customer{customers.length === 1 ? "" : "s"}
            {isHQ(user) ? " nationwide" : repId ? "" : " in your area"}
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/customers/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + New customer
          </Link>
        ) : null}
      </div>

      <CustomerFilters
        current={{
          search: searchParams.search ?? "",
          type: searchParams.type ?? "",
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Organization</th>
              {showRepColumn ? (
                <th className="px-4 py-3 font-medium">Representative</th>
              ) : null}
              <th className="px-4 py-3 font-medium">Upazila</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={showRepColumn ? 6 : 5}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No customers match the current filters.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/customers/${c.id}`} className="block">
                      {c.name}
                      {c.email ? (
                        <span className="block text-xs font-normal text-slate-400">
                          {c.email}
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <CustomerTypeBadge type={c.type} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.phone ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.organization_name ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  {showRepColumn ? (
                    <td className="px-4 py-3 text-slate-600">
                      {c.representative_name}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-slate-600">
                    {c.upazila_name ?? <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
