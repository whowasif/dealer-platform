import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  getActiveFeeSchedule,
  listFeeScheduleHistory,
} from "@/lib/fee-schedules";
import type { FeeScheduleRow, FeeType } from "@/lib/types";
import { FeeScheduleForm } from "./schedule-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fee schedules — Dealer Network" };

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

const FEE_TYPES: { value: FeeType; label: string }[] = [
  { value: "monthly_software", label: "Monthly software" },
  { value: "contract_renewal", label: "Contract renewal" },
  { value: "other", label: "Other" },
];

export default async function FeeSchedulesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isHQ(user)) redirect("/fees");

  const [monthly, renewal, other, history] = await Promise.all([
    getActiveFeeSchedule("monthly_software"),
    getActiveFeeSchedule("contract_renewal"),
    getActiveFeeSchedule("other"),
    listFeeScheduleHistory(),
  ]);

  const active: Record<FeeType, FeeScheduleRow | null> = {
    monthly_software: monthly,
    contract_renewal: renewal,
    other,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fee schedules</h1>
          <p className="mt-1 text-sm text-slate-500">
            Versioned fee amounts per type. New versions apply to invoices
            generated on or after their effective date.
          </p>
        </div>
        <Link
          href="/fees"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to fees
        </Link>
      </div>

      {/* Current values */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FEE_TYPES.map((ft) => {
          const row = active[ft.value];
          return (
            <div
              key={ft.value}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {ft.label}
              </h2>
              <p className="text-2xl font-bold text-slate-900">
                {row ? money(row.amount) : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {row
                  ? `effective ${fmtDate(row.effective_from)}`
                  : "No schedule set"}
              </p>
            </div>
          );
        })}
      </section>

      {/* New schedule form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          New fee schedule
        </h2>
        <FeeScheduleForm />
      </section>

      {/* History */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Schedule history
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Fee type</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Effective from</th>
                <th className="px-3 py-2 font-medium">Effective to</th>
                <th className="px-3 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    No fee schedules created yet.
                  </td>
                </tr>
              ) : (
                history.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 text-slate-700">
                      {FEE_TYPES.find((f) => f.value === c.fee_type)?.label ??
                        c.fee_type}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {money(c.amount)}
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
                    <td className="px-3 py-2 text-slate-500">
                      {c.description ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
