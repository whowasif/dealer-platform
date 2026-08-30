import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import { listComplaints, listAssignableUsers } from "@/lib/complaints";
import {
  FileComplaintPanel,
  AssignPanel,
  StatusPanel,
} from "./complaint-panels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Complaints — Dealer Network" };

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-50 text-sky-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-200 text-slate-700",
};

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-rose-50 text-rose-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-500",
};

export default async function ComplaintsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const hq = isHQ(user);
  const complaints = await listComplaints(user);
  const assignees = hq ? await listAssignableUsers() : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Complaints</h1>
        <p className="mt-1 text-sm text-slate-500">
          {complaints.length} complaint{complaints.length === 1 ? "" : "s"}
          {hq ? " (all)" : " you filed or are assigned"}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          File a complaint
        </h2>
        <FileComplaintPanel />
      </section>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Complainant</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
              <th className="px-4 py-3 font-medium">Filed</th>
              <th className="px-4 py-3 font-medium">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No complaints.
                </td>
              </tr>
            ) : (
              complaints.map((c) => {
                const canUpdate = hq || c.assigned_to === user.id;
                return (
                  <tr key={c.id} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                      {c.complaint_number}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="font-medium text-slate-800">{c.subject}</p>
                      <p className="text-xs text-slate-500">{c.description}</p>
                      {c.resolution_notes ? (
                        <p className="mt-1 text-xs text-emerald-600">
                          Resolution: {c.resolution_notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.complainant_name ?? "—"}
                      {c.complainant_phone ? (
                        <span className="block text-xs text-slate-400">
                          {c.complainant_phone}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          PRIORITY_STYLE[c.priority] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLE[c.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.assigned_to_name ?? (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {fmtDate(c.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        {hq ? <AssignPanel id={c.id} assignees={assignees} /> : null}
                        {canUpdate ? (
                          <StatusPanel id={c.id} current={c.status} />
                        ) : (
                          <span className="text-xs text-slate-400">
                            View only
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
