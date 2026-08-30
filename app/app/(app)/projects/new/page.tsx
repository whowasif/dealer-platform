import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ, hasRole } from "@/lib/rbac";
import {
  getRepresentativeIdByUser,
  listRepresentatives,
} from "@/lib/representatives";
import { listCustomers } from "@/lib/customers";
import { getActiveProfitConfig, getActiveInvestmentConfig } from "@/lib/profit-config";
import { NewProjectForm, type RepOption, type CustomerOption } from "./new-project-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New project — Dealer Network" };

export default async function NewProjectPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const repId = await getRepresentativeIdByUser(user.id);
  const hq = isHQ(user);
  const isHead = hasRole(user, "divisional_head") || hasRole(user, "district_head");

  // Only reps, heads, or HQ may create projects.
  if (!repId && !hq && !isHead) redirect("/projects");

  const [reps, customers, profitCfg, investCfg] = await Promise.all([
    listRepresentatives(user, {}),
    listCustomers(user, {}),
    getActiveProfitConfig(),
    getActiveInvestmentConfig(),
  ]);

  const repOptions: RepOption[] = reps.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    name: r.full_name,
    upazila_name: r.upazila_name,
    district_name: r.district_name,
  }));

  const customerOptions: CustomerOption[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    representative_id: c.representative_id,
  }));

  // The rep pre-selected when the viewer is themselves a representative.
  const selfRepId = repId ?? null;

  const config = {
    representative_percentage: Number(profitCfg?.representative_percentage ?? 20),
    hq_percentage: Number(profitCfg?.hq_percentage ?? 40),
    investment_percentage: Number(profitCfg?.investment_percentage ?? 40),
    per_unit_amount: Number(investCfg?.per_unit_amount ?? 100000),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New project</h1>
          <p className="mt-1 text-sm text-slate-500">
            Record a business deal. Profit is split{" "}
            {config.representative_percentage}% rep / {config.hq_percentage}% HQ /{" "}
            {config.investment_percentage}% investment when distributed.
          </p>
        </div>
        <Link
          href="/projects"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to projects
        </Link>
      </div>

      {repOptions.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          There are no representatives in your scope to create a project for.
        </div>
      ) : (
        <NewProjectForm
          reps={repOptions}
          customers={customerOptions}
          selfRepId={selfRepId}
          lockRep={selfRepId != null && !hq && !isHead}
          config={config}
        />
      )}
    </div>
  );
}
