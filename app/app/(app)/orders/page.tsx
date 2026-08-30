import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import { getRepresentativeIdByUser } from "@/lib/representatives";
import { listOrders, type OrderListFilters } from "@/lib/orders";
import { OrderFilters } from "./order-filters";
import { OrderStatusBadge, OrderTypeBadge } from "./status-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders — Dealer Network" };

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

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { type?: string; status?: string; from?: string; to?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const filters: OrderListFilters = {
    type: searchParams.type || null,
    status: searchParams.status || null,
    dateFrom: searchParams.from || null,
    dateTo: searchParams.to || null,
  };

  const [orders, repId] = await Promise.all([
    listOrders(user, filters),
    getRepresentativeIdByUser(user.id),
  ]);

  const isRep = repId != null;
  const hq = isHQ(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            {orders.length} order{orders.length === 1 ? "" : "s"}
            {hq ? " nationwide" : isRep ? "" : " in your area"}
          </p>
        </div>
        {isRep ? (
          <div className="flex items-center gap-2">
            <Link
              href="/orders/sale/new"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Record sale
            </Link>
            <Link
              href="/orders/new"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              + Place order
            </Link>
          </div>
        ) : null}
      </div>

      <OrderFilters
        current={{
          type: searchParams.type ?? "",
          status: searchParams.status ?? "",
          from: searchParams.from ?? "",
          to: searchParams.to ?? "",
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Order #</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Representative</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Net amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No orders match the current filters.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const mine = o.rep_user_id === user.id;
                return (
                  <tr key={o.id} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-brand-700">
                      <Link href={`/orders/${o.id}`} className="block">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <OrderTypeBadge type={o.order_type} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {mine ? (
                        <span className="font-medium text-slate-800">You</span>
                      ) : (
                        o.representative_name
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.customer_name ?? (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {fmtDate(o.order_date)}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {money(o.net_amount)}
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
