import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  repScopeForUser,
  getRepresentativeIdByUser,
  listRepresentatives,
} from "@/lib/representatives";
import { getCurrentBalance } from "@/lib/ledger";
import {
  listInvoices,
  getRepFeeSummary,
  type InvoiceListFilters,
} from "@/lib/fees";
import { InvoiceFilters } from "./invoice-filters";
import { InvoiceStatusBadge } from "./fee-badges";
import {
  GenerateInvoicesPanel,
  NewInvoicePanel,
  type RepOption,
} from "./invoice-panels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fees & payments — Dealer Network" };

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

export default async function FeesPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    feeType?: string;
    search?: string;
    period?: string;
  };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const hq = isHQ(user);
  const scope = repScopeForUser(user);

  const filters: InvoiceListFilters = {
    status: searchParams.status || null,
    feeType: searchParams.feeType || null,
    search: searchParams.search || null,
    period: searchParams.period || null,
  };

  const invoices = await listInvoices(user, filters);

  // Rep options + a self-summary depending on the viewer.
  let reps: RepOption[] = [];
  let selfBalance: number | null = null;
  let selfSummary: Awaited<ReturnType<typeof getRepFeeSummary>> | null = null;

  if (hq) {
    const repList = await listRepresentatives(user, { status: "active" });
    reps = repList.map((r) => ({ id: r.id, full_name: r.full_name }));
  } else if (scope.selfOnly) {
    const repId = await getRepresentativeIdByUser(user.id);
    if (repId) {
      [selfBalance, selfSummary] = await Promise.all([
        getCurrentBalance(repId),
        getRepFeeSummary(repId),
      ]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {scope.selfOnly ? "My fees" : "Fees & payments"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
            {hq ? " nationwide" : scope.selfOnly ? "" : " in your area"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/fees/payments"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Payments →
          </Link>
          {hq ? (
            <Link
              href="/fees/schedules"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Fee schedules →
            </Link>
          ) : null}
        </div>
      </div>

      {/* Self summary for representatives */}
      {scope.selfOnly && selfSummary ? (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard
            label="Current balance"
            value={money(selfBalance ?? 0)}
            hint={
              (selfBalance ?? 0) > 0
                ? "You owe HQ"
                : (selfBalance ?? 0) < 0
                  ? "In credit"
                  : "Settled"
            }
            accent={(selfBalance ?? 0) > 0 ? "text-red-700" : "text-green-700"}
          />
          <SummaryCard
            label="Total invoiced"
            value={money(selfSummary.total_invoiced)}
          />
          <SummaryCard
            label="Total paid"
            value={money(selfSummary.total_paid)}
          />
          <SummaryCard
            label="Overdue"
            value={String(selfSummary.overdue_count)}
            accent={selfSummary.overdue_count > 0 ? "text-red-700" : undefined}
          />
        </section>
      ) : null}

      {/* HQ generation + manual invoice panels */}
      {hq ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Generate monthly invoices
            </h2>
            <GenerateInvoicesPanel />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              New manual invoice
            </h2>
            <NewInvoicePanel reps={reps} />
          </section>
        </>
      ) : null}

      {/* Invoices list */}
      <InvoiceFilters
        current={{
          status: searchParams.status ?? "",
          feeType: searchParams.feeType ?? "",
          search: searchParams.search ?? "",
          period: searchParams.period ?? "",
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Representative</th>
              <th className="px-4 py-3 font-medium">Fee type</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Due date</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No invoices match the current filters.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const mine = inv.rep_user_id === user.id;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      {mine ? (
                        <span className="font-medium text-slate-800">You</span>
                      ) : (
                        inv.representative_name
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {FEE_LABEL[inv.fee_type] ?? inv.fee_type}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {fmtDate(inv.period_start)}
                      <span className="text-slate-400">
                        {" "}
                        – {fmtDate(inv.period_end)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {money(inv.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {fmtDate(inv.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge
                        status={inv.status}
                        isOverdue={inv.is_overdue}
                      />
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

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold ${accent ?? "text-slate-900"}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
