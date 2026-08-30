import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  listAudit,
  auditTableNames,
  auditActions,
  type AuditFilters as AuditFilterValues,
} from "@/lib/audit";
import { AuditFilters } from "./audit-filters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log — Dealer Network" };

function fmtDateTime(v: string): string {
  return new Date(v).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_STYLE: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700",
  update: "bg-sky-50 text-sky-700",
  status: "bg-amber-50 text-amber-700",
  verify: "bg-brand-50 text-brand-700",
  distribute: "bg-violet-50 text-violet-700",
  resolve: "bg-emerald-50 text-emerald-700",
  assign: "bg-sky-50 text-sky-700",
  delete: "bg-rose-50 text-rose-700",
};

/** Render a compact old -> new diff from the JSONB snapshots. */
function Diff({
  oldValue,
  newValue,
}: {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}) {
  const keys = Array.from(
    new Set([
      ...Object.keys(oldValue ?? {}),
      ...Object.keys(newValue ?? {}),
    ])
  );
  if (keys.length === 0) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <ul className="space-y-0.5 text-xs">
      {keys.map((k) => {
        const before = oldValue?.[k];
        const after = newValue?.[k];
        const changed = JSON.stringify(before) !== JSON.stringify(after);
        return (
          <li key={k} className="font-mono">
            <span className="text-slate-500">{k}:</span>{" "}
            {before !== undefined ? (
              <span className={changed ? "text-rose-600 line-through" : "text-slate-600"}>
                {String(before)}
              </span>
            ) : null}
            {before !== undefined && after !== undefined ? " → " : ""}
            {after !== undefined ? (
              <span className={changed ? "text-emerald-700" : "text-slate-600"}>
                {String(after)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { table?: string; action?: string; from?: string; to?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // HQ ONLY — server-side authorization (not just menu hiding).
  if (!isHQ(user)) redirect("/dashboard");

  const filters: AuditFilterValues = {
    tableName: searchParams.table || null,
    action: searchParams.action || null,
    from: searchParams.from || null,
    to: searchParams.to || null,
  };

  const [entries, tables, actions] = await Promise.all([
    listAudit(user, filters),
    auditTableNames(),
    auditActions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Immutable trail of sensitive changes. Showing {entries.length} most
          recent {entries.length === 1 ? "entry" : "entries"} (max 200).
        </p>
      </div>

      <AuditFilters
        current={{
          table: searchParams.table ?? "",
          action: searchParams.action ?? "",
          from: searchParams.from ?? "",
          to: searchParams.to ?? "",
        }}
        tables={tables}
        actions={actions}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Table</th>
              <th className="px-4 py-3 font-medium">Record</th>
              <th className="px-4 py-3 font-medium">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No audit entries match the current filters.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {fmtDateTime(e.created_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {e.user_name ?? (
                      <span className="text-slate-400">System</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ACTION_STYLE[e.action] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {e.table_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {e.record_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    <Diff oldValue={e.old_value} newValue={e.new_value} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
