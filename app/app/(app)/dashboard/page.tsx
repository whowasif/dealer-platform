import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ, hasRole, primaryRoleLabel } from "@/lib/rbac";
import { queryOne } from "@/lib/db";
import type { SessionUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard — Dealer Network" };

interface CountRow {
  count: string;
}

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const row = await queryOne<CountRow>(sql, params);
  return row ? parseInt(row.count, 10) : 0;
}

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

async function HQCards() {
  const [users, reps, divisions, districts, upazilas] = await Promise.all([
    count("SELECT COUNT(*)::text AS count FROM users"),
    count("SELECT COUNT(*)::text AS count FROM representatives"),
    count("SELECT COUNT(*)::text AS count FROM divisions"),
    count("SELECT COUNT(*)::text AS count FROM districts"),
    count("SELECT COUNT(*)::text AS count FROM upazilas"),
  ]);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card label="Total Users" value={users} hint="System accounts" />
      <Card label="Representatives" value={reps} hint="Registered dealers" />
      <Card label="Divisions" value={divisions} />
      <Card label="Districts" value={districts} />
      <Card label="Upazilas" value={upazilas} />
    </div>
  );
}

function ProfileCards({ user }: { user: SessionUser }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card label="Your Role" value={primaryRoleLabel(user)} />
      <Card label="Phone" value={user.phone} />
      <Card label="Official Email" value={user.official_email ?? "—"} />
      <Card label="Assigned Roles" value={user.roles.length} />
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const hq = isHQ(user);
  const greeting = hq
    ? "Here is the national overview."
    : hasRole(user, "divisional_head")
      ? "Here is your division overview."
      : hasRole(user, "district_head")
        ? "Here is your district overview."
        : "Here is your account summary.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {user.full_name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{greeting}</p>
      </div>

      {hq ? <HQCards /> : <ProfileCards user={user} />}
    </div>
  );
}
