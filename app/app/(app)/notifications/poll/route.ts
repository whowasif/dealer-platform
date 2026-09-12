import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { unreadCount, listNotifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight polling endpoint for the notification bell. Returns the unread
// count plus the newest notification's id/title so the client can detect an
// arrival and play a sound / show a toast.
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const [count, list] = await Promise.all([
    unreadCount(user),
    listNotifications(user),
  ]);
  const latest = list[0] ?? null;

  return NextResponse.json(
    {
      unread: count,
      latest: latest
        ? {
            id: latest.id,
            title: latest.title,
            message: latest.message,
            actionUrl: latest.action_url,
            read: latest.read,
          }
        : null,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
