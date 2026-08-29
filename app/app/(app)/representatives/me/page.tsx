import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getRepresentativeIdByUser } from "@/lib/representatives";

export const dynamic = "force-dynamic";
export const metadata = { title: "My representative — Dealer Network" };

/**
 * Convenience route for a representative to view their own record.
 * Resolves the current user's representative id and forwards to the shared
 * detail page (which enforces its own scope check).
 */
export default async function MyRepresentativePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const repId = await getRepresentativeIdByUser(user.id);
  if (!repId) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">
          No representative record
        </h1>
        <p>
          Your account is not linked to a representative profile yet. Please
          contact your district head or HQ to complete onboarding.
        </p>
      </div>
    );
  }

  redirect(`/representatives/${repId}`);
}
