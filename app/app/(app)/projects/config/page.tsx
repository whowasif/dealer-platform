import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  getActiveProfitConfig,
  getActiveInvestmentConfig,
  listProfitConfigHistory,
  listInvestmentConfigHistory,
} from "@/lib/profit-config";
import { ProfitConfigForm, InvestmentConfigForm } from "./config-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profit & investment config — Dealer Network" };

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

export default async function ProfitConfigPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isHQ(user)) redirect("/projects");

  const [activeProfit, activeInvest, profitHistory, investHistory] =
    await Promise.all([
      getActiveProfitConfig(),
      getActiveInvestmentConfig(),
      listProfitConfigHistory(),
      listInvestmentConfigHistory(),
    ]);

  const current = {
    rep: Number(activeProfit?.representative_percentage ?? 20),
    hq: Number(activeProfit?.hq_percentage ?? 40),
    invest: Number(activeProfit?.investment_percentage ?? 40),
  };
  const currentPerUnit = Number(activeInvest?.per_unit_amount ?? 100000);

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
            Current per-unit amount
          </h2>
          <p className="text-2xl font-bold text-slate-900">
            {money(currentPerUnit)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Per investment unit · effective{" "}
            {fmtDate(activeInvest?.effective_from ?? null)}
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

      {/* Investment pool form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          New per-unit amount
        </h2>
        <InvestmentConfigForm currentPerUnit={currentPerUnit} />
      </section>

      {/* Investment history */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Per-unit amount history
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Per-unit amount</th>
                <th className="px-3 py-2 font-medium">Effective from</th>
                <th className="px-3 py-2 font-medium">Effective to</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investHistory.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {money(c.per_unit_amount)}
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
                  <td className="px-3 py-2 text-slate-500">{c.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
