import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isSuperAdmin } from "@/lib/rbac";
import { listInsightCards } from "@/lib/website-content";
import { AddInsightForm, InsightCard } from "./insights-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights Cards — Website Content" };

export default async function InsightsAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isSuperAdmin(user)) redirect("/dashboard");

  const cards = await listInsightCards();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Insights &amp; Opportunity
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            The article cards on the public website. Photos and text are fully
            editable. Order is set by &quot;sort order&quot; (low to high).
          </p>
        </div>
        <Link
          href="/website"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Website
        </Link>
      </div>

      <AddInsightForm />

      <div className="space-y-3">
        {cards.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            No insight cards yet. Add one above.
          </p>
        ) : (
          cards.map((c) => <InsightCard key={c.id} card={c} />)
        )}
      </div>
    </div>
  );
}
