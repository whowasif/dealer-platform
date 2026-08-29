import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/rbac";
import {
  listRoles,
  listDivisions,
  listDistricts,
  listUpazilas,
} from "@/lib/users";
import { CreateUserForm } from "./create-user-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New user — Dealer Network" };

export default async function NewUserPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canManageUsers(user)) redirect("/dashboard");

  const [roles, divisions, districts, upazilas] = await Promise.all([
    listRoles(),
    listDivisions(),
    listDistricts(),
    listUpazilas(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create user</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add a new account and assign roles with geographic scope.
          </p>
        </div>
        <Link
          href="/users"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to users
        </Link>
      </div>

      <CreateUserForm
        roles={roles}
        divisions={divisions}
        districts={districts}
        upazilas={upazilas}
      />
    </div>
  );
}
