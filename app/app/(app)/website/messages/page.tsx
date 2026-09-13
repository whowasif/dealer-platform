import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isSuperAdmin } from "@/lib/rbac";
import { listContactMessages } from "@/lib/website-content";
import { MessageCard } from "./messages-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact Messages — Website Content" };

export default async function MessagesAdminPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isSuperAdmin(user)) redirect("/dashboard");

  const filter = searchParams.filter === "unread" ? "unread" : "all";
  const messages = await listContactMessages(filter);
  const unreadCount = (await listContactMessages("unread")).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Contact Messages
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Messages submitted through the website contact form.
            {unreadCount > 0 ? ` ${unreadCount} unread.` : " All caught up."}
          </p>
        </div>
        <Link
          href="/website"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Website
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        <Link
          href="/website/messages"
          className={`rounded-full px-3 py-1 font-medium ${
            filter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </Link>
        <Link
          href="/website/messages?filter=unread"
          className={`rounded-full px-3 py-1 font-medium ${
            filter === "unread"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
        </Link>
      </div>

      <div className="space-y-3">
        {messages.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            {filter === "unread"
              ? "No unread messages."
              : "No messages yet."}
          </p>
        ) : (
          messages.map((m) => <MessageCard key={m.id} msg={m} />)
        )}
      </div>
    </div>
  );
}
