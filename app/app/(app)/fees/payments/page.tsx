import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  repScopeForUser,
  listRepresentatives,
} from "@/lib/representatives";
import {
  listPayments,
  listInvoices,
  type PaymentListFilters,
} from "@/lib/fees";
import { VerifiedBadge } from "../fee-badges";
import type { RepOption } from "../invoice-panels";
import {
  RecordPaymentPanel,
  VerifyPaymentButton,
  type OpenInvoiceOption,
} from "../payment-panels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments — Dealer Network" };

function money(v: string | number | null): string {
  const n = Number(v ?? 0);
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 2 });
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const FEE_LABEL: Record<string, string> = {
  monthly_software: "Monthly software",
  contract_renewal: "Contract renewal",
  other: "Other",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { method?: string; type?: string; verified?: string; search?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const hq = isHQ(user);
  const scope = repScopeForUser(user);

  const filters: PaymentListFilters = {
    method: searchParams.method || null,
    paymentType: searchParams.type || null,
    verified: searchParams.verified || null,
    search: searchParams.search || null,
  };

  const payments = await listPayments(user, filters);

  // HQ needs rep options + open invoices to record/link payments.
  let reps: RepOption[] = [];
  let openInvoices: OpenInvoiceOption[] = [];
  if (hq) {
    const [repList, pendingInvoices] = await Promise.all([
      listRepresentatives(user, { status: "active" }),
      listInvoices(user, { status: "pending" }),
    ]);
    reps = repList.map((r) => ({ id: r.id, full_name: r.full_name }));
    openInvoices = pendingInvoices.map((inv) => ({
      id: inv.id,
      representative_id: inv.representative_id,
      label: `${inv.representative_name} · ${
        FEE_LABEL[inv.fee_type] ?? inv.fee_type
      } · ${money(inv.amount)} · due ${fmtDate(inv.due_date)}`,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {scope.selfOnly ? "My payments" : "Payments"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {payments.length} payment{payments.length === 1 ? "" : "s"}
            {hq ? " nationwide" : scope.selfOnly ? "" : " in your area"}
          </p>
        </div>
        <Link
          href="/fees"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Invoices
        </Link>
      </div>

      {hq ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Record a payment
          </h2>
          <RecordPaymentPanel reps={reps} openInvoices={openInvoices} />
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Representative</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              {hq ? <th className="px-4 py-3 font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 ? (
              <tr>
                <td
                  colSpan={hq ? 8 : 7}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No payments match the current filters.
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                const mine = p.rep_user_id === user.id;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {fmtDate(p.payment_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {mine ? (
                        <span className="font-medium text-slate-800">You</span>
                      ) : (
                        p.representative_name
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {p.payment_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {money(p.amount)}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {p.payment_method.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.reference_no}</td>
                    <td className="px-4 py-3">
                      <VerifiedBadge verified={p.verified} />
                      {p.verified && p.verified_by_name ? (
                        <span className="mt-0.5 block text-xs text-slate-400">
                          by {p.verified_by_name}
                        </span>
                      ) : null}
                    </td>
                    {hq ? (
                      <td className="px-4 py-3">
                        {p.verified ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <VerifyPaymentButton paymentId={p.id} />
                        )}
                      </td>
                    ) : null}
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
