import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { primaryRoleLabel, isSuperAdmin } from "@/lib/rbac";
import { getProfile } from "@/lib/profile";
import { ProfileEditForm, ChangePasswordForm } from "../profile/profile-forms";
import { NotificationPreferences } from "./preferences";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — Dealer Network" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          {profile.full_name} · {primaryRoleLabel(user)}
        </p>
      </div>

      {/* Preferences */}
      <NotificationPreferences />

      {/* Security */}
      <ChangePasswordForm />

      {/* Profile */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Profile information
        </h2>
        <ProfileEditForm profile={profile} />
      </div>

      {/* Admin shortcuts (super admin only) */}
      {isSuperAdmin(user) ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Administration
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/users"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Manage users
            </Link>
            <Link
              href="/representatives"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Manage representatives
            </Link>
            <Link
              href="/audit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Audit log
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
