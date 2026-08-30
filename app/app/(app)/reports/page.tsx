import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import {
  getSummaryMetrics,
  getRevenueTrend,
  getGeoRollup,
  getTopRepresentatives,
  getProjectStatusBreakdown,
  getOrderStatusBreakdown,
  reportScopeLabel,
} from "@/lib/reports";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatusBreakdown } from "@/components/charts/status-breakdown";
import { ReportFilters } from "./report-filters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports — Dealer Network" };

function money(v: string | number | null): string {
  const n = Number(v ?? 0);
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { months?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const months = searchParams.months ? parseInt(searchParams.months, 10) : 12;
  const scopeLabel = reportScopeLabel(user);

  const [metrics, trend, rollup, topReps, projStatus, orderStatus] =
    await Promise.all([
      getSummaryMetrics(user),
      getRevenueTrend(user, Number.isFinite(months) ? months : 12),
      getGeoRollup(user),
      getTopRepresentatives(user, 10),
      getProjectStatusBreakdown(user),
      getOrderStatusBreakdown(user),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Reports ({scopeLabel})
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Scope-aware analytics. All figures are limited to what you are
          authorized to see.
        </p>
      </div>

      <ReportFilters months={searchParams.months ?? "12"} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Reps" value={String(metrics.rep_total)} />
        <SummaryCard
          label="Active projects"
          value={String(metrics.active_projects)}
        />
        <SummaryCard
          label="Distributed profit"
          value={money(metrics.distributed_profit)}
        />
        <SummaryCard label="Sales revenue" value={money(metrics.order_revenue)} />
        <SummaryCard
          label="Outstanding fees"
          value={money(metrics.outstanding_fees)}
        />
        <SummaryCard label="Customers" value={String(metrics.customer_count)} />
      </div>

      {/* Revenue trend */}
      <Panel title={`Revenue trend (${trend.length} months)`}>
        <TrendChart
          points={trend.map((t) => ({
            label: t.label,
            a: t.project_profit,
            b: t.order_revenue,
          }))}
          seriesA="Project profit"
          seriesB="Sales revenue"
          format={(n) => money(n)}
        />
      </Panel>

      {/* Geo roll-up table */}
      <Panel title={`Roll-up by ${rollup.unit.toLowerCase()}`}>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">{rollup.unit}</th>
                <th className="px-4 py-3 text-right font-medium">Reps</th>
                <th className="px-4 py-3 text-right font-medium">
                  Project profit
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Sales revenue
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Outstanding fees
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rollup.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No data available.
                  </td>
                </tr>
              ) : (
                rollup.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.rep_count}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {money(r.project_profit)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {money(r.order_revenue)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        r.outstanding_fees > 0 ? "text-red-700" : "text-slate-700"
                      }`}
                    >
                      {money(r.outstanding_fees)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rollup.rows.length > 0 ? (
              <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">
                    {rollup.rows.reduce((s, r) => s + r.rep_count, 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {money(rollup.rows.reduce((s, r) => s + r.project_profit, 0))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {money(rollup.rows.reduce((s, r) => s + r.order_revenue, 0))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {money(
                      rollup.rows.reduce((s, r) => s + r.outstanding_fees, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </Panel>

      {/* Status breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Projects by status">
          <StatusBreakdown data={projStatus} />
        </Panel>
        <Panel title="Orders by status">
          <StatusBreakdown data={orderStatus} />
        </Panel>
      </div>

      {/* Top representatives */}
      <Panel title="Top representatives">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Representative</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 text-right font-medium">
                  Project profit
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Sales revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topReps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No representatives in scope.
                  </td>
                </tr>
              ) : (
                topReps.map((r, i) => (
                  <tr key={r.representative_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.full_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.upazila_name}, {r.district_name}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {money(r.project_profit)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {money(r.order_revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
