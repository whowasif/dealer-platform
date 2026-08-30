import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ, hasRole } from "@/lib/rbac";
import {
  getRepresentativeIdByUser,
  repScopeForUser,
} from "@/lib/representatives";
import { listProjects, type ProjectListFilters } from "@/lib/projects";
import { listDivisions, listDistricts } from "@/lib/users";
import { ProjectFilters } from "./project-filters";
import { ProjectStatusBadge } from "./status-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects — Dealer Network" };

function money(v: string | number | null): string {
  const n = Number(v ?? 0);
  return "৳" + n.toLocaleString("en-BD");
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    division?: string;
    district?: string;
    year?: string;
  };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const filters: ProjectListFilters = {
    status: searchParams.status || null,
    divisionId: searchParams.division || null,
    districtId: searchParams.district || null,
    year: searchParams.year || null,
  };

  const scope = repScopeForUser(user);
  const showGeography = scope.all || scope.divisionId != null;

  const [projects, repId, divisions, districts] = await Promise.all([
    listProjects(user, filters),
    getRepresentativeIdByUser(user.id),
    showGeography ? listDivisions() : Promise.resolve([]),
    showGeography ? listDistricts() : Promise.resolve([]),
  ]);

  const hq = isHQ(user);
  // Who can create: a rep (self), any head, or HQ.
  const canCreate =
    repId != null ||
    hq ||
    hasRole(user, "divisional_head") ||
    hasRole(user, "district_head");

  // Distinct profit years present in the current result set (for the filter).
  const years = Array.from(
    new Set(
      projects
        .map((p) => p.profit_year)
        .filter((y): y is number => y != null)
    )
  ).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {scope.selfOnly ? "My projects" : "Projects"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {projects.length} project{projects.length === 1 ? "" : "s"}
            {hq ? " nationwide" : scope.selfOnly ? "" : " in your area"}
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/projects/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + New project
          </Link>
        ) : null}
      </div>

      <ProjectFilters
        divisions={divisions}
        districts={districts}
        showGeography={showGeography}
        years={years}
        current={{
          status: searchParams.status ?? "",
          division: searchParams.division ?? "",
          district: searchParams.district ?? "",
          year: searchParams.year ?? "",
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Project #</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Representative</th>
              <th className="px-4 py-3 font-medium">Upazila / District</th>
              <th className="px-4 py-3 font-medium">Project value</th>
              <th className="px-4 py-3 font-medium">Net profit</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No projects match the current filters.
                </td>
              </tr>
            ) : (
              projects.map((p) => {
                const mine = p.rep_user_id === user.id;
                return (
                  <tr key={p.id} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-brand-700">
                      <Link href={`/projects/${p.id}`} className="block">
                        {p.project_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link href={`/projects/${p.id}`} className="block">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {mine ? (
                        <span className="font-medium text-slate-800">You</span>
                      ) : (
                        p.representative_name
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.upazila_name}
                      <span className="text-slate-400"> · {p.district_name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {money(p.project_value)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {money(p.net_profit)}
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={p.status} />
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
