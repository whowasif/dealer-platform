import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  getOrder,
  getOrderItems,
  getOrderHistory,
  canViewOrder,
} from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";
import { OrderStatusBadge, OrderTypeBadge } from "../status-badge";
import { StatusControls, type StatusAction } from "./status-controls";
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

// Warehouse-order transitions available from each status (mirrors lib/orders.ts).
const NEXT_BY_STATUS: Record<OrderStatus, StatusAction[]> = {
  pending: [
    { status: "approved", label: "Approve (reserve stock)", tone: "primary" },
    { status: "cancelled", label: "Cancel", tone: "danger" },
  ],
  approved: [
    { status: "processing", label: "Start processing", tone: "primary" },
    { status: "cancelled", label: "Cancel (release stock)", tone: "danger" },
  ],
  processing: [
    { status: "shipped", label: "Mark shipped", tone: "primary" },
    { status: "cancelled", label: "Cancel (release stock)", tone: "danger" },
  ],
  shipped: [
    { status: "delivered", label: "Mark delivered (decrement stock)", tone: "primary" },
    { status: "cancelled", label: "Cancel (release stock)", tone: "danger" },
  ],
  delivered: [{ status: "returned", label: "Mark returned", tone: "neutral" }],
  cancelled: [],
  returned: [],
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const order = await getOrder(params.id);
  if (!order) notFound();
  if (!canViewOrder(user, order)) redirect("/orders");

  const [items, history] = await Promise.all([
    getOrderItems(order.id),
    getOrderHistory(order.id),
  ]);

  const hq = isHQ(user);
  const isOwner = order.rep_user_id === user.id;

  // Compute which status controls the current viewer may use.
  let actions: StatusAction[] = [];
  if (order.order_type === "warehouse_order") {
    const candidates = NEXT_BY_STATUS[order.status] ?? [];
    actions = candidates.filter((a) => {
      if (a.status === "cancelled") {
        // HQ can cancel; a rep can cancel their own order only while pending.
        return hq || (isOwner && order.status === "pending");
      }
      // approval / fulfilment / returned are HQ-only.
      return hq;
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-slate-900">
              {order.order_number}
            </h1>
            <OrderTypeBadge type={order.order_type} />
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Placed {fmtDate(order.order_date)} by {order.representative_name}
            {isOwner ? " (you)" : ""}
          </p>
        </div>
        <Link
          href="/orders"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back
        </Link>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Order
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Type" value={<OrderTypeBadge type={order.order_type} />} />
            <Row label="Status" value={<OrderStatusBadge status={order.status} />} />
            <Row label="Order date" value={fmtDate(order.order_date)} />
            {order.order_type === "warehouse_order" ? (
              <Row
                label="Expected delivery"
                value={fmtDate(order.expected_delivery)}
              />
            ) : null}
            <Row label="Delivered at" value={fmtDateTime(order.delivered_at)} />
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {order.order_type === "customer_sale" ? "Customer" : "Representative"}
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Representative" value={order.representative_name} />
            {order.order_type === "customer_sale" ? (
              <>
                <Row
                  label="Customer"
                  value={
                    order.customer_id ? (
                      <Link
                        href={`/customers/${order.customer_id}`}
                        className="text-brand-700 hover:underline"
                      >
                        {order.customer_name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )
                  }
                />
                <Row
                  label="Customer phone"
                  value={
                    order.customer_phone ?? (
                      <span className="text-slate-400">—</span>
                    )
                  }
                />
              </>
            ) : (
              <>
                <Row
                  label="Approved by"
                  value={
                    order.approved_by_name ?? (
                      <span className="text-slate-400">—</span>
                    )
                  }
                />
                <Row label="Approved at" value={fmtDateTime(order.approved_at)} />
              </>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Amounts
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Total" value={money(order.total_amount)} />
            <Row label="Discount" value={money(order.discount_amount)} />
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <dt className="font-semibold text-slate-700">Net</dt>
              <dd className="text-right font-bold text-slate-900">
                {money(order.net_amount)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Line items */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Line items
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Unit price</th>
                <th className="px-3 py-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    No line items.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {it.product_name}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">
                      {it.product_sku}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{it.quantity}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {money(it.unit_price)}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {money(it.subtotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {order.notes ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {order.notes}
          </p>
        </section>
      ) : null}

      {/* Status controls — warehouse orders only, gated by role/ownership */}
      {order.order_type === "warehouse_order" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Update status
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            {hq
              ? "Approving reserves central warehouse stock; delivering decrements it and releases the reservation. Cancelling releases any reservation."
              : "You can cancel your own order while it is still pending."}
          </p>
          <StatusControls orderId={order.id} actions={actions} />
        </section>
      ) : null}

      {/* Status history timeline */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Status history
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">No history recorded.</p>
        ) : (
          <ol className="space-y-4">
            {history.map((h) => (
              <li key={h.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <div className="text-sm">
                  <p className="text-slate-800">
                    {h.old_status ? (
                      <>
                        <span className="capitalize">
                          {h.old_status.replace(/_/g, " ")}
                        </span>{" "}
                        →{" "}
                      </>
                    ) : null}
                    <span className="font-semibold capitalize">
                      {h.new_status.replace(/_/g, " ")}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {fmtDateTime(h.created_at)} · {h.changed_by_name}
                  </p>
                  {h.notes ? (
                    <p className="mt-0.5 text-xs text-slate-600">{h.notes}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Documents */}
      <DocumentsSection relatedType="order" relatedId={order.id} />
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
