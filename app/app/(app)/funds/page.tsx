import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import { getAllFundSummaries, listFundLedger } from "@/lib/funds";
import type { FundType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Funds — Dealer Network" };

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

const FUND_META: Record<
  FundType,
  { title: string; blurb: string; accent: string }
> = {
  representative_support: {
    title: "Representative Support Fund",
    blurb:
      "Accrues ~2% of net profit (inside the 5% supervision+support bucket). Helps representatives who make no profit in a year.",
    accent: "border-amber-200 bg-amber-50",
  },
  future_works: {
    title: "Future Works Fund",
    blurb:
      "Accrues 20% of net profit. Retained project capital for expansion and new ventures.",
    accent: "border-cyan-200 bg-cyan-50",
  },
  growth: {
    title: "Growth & Reserve Fund",
    blurb:
      "Returns from safely investing the pooled refundable security deposits. Managed by HQ; representatives have no personal claim.",
    accent: "border-emerald-200 bg-emerald-50",
  },
};

export default async function FundsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isHQ(user)) redirect("/dashboard");

  const summaries = await getAllFundSummaries();
  const ledgers = await Promise.all(
    (["representative_support", "future_works", "growth"] as FundType[]).map(
      (f) => listFundLedger(f, 25)
    )
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Funds</h1>
        <p className="mt-1 text-sm text-slate-500">
          Company funds accrued from project profit distribution and pooled
          deposits. Balances update automatically when profit is distributed.
        </p>
      </div>

      {/* Balance cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaries.map((s) => {
          const meta = FUND_META[s.fund];
          return (
            <div
              key={s.fund}
              className={`rounded-xl border p-5 shadow-sm ${meta.accent}`}
            >
              <h2 className="text-sm font-semibold text-slate-700">
                {meta.title}
              </h2>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {money(s.balance)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                In {money(s.total_credit)} · Out {money(s.total_debit)} ·{" "}
                {s.entry_count} entries
              </p>
            </div>
          );
        })}
      </section>

      {/* Ledgers */}
      {(["representative_support", "future_works", "growth"] as FundType[]).map(
        (fund, idx) => {
          const meta = FUND_META[fund];
          const rows = ledgers[idx]!;
          return (
            <section
              key={fund}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {meta.title} — recent activity
              </h2>
              <p className="mb-4 mt-1 text-xs text-slate-500">{meta.blurb}</p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 text-right font-medium">In</th>
                      <th className="px-3 py-2 text-right font-medium">Out</th>
                      <th className="px-3 py-2 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-slate-400"
                        >
                          No activity yet.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 text-slate-600">
                            {fmtDate(r.transaction_date)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {r.description}
                          </td>
                          <td className="px-3 py-2 text-right text-green-700">
                            {Number(r.credit) > 0 ? money(r.credit) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-red-700">
                            {Number(r.debit) > 0 ? money(r.debit) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">
                            {money(r.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        }
      )}
    </div>
  );
}
