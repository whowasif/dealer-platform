"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// -----------------------------------------------------------------------------
// NotificationBell — polls the server for unread notifications, updates the
// badge live, and plays a chime + optional desktop notification when a NEW one
// arrives. Respects the localStorage preferences set on the Settings page.
//
// Browser note: audio can only play after the user has interacted with the page
// once (autoplay policy). We arm playback on the first pointer/key event.
// -----------------------------------------------------------------------------

const POLL_MS = 20000;

function pref(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  return v === null ? fallback : v === "1";
}

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canPlay = useRef(false);
  const lastLatestId = useRef<string | null>(null);
  const primed = useRef(false);

  // Arm audio on first user interaction (satisfies autoplay policy).
  useEffect(() => {
    const arm = () => {
      canPlay.current = true;
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  const notifyArrival = useCallback(
    (latest: { id: string; title: string; message: string }) => {
      // Sound
      if (pref("pref:notif-sound", true) && canPlay.current) {
        try {
          const a = audioRef.current ?? new Audio("/notify.wav");
          audioRef.current = a;
          a.volume = 0.5;
          a.currentTime = 0;
          void a.play().catch(() => {});
        } catch {
          /* ignore */
        }
      }
      // Desktop notification
      if (
        pref("pref:notif-desktop", false) &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(latest.title, { body: latest.message });
        } catch {
          /* ignore */
        }
      }
    },
    []
  );

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/notifications/poll", { cache: "no-store" });
      if (!res.ok) return;
      const data: {
        unread: number;
        latest: { id: string; title: string; message: string; read: boolean } | null;
      } = await res.json();

      setUnread(data.unread);

      const latest = data.latest;
      if (latest) {
        // First poll just records the baseline; don't chime for existing items.
        if (!primed.current) {
          lastLatestId.current = latest.id;
          primed.current = true;
        } else if (latest.id !== lastLatestId.current && !latest.read) {
          lastLatestId.current = latest.id;
          notifyArrival(latest);
          router.refresh(); // refresh server-rendered lists/badges
        }
      }
    } catch {
      /* network hiccup — try again next tick */
    }
  }, [notifyArrival, router]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    // Poll immediately when the tab regains focus.
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [poll]);

  return (
    <Link
      href="/notifications"
      className="relative rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-100"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unread > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
