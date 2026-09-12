import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  getActiveProfitConfig,
  listProfitConfigHistory,
} from "@/lib/profit-config";
import {
  getActiveInvestmentSplitConfig,
  listInvestmentSplitConfigHistory,
} from "@/lib/investment-split-config";
import { ProfitConfigForm, InvestmentSplitConfigForm } from "./config-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profit & investment config — Dealer Network" };

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ProfitConfigPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isHQ(user)) redirect("/projects");

  const [activeProfit, activeSplit, profitHistory, splitHistory] =
    await Promise.all([
      getActiveProfitConfig(),
      getActiveInvestmentSplitConfig(),
      listProfitConfigHistory(),
      listInvestmentSplitConfigHistory(),
    ]);

  const current = {
    rep: Number(activeProfit?.representative_percentage ?? 20),
    hq: Number(activeProfit?.hq_percentage ?? 40),
    invest: Number(activeProfit?.investment_percentage ?? 40),
  };
  const currentSplit = {
    exec: Number(activeSplit?.executive_percentage ?? 15),
    supervision: Number(activeSplit?.supervision_percentage ?? 5),
    future: Number(activeSplit?.future_works_percentage ?? 20),
    supervisionSub: Number(activeSplit?.supervision_sub_percentage ?? 3),
    supportSub: Number(activeSplit?.support_fund_sub_percentage ?? 2),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Profit & investment config
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Versioned settings that drive the distribution engine. New versions
            apply to distributions run on or after their effective date.
          </p>
        </div>
        <Link
          href="/projects"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to projects
        </Link>
      </div>

      {/* Current values */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Current profit split
          </h2>
          <p className="text-2xl font-bold text-slate-900">
            {current.rep}% / {current.hq}% / {current.invest}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Representative / HQ / Investment · effective{" "}
            {fmtDate(activeProfit?.effective_from ?? null)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Investment split (of the {current.invest}%)
          </h2>
          <p className="text-2xl font-bold text-slate-900">
            {currentSplit.exec}% / {currentSplit.supervision}% /{" "}
            {currentSplit.future}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Executives / Supervision+Support / Future works · effective{" "}
            {fmtDate(activeSplit?.effective_from ?? null)}
          </p>
        </div>
      </section>

      {/* Profit split form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          New profit split
        </h2>
        <ProfitConfigForm current={current} />
      </section>

      {/* Profit history */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Profit split history
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Rep %</th>
                <th className="px-3 py-2 font-medium">HQ %</th>
                <th className="px-3 py-2 font-medium">Investment %</th>
                <th className="px-3 py-2 font-medium">Effective from</th>
                <th className="px-3 py-2 font-medium">Effective to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profitHistory.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 text-slate-700">
                    {Number(c.representative_percentage)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {Number(c.hq_percentage)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {Number(c.investment_percentage)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {fmtDate(c.effective_from)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {c.effective_to ? (
                      fmtDate(c.effective_to)
                    ) : (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Investment split form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          New investment split
        </h2>
        <InvestmentSplitConfigForm
          current={currentSplit}
          investmentPct={current.invest}
        />
      </section>

      {/* Investment split history */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Investment split history
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Exec %</th>
                <th className="px-3 py-2 font-medium">Superv.+Support %</th>
                <th className="px-3 py-2 font-medium">Future %</th>
                <th className="px-3 py-2 font-medium">(superv./support)</th>
                <th className="px-3 py-2 font-medium">Effective from</th>
                <th className="px-3 py-2 font-medium">Effective to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {splitHistory.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 text-slate-700">
                    {Number(c.executive_percentage)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {Number(c.supervision_percentage)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {Number(c.future_works_percentage)}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {Number(c.supervision_sub_percentage)} /{" "}
                    {Number(c.support_fund_sub_percentage)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {fmtDate(c.effective_from)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {c.effective_to ? (
                      fmtDate(c.effective_to)
                    ) : (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
