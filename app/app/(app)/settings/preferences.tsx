"use client";

import { useEffect, useState } from "react";

// -----------------------------------------------------------------------------
// Client-side preferences persisted in localStorage. These are UX toggles (not
// security-relevant), so localStorage is appropriate and avoids a DB round-trip.
// The notification poller (topbar) reads the same keys.
// -----------------------------------------------------------------------------

const KEYS = {
  sound: "pref:notif-sound",
  desktop: "pref:notif-desktop",
} as const;

function useBoolPref(key: string, initial: boolean) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) setValue(stored === "1");
  }, [key]);

  const update = (v: boolean) => {
    setValue(v);
    window.localStorage.setItem(key, v ? "1" : "0");
    window.dispatchEvent(new StorageEvent("storage", { key }));
  };

  return [value, update] as const;
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
          value ? "bg-brand-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function NotificationPreferences() {
  const [sound, setSound] = useBoolPref(KEYS.sound, true);
  const [desktop, setDesktop] = useBoolPref(KEYS.desktop, false);

  async function handleDesktop(v: boolean) {
    if (v && "Notification" in window && Notification.permission !== "granted") {
      const res = await Notification.requestPermission();
      if (res !== "granted") return; // leave off if denied
    }
    setDesktop(v);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Notifications
      </h2>
      <div className="mt-2 divide-y divide-slate-100">
        <Toggle
          label="Notification sound"
          description="Play a short chime when a new notification arrives."
          value={sound}
          onChange={setSound}
        />
        <Toggle
          label="Desktop notifications"
          description="Show a browser notification (requires permission)."
          value={desktop}
          onChange={handleDesktop}
        />
      </div>
      <button
        type="button"
        onClick={() => {
          const audio = new Audio("/notify.wav");
          audio.volume = 0.5;
          audio.play().catch(() => {});
        }}
        className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
      >
        Test sound
      </button>
    </section>
  );
}
