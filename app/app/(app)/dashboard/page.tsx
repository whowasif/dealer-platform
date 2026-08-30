import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ, hasRole, primaryRoleLabel } from "@/lib/rbac";
import {
  getSummaryMetrics,
  getRevenueTrend,
  getProjectStatusBreakdown,
  getOrderStatusBreakdown,
  getTopRepresentatives,
  getRepPersonalKpis,
  reportScopeLabel,
} from "@/lib/reports";
import { repScopeForUser } from "@/lib/representatives";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatusBreakdown } from "@/components/charts/status-breakdown";
import { BarChart } from "@/components/charts/bar-chart";
import type { SessionUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard — Dealer Network" };

function money(v: string | number | null): string {
  const n = Number(v ?? 0);
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

function Card({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ?? "text-slate-900"}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Dashboard for HQ / divisional / district heads (aggregate view). */
async function OverviewDashboard({ user }: { user: SessionUser }) {
  const [metrics, trend, projStatus, orderStatus, topReps] = await Promise.all([
    getSummaryMetrics(user),
    getRevenueTrend(user, 12),
    getProjectStatusBreakdown(user),
    getOrderStatusBreakdown(user),
    getTopRepresentatives(user, 8),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          label="Representatives"
          value={metrics.rep_total}
          hint={`${metrics.rep_active} active · ${metrics.rep_suspended} suspended`}
        />
        <Card
          label="Active projects"
          value={metrics.active_projects}
          hint="In progress or completed"
        />
        <Card
          label="Distributed profit"
          value={money(metrics.distributed_profit)}
          hint="Net profit of distributed projects"
        />
        <Card
          label="Sales revenue"
          value={money(metrics.order_revenue)}
          hint={`${metrics.order_count} customer orders`}
        />
        <Card
          label="Outstanding fees"
          value={money(metrics.outstanding_fees)}
          hint="Pending + overdue invoices"
          accent={metrics.outstanding_fees > 0 ? "text-red-700" : undefined}
        />
        <Card
          label="Customers"
          value={metrics.customer_count}
          hint="Within your scope"
        />
      </div>

      <Panel
        title="Revenue trend (12 months)"
        action={
          <Link
            href="/reports"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Full reports →
          </Link>
        }
      >
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Projects by status">
          <StatusBreakdown data={projStatus} />
        </Panel>
        <Panel title="Orders by status">
          <StatusBreakdown data={orderStatus} />
        </Panel>
      </div>

      <Panel
        title="Top representatives"
        action={
          <Link
            href="/reports"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View all →
          </Link>
        }
      >
        <BarChart
          data={topReps.map((r) => ({
            label: r.full_name,
            sublabel: r.district_name,
            value: r.project_profit,
          }))}
          format={(n) => money(n)}
          emptyText="No distributed project profit yet."
        />
      </Panel>
    </div>
  );
}

/** Dashboard for a plain representative (their own KPIs). */
async function RepDashboard({ user }: { user: SessionUser }) {
  const [kpis, trend] = await Promise.all([
    getRepPersonalKpis(user),
    getRevenueTrend(user, 12),
  ]);

  if (!kpis) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Your representative profile is not set up yet. Contact your district head
        or HQ.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          label="My projects"
          value={kpis.my_projects}
          hint={money(kpis.my_distributed_profit) + " distributed profit"}
        />
        <Card
          label="My earnings"
          value={money(kpis.my_earnings)}
          hint="Profit share + investment returns"
          accent="text-emerald-700"
        />
        <Card
          label="My sales"
          value={money(kpis.my_order_revenue)}
          hint={`${kpis.my_orders} customer orders`}
        />
        <Card
          label="Outstanding fees"
          value={money(kpis.my_outstanding_fees)}
          hint="Pending + overdue"
          accent={kpis.my_outstanding_fees > 0 ? "text-red-700" : undefined}
        />
        <Card label="My customers" value={kpis.my_customers} />
      </div>

      <Panel title="My revenue trend (12 months)">
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
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = repScopeForUser(user);
  const isOverview = isHQ(user) || !scope.selfOnly;

  const greeting = isHQ(user)
    ? "Here is the national overview."
    : hasRole(user, "divisional_head")
      ? "Here is your division overview."
      : hasRole(user, "district_head")
        ? "Here is your district overview."
        : "Here is your account summary.";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, {user.full_name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{greeting}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {reportScopeLabel(user)} · {primaryRoleLabel(user)}
        </span>
      </div>

      {isOverview ? (
        <OverviewDashboard user={user} />
      ) : (
        <RepDashboard user={user} />
      )}
    </div>
  );
}
