import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Dealer Network" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Dealer Network Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your account
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Authorized personnel only.
        </p>
      </div>
    </main>
  );
}
