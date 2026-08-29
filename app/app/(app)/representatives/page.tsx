import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  listRepresentatives,
  repScopeForUser,
  canManageRepresentatives,
  type RepListFilters,
} from "@/lib/representatives";
import { listDivisions, listDistricts } from "@/lib/users";
import { RepFilters } from "./rep-filters";
import { StatusBadge } from "./status-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Representatives — Dealer Network" };

export default async function RepresentativesPage({
  searchParams,
}: {
  searchParams: { division?: string; district?: string; status?: string; package?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = repScopeForUser(user);
  // A plain representative should land on their own detail, not the roster.
  if (scope.selfOnly) redirect("/representatives/me");

  const filters: RepListFilters = {
    divisionId: searchParams.division || null,
    districtId: searchParams.district || null,
    status: searchParams.status || null,
    packageName: searchParams.package || null,
  };

  const [reps, divisions, districts] = await Promise.all([
    listRepresentatives(user, filters),
    listDivisions(),
    listDistricts(),
  ]);

  const canCreate = canManageRepresentatives(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Representatives</h1>
          <p className="mt-1 text-sm text-slate-500">
            {reps.length} representative{reps.length === 1 ? "" : "s"}
            {isHQ(user) ? " nationwide" : " in your area"}
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/representatives/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + New representative
          </Link>
        ) : null}
      </div>

      <RepFilters
        divisions={divisions}
        districts={districts}
        showGeography={scope.all}
        current={{
          division: searchParams.division ?? "",
          district: searchParams.district ?? "",
          status: searchParams.status ?? "",
          package: searchParams.package ?? "",
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Upazila</th>
              <th className="px-4 py-3 font-medium">District</th>
              <th className="px-4 py-3 font-medium">Division</th>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reps.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No representatives match the current filters.
                </td>
              </tr>
            ) : (
              reps.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/representatives/${r.id}`} className="block">
                      {r.full_name}
                      <span className="block text-xs font-normal text-slate-400">
                        {r.phone}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.upazila_name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.district_name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.division_name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.package_display_name}
                  </td>
                  <td className="px-4 py-3">
                    {r.is_district_head ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        District Head
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Representative</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
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
