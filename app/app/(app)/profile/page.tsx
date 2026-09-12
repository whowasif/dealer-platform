import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { primaryRoleLabel } from "@/lib/rbac";
import { getProfile } from "@/lib/profile";
import { ProfileEditForm, ChangePasswordForm } from "./profile-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "My profile — Dealer Network" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          {profile.full_name} · {primaryRoleLabel(user)}
        </p>
      </div>

      <ProfileEditForm profile={profile} />
      <ChangePasswordForm />
    </div>
  );
}
