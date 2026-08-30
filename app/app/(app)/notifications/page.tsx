import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listNotifications, unreadCount } from "@/lib/notifications";
import { MarkReadButtonForm, MarkAllReadForm } from "./notification-panels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications — Dealer Network" };

function fmtDateTime(v: string): string {
  return new Date(v).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_STYLE: Record<string, string> = {
  disciplinary: "bg-rose-50 text-rose-700",
  complaint: "bg-sky-50 text-sky-700",
  system: "bg-slate-100 text-slate-600",
};

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [notifications, unread] = await Promise.all([
    listNotifications(user),
    unreadCount(user),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 ? <MarkAllReadForm /> : null}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
            You have no notifications.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 shadow-sm transition ${
                n.read
                  ? "border-slate-200 bg-white"
                  : "border-brand-200 bg-brand-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read ? (
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full bg-brand-500"
                        aria-label="Unread"
                      />
                    ) : null}
                    <p className="font-semibold text-slate-800">{n.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        TYPE_STYLE[n.type] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {n.type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {fmtDateTime(n.created_at)}
                    </span>
                    {n.action_url ? (
                      <Link
                        href={n.action_url}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        View →
                      </Link>
                    ) : null}
                  </div>
                </div>
                {!n.read ? <MarkReadButtonForm id={n.id} /> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
