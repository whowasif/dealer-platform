import { logoutAction } from "@/lib/auth-actions";

export function Topbar({
  fullName,
  roleLabel,
}: {
  fullName: string;
  roleLabel: string;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">
        Signed in as{" "}
        <span className="font-medium text-slate-800">{fullName}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {roleLabel}
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
