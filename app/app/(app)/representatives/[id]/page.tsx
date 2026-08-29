import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import {
  getRepresentative,
  canViewRepresentative,
  canManageRepresentativeInDistrict,
  getDistrictHeadFor,
} from "@/lib/representatives";
import { listContracts } from "@/lib/contracts";
import { listDeposits, sumDeposits } from "@/lib/deposits";
import { StatusBadge, ContractStatusBadge } from "../status-badge";
import { StatusControls } from "./status-controls";
import { DepositForm } from "./deposit-form";
import { ContractPanel } from "./contract-panel";

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

export default async function RepresentativeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rep = await getRepresentative(params.id);
  if (!rep) notFound();

  // Server-side authorization: not just UI hiding.
  if (!canViewRepresentative(user, rep)) redirect("/representatives");

  const canManage = canManageRepresentativeInDistrict(
    user,
    rep.district_id,
    rep.division_id
  );

  const [contracts, deposits, districtHead] = await Promise.all([
    listContracts(rep.id),
    listDeposits(rep.id),
    getDistrictHeadFor(rep),
  ]);
  const totals = sumDeposits(deposits);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {rep.full_name}
            </h1>
            <StatusBadge status={rep.status} />
            {rep.is_district_head ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                District Head
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {rep.phone}
            {rep.official_email ? ` · ${rep.official_email}` : ""}
          </p>
        </div>
        <Link
          href="/representatives"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back
        </Link>
      </div>

      {/* Profile & hierarchy */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Hierarchy position
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Division" value={rep.division_name} />
            <Row label="District" value={rep.district_name} />
            <Row
              label="Upazila"
              value={`${rep.upazila_name}${rep.upazila_is_sadar ? " (Sadar)" : ""}`}
            />
            <Row label="Join date" value={fmtDate(rep.join_date)} />
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt className="text-slate-500">Reports to</dt>
              <dd className="text-right font-medium text-slate-800">
                {rep.is_district_head ? (
                  <span className="text-slate-500">
                    This rep is the District Head
                    <br />
                    <span className="text-xs">
                      Divisional head is HQ-appointed
                    </span>
                  </span>
                ) : districtHead ? (
                  <>
                    {districtHead.full_name}
                    <span className="block text-xs font-normal text-slate-400">
                      District Head · {districtHead.upazila_name}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">
                    No district head assigned yet
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Package & investment
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Package" value={rep.package_display_name} />
            <Row label="Investment amount" value={money(rep.investment_amount)} />
            <Row label="Investment units" value={Number(rep.investment_units)} />
            <Row
              label="Refundable balance"
              value={money(rep.refundable_balance)}
            />
            <Row
              label="Onboarding fee (package)"
              value={money(rep.package_onboarding_fee)}
            />
            <Row
              label="Laptop"
              value={
                rep.laptop_provided
                  ? `Provided${rep.laptop_serial_no ? ` (${rep.laptop_serial_no})` : ""}`
                  : rep.package_includes_laptop
                    ? "Included, not yet provided"
                    : "Not included"
              }
            />
          </dl>
        </div>
      </section>

      {/* Status controls */}
      {canManage ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Status
          </h2>
          <StatusControls representativeId={rep.id} status={rep.status} />
        </section>
      ) : null}

      {/* Deposits */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Deposits
          </h2>
          <div className="text-right text-xs text-slate-500">
            <span className="mr-4">
              Refundable: <strong>{money(totals.refundable)}</strong>
            </span>
            <span className="mr-4">
              Non-refundable: <strong>{money(totals.nonRefundable)}</strong>
            </span>
            <span className="mr-4">
              Onboarding: <strong>{money(totals.onboarding)}</strong>
            </span>
            <span>
              Total: <strong>{money(totals.total)}</strong>
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No deposits recorded yet.
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 text-slate-600">
                      {fmtDate(d.payment_date)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {d.type.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {money(d.amount)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {d.payment_method.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{d.reference_no}</td>
                    <td className="px-3 py-2">
                      {d.verified ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {canManage ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <DepositForm representativeId={rep.id} />
          </div>
        ) : null}
      </section>

      {/* Contracts */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Contracts
        </h2>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Number</th>
                <th className="px-3 py-2 font-medium">Term</th>
                <th className="px-3 py-2 font-medium">Start</th>
                <th className="px-3 py-2 font-medium">End</th>
                <th className="px-3 py-2 font-medium">Renewal fee</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canManage ? <th className="px-3 py-2 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    No contracts yet.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {c.contract_number}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {c.term_years} yr
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {fmtDate(c.start_date)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {fmtDate(c.end_date)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {money(c.renewal_fee)}
                    </td>
                    <td className="px-3 py-2">
                      <ContractStatusBadge status={c.status} />
                    </td>
                    {canManage ? (
                      <td className="px-3 py-2">
                        <ContractPanel
                          representativeId={rep.id}
                          contractId={c.id}
                          status={c.status}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {canManage ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <ContractPanel representativeId={rep.id} createMode />
          </div>
        ) : null}
      </section>

      {rep.notes ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{rep.notes}</p>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
