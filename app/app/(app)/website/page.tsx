import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isSuperAdmin } from "@/lib/rbac";
import {
  listInsightCards,
  listNetworkCards,
  countUnreadContactMessages,
} from "@/lib/website-content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website Content — Dealer Network" };

export default async function WebsiteHubPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isSuperAdmin(user)) redirect("/dashboard");

  const [insights, network, unread] = await Promise.all([
    listInsightCards(),
    listNetworkCards(),
    countUnreadContactMessages(),
  ]);

  const cards = [
    {
      href: "/website/insights",
      title: "Insights & Opportunity",
      desc: "The article cards on the public site — edit photos and text.",
      stat: `${insights.length} card${insights.length === 1 ? "" : "s"}`,
    },
    {
      href: "/website/network",
      title: "Our Network (photos)",
      desc: "The horizontal photo filmstrip — add, edit, reorder, or remove.",
      stat: `${network.length} card${network.length === 1 ? "" : "s"}`,
    },
    {
      href: "/website/messages",
      title: "Contact Messages",
      desc: "Messages submitted through the website contact form.",
      stat: unread > 0 ? `${unread} unread` : "inbox",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Website Content</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage what appears on the public MIS Solution website. Changes save
          to the database and show on the site immediately. Super admin only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                {c.title}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {c.stat}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">{c.desc}</p>
            <span className="mt-3 inline-block text-sm font-medium text-brand-600">
              Manage →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
