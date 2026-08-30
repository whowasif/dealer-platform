import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listRepresentatives, repScopeForUser } from "@/lib/representatives";
import {
  listDisciplinary,
  canManageDisciplinary,
} from "@/lib/disciplinary";
import { CreateDisciplinaryPanel, ResolvePanel } from "./disciplinary-panels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Disciplinary — Dealer Network" };

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ACTION_LABEL: Record<string, string> = {
  written_warning: "Written warning",
  suspension: "Suspension",
  termination: "Termination",
};

const ACTION_STYLE: Record<string, string> = {
  written_warning: "bg-amber-50 text-amber-700",
  suspension: "bg-orange-50 text-orange-700",
  termination: "bg-rose-50 text-rose-700",
};

export default async function DisciplinaryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = repScopeForUser(user);
  const canManage = canManageDisciplinary(user);

  const records = await listDisciplinary(user);

  // Manager-only: reps to pick from (scope-filtered by listRepresentatives).
  let reps: { id: string; full_name: string }[] = [];
  if (canManage) {
    const list = await listRepresentatives(user);
    reps = list.map((r) => ({ id: r.id, full_name: r.full_name }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {scope.selfOnly ? "My disciplinary records" : "Disciplinary records"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {records.length} record{records.length === 1 ? "" : "s"}
          {canManage
            ? " in your scope"
            : scope.selfOnly
              ? ""
              : " (read-only in your scope)"}
        </p>
      </div>

      {canManage ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Issue a disciplinary action
          </h2>
          <CreateDisciplinaryPanel reps={reps} />
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Representative</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Issued</th>
              <th className="px-4 py-3 font-medium">Effective</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage ? <th className="px-4 py-3 font-medium">Resolve</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 7 : 6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No disciplinary records.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {r.representative_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ACTION_STYLE[r.action_type] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ACTION_LABEL[r.action_type] ?? r.action_type}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">
                    {r.reason}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {fmtDate(r.issued_date)}
                    <span className="block text-xs text-slate-400">
                      by {r.issued_by_name ?? "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {fmtDate(r.effective_from)}
                    {r.effective_to ? ` – ${fmtDate(r.effective_to)}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {r.resolved ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Resolved {fmtDate(r.resolved_date)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Active
                      </span>
                    )}
                    {r.resolved && r.resolution_notes ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {r.resolution_notes}
                      </p>
                    ) : null}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      {r.resolved ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <ResolvePanel id={r.id} />
                      )}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
