import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  getProject,
  canViewProject,
  listDistributionsForProject,
  resolveBeneficiaries,
} from "@/lib/projects";
import { getActiveProfitConfig, getActiveInvestmentConfig } from "@/lib/profit-config";
import type { DistributionRow } from "@/lib/types";
import {
  ProjectStatusBadge,
  RoleBadge,
  DistributionStatusBadge,
} from "../status-badge";
import { DistributeControls } from "./distribute-controls";
import { DocumentsSection } from "@/components/documents-section";

export const dynamic = "force-dynamic";

function money(v: string | number | null): string {
  const n = Number(v ?? 0);
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 2 });
}

function money4(v: string | number | null): string {
  const n = Number(v ?? 0);
  return (
    "৳" +
    n.toLocaleString("en-BD", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })
  );
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const project = await getProject(params.id);
  if (!project) notFound();
  if (!canViewProject(user, project)) redirect("/projects");

  const hq = isHQ(user);
  const distributed = project.status === "profit_distributed";
  const cancelled = project.status === "cancelled";

  const [distributions, beneficiaries, profitCfg, investCfg] = await Promise.all([
    listDistributionsForProject(project.id),
    distributed ? Promise.resolve(null) : resolveBeneficiaries(project),
    getActiveProfitConfig(),
    getActiveInvestmentConfig(),
  ]);

  // Preview split numbers (before distribution) use the active config; after
  // distribution we read the snapshot stored on the project row.
  const repPct = distributed
    ? null
    : Number(profitCfg?.representative_percentage ?? 20);
  const hqPct = distributed ? null : Number(profitCfg?.hq_percentage ?? 40);
  const investPct = distributed
    ? null
    : Number(profitCfg?.investment_percentage ?? 40);
  const perUnitCfg = Number(investCfg?.per_unit_amount ?? 100000);

  const netProfit = Number(project.net_profit);
  const previewRep = distributed
    ? Number(project.rep_share_amount)
    : Math.round(((netProfit * (repPct ?? 0)) / 100) * 100) / 100;
  const previewHq = distributed
    ? Number(project.hq_share_amount)
    : Math.round(((netProfit * (hqPct ?? 0)) / 100) * 100) / 100;
  const previewInvest = distributed
    ? Number(project.investment_share_amount)
    : Math.round(((netProfit * (investPct ?? 0)) / 100) * 100) / 100;
  const totalCost = Number(project.total_cost);
  const previewPerUnit = distributed
    ? Number(project.investment_return_per_unit)
    : totalCost > 0
      ? Math.round((previewInvest / totalCost) * perUnitCfg * 10000) / 10000
      : 0;

  const dealerIsDistrictHead =
    project.rep_is_district_head === true || project.upazila_is_sadar === true;

  const profitRows = distributions.filter(
    (d) => d.distribution_type === "profit_share"
  );
  const investRows = distributions.filter(
    (d) => d.distribution_type === "investment_return"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-slate-900">
              {project.project_number}
            </h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {project.title} · {project.representative_name} · {project.upazila_name},{" "}
            {project.district_name}, {project.division_name}
          </p>
        </div>
        <Link
          href="/projects"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back
        </Link>
      </div>

      {project.description ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {project.description}
          </p>
        </section>
      ) : null}

      {/* Financials + split */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Financials
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Project value" value={money(project.project_value)} />
            <Row
              label={`VAT / tax (${Number(project.vat_tax_percentage)}%)`}
              value={money(project.vat_tax_amount)}
            />
            <Row label="Total cost" value={money(project.total_cost)} />
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <dt className="font-semibold text-slate-700">Net profit</dt>
              <dd className="text-right font-bold text-slate-900">
                {money(project.net_profit)}
              </dd>
            </div>
            {project.customer_name ? (
              <Row label="Customer" value={project.customer_name} />
            ) : null}
            <Row label="Completed" value={fmtDate(project.completed_date)} />
            {project.profit_year ? (
              <Row label="Profit year" value={String(project.profit_year)} />
            ) : null}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Profit split {distributed ? "(locked snapshot)" : "(projected)"}
          </h2>
          <dl className="space-y-2 text-sm">
            <Row
              label={`Representative${repPct != null ? ` (${repPct}%)` : ""}`}
              value={money(previewRep)}
            />
            <Row
              label={`HQ${hqPct != null ? ` (${hqPct}%)` : ""}`}
              value={money(previewHq)}
            />
            <Row
              label={`Investment pool${investPct != null ? ` (${investPct}%)` : ""}`}
              value={money(previewInvest)}
            />
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <dt className="text-slate-500">Investment return / unit</dt>
              <dd className="text-right font-semibold text-slate-800">
                {money4(previewPerUnit)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Per unit = investment pool ÷ total cost × ৳
            {perUnitCfg.toLocaleString("en-BD")} (per-unit amount).
          </p>
        </div>
      </section>

      {/* Special-case note */}
      {dealerIsDistrictHead ? (
        <section className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
          <span className="font-semibold">Special case:</span> this project is in
          a sadar upazila, so the main dealer is also the district head. They
          receive TWO investment-return portions — one as the representative and
          one as the district head — each scaled by their own investment units.
        </section>
      ) : null}

      {/* Beneficiary preview (before distribution) */}
      {!distributed && !cancelled && beneficiaries ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Who will receive what (preview)
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Projected using the currently effective config. Nothing is recorded
            until HQ distributes the profit.
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Beneficiary</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Units</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <PreviewRow
                  name={project.representative_name}
                  role="representative"
                  type="Profit share"
                  units="—"
                  amount={money(previewRep)}
                />
                <PreviewRow
                  name="HQ (company)"
                  role="hq"
                  type="Profit share"
                  units="—"
                  amount={money(previewHq)}
                />
                <PreviewRow
                  name={project.representative_name}
                  role="representative"
                  type="Investment return"
                  units={Number(project.rep_investment_units).toString()}
                  amount={money(
                    Math.round(
                      previewPerUnit * Number(project.rep_investment_units) * 100
                    ) / 100
                  )}
                />
                {dealerIsDistrictHead ? (
                  <PreviewRow
                    name={`${project.representative_name} (as district head)`}
                    role="district_head"
                    type="Investment return"
                    units={Number(project.rep_investment_units).toString()}
                    amount={money(
                      Math.round(
                        previewPerUnit * Number(project.rep_investment_units) * 100
                      ) / 100
                    )}
                  />
                ) : beneficiaries.districtHead ? (
                  <PreviewRow
                    name="District head (sadar rep)"
                    role="district_head"
                    type="Investment return"
                    units={beneficiaries.districtHead.units.toString()}
                    amount={money(
                      Math.round(
                        previewPerUnit * beneficiaries.districtHead.units * 100
                      ) / 100
                    )}
                  />
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-xs text-slate-400">
                      No district head representative in this district yet — that
                      portion stays with HQ.
                    </td>
                  </tr>
                )}
                {beneficiaries.divisionalHeadUserId ? (
                  <PreviewRow
                    name="Divisional head (HQ-appointed)"
                    role="divisional_head"
                    type="Investment return"
                    units="1 (effort)"
                    amount={money(Math.round(previewPerUnit * 1 * 100) / 100)}
                  />
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-xs text-slate-400">
                      No divisional head appointed for this division yet — that
                      portion stays with HQ.
                    </td>
                  </tr>
                )}
                <PreviewRow
                  name="HQ (investment remainder)"
                  role="hq"
                  type="Investment return"
                  units="—"
                  amount="balance"
                />
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Actual distributions (after distribution) */}
      {distributed ? (
        <>
          <DistributionTable
            title="Profit share (paid monthly)"
            rows={profitRows}
            money={money}
          />
          <DistributionTable
            title="Investment return (paid annually)"
            rows={investRows}
            money={money}
          />
        </>
      ) : null}

      {/* Distribute action — HQ only, not yet distributed / cancelled */}
      {hq && !distributed && !cancelled ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Distribute profit
          </h2>
          <DistributeControls projectId={project.id} />
        </section>
      ) : null}

      {distributed ? (
        <p className="text-sm text-green-700">
          Profit distributed. The breakdown above is locked.
        </p>
      ) : null}
      {cancelled ? (
        <p className="text-sm text-red-700">
          This project is cancelled and cannot be distributed.
        </p>
      ) : null}

      {/* Documents */}
      <DocumentsSection relatedType="project" relatedId={project.id} />
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

function PreviewRow({
  name,
  role,
  type,
  units,
  amount,
}: {
  name: string;
  role: "representative" | "district_head" | "divisional_head" | "hq";
  type: string;
  units: string;
  amount: string;
}) {
  return (
    <tr>
      <td className="px-3 py-2 font-medium text-slate-800">{name}</td>
      <td className="px-3 py-2">
        <RoleBadge role={role} />
      </td>
      <td className="px-3 py-2 text-slate-600">{type}</td>
      <td className="px-3 py-2 text-slate-600">{units}</td>
      <td className="px-3 py-2 font-medium text-slate-800">{amount}</td>
    </tr>
  );
}

function DistributionTable({
  title,
  rows,
  money,
}: {
  title: string;
  rows: DistributionRow[];
  money: (v: string | number | null) => string;
}) {
  const total =
    Math.round(rows.reduce((s, r) => s + Number(r.amount), 0) * 100) / 100;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Beneficiary</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Units</th>
              <th className="px-3 py-2 font-medium">Rate</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Period</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                  No rows.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {r.beneficiary_name}
                  </td>
                  <td className="px-3 py-2">
                    <RoleBadge role={r.beneficiary_role} />
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {Number(r.units) === 0 ? "—" : Number(r.units)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.distribution_type === "profit_share"
                      ? `${Number(r.rate_or_percentage)}%`
                      : money(r.rate_or_percentage)}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {money(r.amount)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.payout_schedule === "monthly"
                      ? `${r.payout_year}-${String(r.payout_month).padStart(2, "0")}`
                      : `${r.payout_year} (annual)`}
                  </td>
                  <td className="px-3 py-2">
                    <DistributionStatusBadge status={r.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 0 ? (
        <p className="mt-3 text-right text-sm font-semibold text-slate-700">
          Total: {money(total)}
        </p>
      ) : null}
    </section>
  );
}
