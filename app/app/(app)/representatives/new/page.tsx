import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import {
  canManageRepresentatives,
  listUsersWithoutRepresentative,
  listAvailableUpazilas,
} from "@/lib/representatives";
import { listDivisions, listDistricts } from "@/lib/users";
import { listPackages } from "@/lib/packages";
import { OnboardForm } from "./onboard-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Onboard representative — Dealer Network" };

export default async function NewRepresentativePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canManageRepresentatives(user)) redirect("/representatives");

  const [candidates, upazilas, divisions, districts, packages] =
    await Promise.all([
      listUsersWithoutRepresentative(),
      listAvailableUpazilas(),
      listDivisions(),
      listDistricts(),
      listPackages(),
    ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Onboard representative
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign an existing user to an upazila and package.
          </p>
        </div>
        <Link
          href="/representatives"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to representatives
        </Link>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Every active user is already a representative. Create a new user first
          in{" "}
          <Link href="/users/new" className="font-semibold underline">
            Users → New user
          </Link>
          , then onboard them here.
        </div>
      ) : (
        <OnboardForm
          candidates={candidates}
          upazilas={upazilas}
          divisions={divisions}
          districts={districts}
          packages={packages}
        />
      )}
    </div>
  );
}
