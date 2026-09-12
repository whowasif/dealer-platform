import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ, isSuperAdmin } from "@/lib/rbac";
import { listExecutives } from "@/lib/hq-executives";
import { listUsers } from "@/lib/users";
import { getActiveInvestmentSplitConfig } from "@/lib/investment-split-config";
import {
  AddExecutiveForm,
  ExecutiveRow,
  type UserOption,
} from "./executives-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ Executives — Dealer Network" };

export default async function ExecutivesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isHQ(user)) redirect("/dashboard");

  const canManage = isSuperAdmin(user);

  const [executives, users, splitCfg] = await Promise.all([
    listExecutives(),
    canManage ? listUsers() : Promise.resolve([]),
    getActiveInvestmentSplitConfig(),
  ]);

  const execPct = Number(splitCfg?.executive_percentage ?? 15);
  const totalWeight = executives
    .filter((e) => e.is_active)
    .reduce((s, e) => s + Number(e.role_weight), 0);

  // Users not already executives, for the add dropdown.
  const existingUserIds = new Set(executives.map((e) => e.user_id));
  const userOptions: UserOption[] = users
    .filter((u) => !existingUserIds.has(u.id))
    .map((u) => ({ id: u.id, full_name: u.full_name, phone: u.phone }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">HQ Executives</h1>
          <p className="mt-1 text-sm text-slate-500">
            The 5–6 people who run HQ. Each executive&apos;s role weight sets
            their share of the {execPct}% executives-profit bucket (of net
            profit). Weights can be changed any time.
          </p>
        </div>
        <Link
          href="/projects/config"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Profit config →
        </Link>
      </div>

      {!canManage ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Only the super admin can add, edit, or remove executives. You can view
          the current list below.
        </p>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Add executive
          </h2>
          {userOptions.length === 0 ? (
            <p className="text-sm text-slate-500">
              All users are already executives, or there are no users to add.
            </p>
          ) : (
            <AddExecutiveForm users={userOptions} />
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Executives ({executives.length})
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Designation</th>
                <th className="px-3 py-2 font-medium">Weight</th>
                <th className="px-3 py-2 font-medium">Profit share</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">
                  {canManage ? "Actions" : ""}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {executives.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No executives yet. Until at least one is added, the
                    executives-profit bucket stays with the HQ pool.
                  </td>
                </tr>
              ) : canManage ? (
                executives.map((e) => (
                  <ExecutiveRow key={e.id} exec={e} totalWeight={totalWeight} />
                ))
              ) : (
                executives.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {e.full_name}
                      {e.is_ceo ? (
                        <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                          CEO
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{e.designation}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {Number(e.role_weight)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {e.is_active && totalWeight > 0
                        ? `${Math.round((Number(e.role_weight) / totalWeight) * 1000) / 10}%`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {e.is_active ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          active
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          inactive
                        </span>
                      )}
                    </td>
                    <td />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          &quot;Profit share&quot; shows each active executive&apos;s proportion
          of the executives-profit bucket, based on weight.
        </p>
      </section>
    </div>
  );
}
