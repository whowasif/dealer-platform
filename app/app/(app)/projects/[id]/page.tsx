import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  getProject,
  canViewProject,
  listDistributionsForProject,
  resolveBeneficiaries,
  computeDistribution,
} from "@/lib/projects";
import { getActiveProfitConfig } from "@/lib/profit-config";
import { getActiveInvestmentSplitConfig } from "@/lib/investment-split-config";
import type { BeneficiaryRole, DistributionRow } from "@/lib/types";
import {
  ProjectStatusBadge,
  RoleBadge,
  DistributionStatusBadge,
} from "../status-badge";
import { DistributeControls } from "./distribute-controls";
import { DocumentsSection } from "@/components/documents-section";
import { getApproval, approvalStatus } from "@/lib/approvals";
import { ApprovalPanel } from "@/components/approval-panel";

export const dynamic = "force-dynamic";

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

  // Dual approval applies while the project is still a draft (rep-created).
  const needsDualApproval = project.status === "draft";
  const approvalRow = needsDualApproval
    ? await getApproval("project", project.id)
    : null;
  const approval = approvalRow ? approvalStatus(user, approvalRow) : null;

  const [distributions, beneficiaries, profitCfg, splitCfg] = await Promise.all([
    listDistributionsForProject(project.id),
    distributed ? Promise.resolve(null) : resolveBeneficiaries(project),
    getActiveProfitConfig(),
    getActiveInvestmentSplitConfig(),
  ]);

  const netProfit = Number(project.net_profit);
  const dealerIsDistrictHead =
    project.rep_is_district_head === true || project.upazila_is_sadar === true;

  // Preview (before distribution): run the PURE engine with the active config
  // and resolved beneficiaries. Nothing is written; this mirrors exactly what
  // distribution will produce.
  const preview =
    !distributed && !cancelled && beneficiaries && profitCfg && splitCfg
      ? computeDistribution(
          {
            net_profit: netProfit,
            representative_percentage: Number(profitCfg.representative_percentage),
            hq_percentage: Number(profitCfg.hq_percentage),
            investment_percentage: Number(profitCfg.investment_percentage),
            executive_percentage: Number(splitCfg.executive_percentage),
            supervision_percentage: Number(splitCfg.supervision_percentage),
            future_works_percentage: Number(splitCfg.future_works_percentage),
            supervision_sub_percentage: Number(splitCfg.supervision_sub_percentage),
            support_fund_sub_percentage: Number(splitCfg.support_fund_sub_percentage),
          },
          beneficiaries
        )
      : null;

  // Actual distributions (after distribution): profit share vs company fund.
  // Legacy 'investment_return' rows (pre-v5.0 projects) group with company fund.
  const profitRows = distributions.filter(
    (d) => d.distribution_type === "profit_share"
  );
  const companyFundRows = distributions.filter(
    (d) => d.distribution_type !== "profit_share"
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

      {/* Dual approval (divisional head + HQ) for draft projects */}
      {needsDualApproval && approval ? (
        <ApprovalPanel
          kind="project"
          id={project.id}
          divisionApproved={approval.divisionApproved}
          hqApproved={approval.hqApproved}
          canApprove={approval.canApprove}
        />
      ) : null}

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
              label="Representative (20%)"
              value={money(
                distributed
                  ? Number(project.rep_share_amount)
                  : (preview?.rep_share_amount ?? 0)
              )}
            />
            <Row
              label="HQ — salary & admin (40%)"
              value={money(
                distributed
                  ? Number(project.hq_share_amount)
                  : (preview?.hq_share_amount ?? 0)
              )}
            />
            <Row
              label="Investment / company fund (40%)"
              value={money(
                distributed
                  ? Number(project.investment_share_amount)
                  : (preview?.investment_share_amount ?? 0)
              )}
            />
            {preview ? (
              <>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-xs text-slate-500">
                  <dt>— Executives profit ({Number(splitCfg?.executive_percentage)}%)</dt>
                  <dd className="font-medium text-slate-700">
                    {money(preview.executive_amount)}
                  </dd>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <dt>— Supervision incentive ({Number(splitCfg?.supervision_sub_percentage)}%)</dt>
                  <dd className="font-medium text-slate-700">
                    {money(preview.supervision_amount)}
                  </dd>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <dt>— Support fund ({Number(splitCfg?.support_fund_sub_percentage)}%)</dt>
                  <dd className="font-medium text-slate-700">
                    {money(preview.support_fund_amount)}
                  </dd>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <dt>— Future works fund ({Number(splitCfg?.future_works_percentage)}%)</dt>
                  <dd className="font-medium text-slate-700">
                    {money(preview.future_works_amount)}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            The 40% investment slice is a company fund: executives&apos; profit
            (shared by role weight), supervision incentive, the Representative
            Support Fund, and the Future Works Fund.
          </p>
        </div>
      </section>

      {/* Special-case note */}
      {dealerIsDistrictHead && !distributed ? (
        <section className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
          <span className="font-semibold">Special case:</span> this project is in
          a sadar upazila, so the main dealer is also the district head. They
          receive the representative&apos;s 20% profit share AND, from the
          supervision incentive (part of the 5% company-fund bucket), the
          district-head share.
        </section>
      ) : null}

      {/* Beneficiary preview (before distribution) */}
      {preview ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Who will receive what (preview)
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Projected using the currently effective config (20/40/40; investment
            split {Number(splitCfg?.executive_percentage)}/
            {Number(splitCfg?.supervision_percentage)}/
            {Number(splitCfg?.future_works_percentage)}). Nothing is recorded
            until HQ distributes the profit.
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Beneficiary</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((r, i) => (
                  <PreviewRow
                    key={i}
                    name={previewName(
                      r.beneficiary_role,
                      r.beneficiary_user_id,
                      project.representative_name,
                      beneficiaries
                    )}
                    role={r.beneficiary_role}
                    type={
                      r.distribution_type === "profit_share"
                        ? "Profit share"
                        : "Company fund"
                    }
                    amount={money(r.amount)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {beneficiaries && beneficiaries.executives.length === 0 ? (
            <p className="mt-3 text-xs text-amber-600">
              No HQ executives configured yet — the 15% executives-profit stays
              with the HQ pool until executives are added in Settings.
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Actual distributions (after distribution) */}
      {distributed ? (
        <>
          <DistributionTable
            title="Profit share — representative 20% + HQ 40% (monthly)"
            rows={profitRows}
            money={money}
          />
          <DistributionTable
            title="Company fund — 40% investment (executives / supervision / funds)"
            rows={companyFundRows}
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
  amount,
}: {
  name: string;
  role: BeneficiaryRole;
  type: string;
  amount: string;
}) {
  return (
    <tr>
      <td className="px-3 py-2 font-medium text-slate-800">{name}</td>
      <td className="px-3 py-2">
        <RoleBadge role={role} />
      </td>
      <td className="px-3 py-2 text-slate-600">{type}</td>
      <td className="px-3 py-2 font-medium text-slate-800">{amount}</td>
    </tr>
  );
}

/** Friendly beneficiary label for a preview row. */
function previewName(
  role: BeneficiaryRole,
  userId: string | null,
  repName: string,
  beneficiaries: Awaited<ReturnType<typeof resolveBeneficiaries>> | null
): string {
  switch (role) {
    case "representative":
      return repName;
    case "district_head":
      return beneficiaries && beneficiaries.dealer.is_district_head
        ? `${repName} (as district head)`
        : "District head (sadar rep)";
    case "divisional_head":
      return "Divisional head (HQ-appointed)";
    case "hq_executive":
      return "HQ executive";
    case "support_fund":
      return "Representative Support Fund";
    case "future_works":
      return "Future Works Fund";
    case "hq":
    default:
      return "HQ (company)";
  }
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
              <th className="px-3 py-2 font-medium">Rate</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Period</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
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
                    {r.rate_or_percentage == null
                      ? "—"
                      : r.beneficiary_role === "hq_executive"
                        ? `weight ${Number(r.rate_or_percentage)}`
                        : `${Number(r.rate_or_percentage)}%`}
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
