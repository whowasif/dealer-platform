"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createProjectAction, type ActionState } from "../actions";

// -----------------------------------------------------------------------------
// Create-project form with a LIVE PREVIEW of net profit and the projected
// three-way split + per-unit investment return, computed client-side using the
// active config passed from the server. The authoritative computation still
// happens on the server at distribution time; this preview is guidance only.
// -----------------------------------------------------------------------------

export interface RepOption {
  id: string;
  user_id: string;
  name: string;
  upazila_name: string;
  district_name: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  representative_id: string;
}

export interface PreviewConfig {
  representative_percentage: number;
  hq_percentage: number;
  investment_percentage: number;
  per_unit_amount: number;
}

const initialState: ActionState = {};

function fmt(n: number, dp = 2): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-BD", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create project"}
    </button>
  );
}

export function NewProjectForm({
  reps,
  customers,
  selfRepId,
  lockRep,
  config,
}: {
  reps: RepOption[];
  customers: CustomerOption[];
  selfRepId: string | null;
  lockRep: boolean;
  config: PreviewConfig;
}) {
  const [state, formAction] = useFormState(createProjectAction, initialState);
  const router = useRouter();

  const [repId, setRepId] = useState<string>(selfRepId ?? reps[0]?.id ?? "");
  const [projectValue, setProjectValue] = useState<string>("");
  const [vatPct, setVatPct] = useState<string>("15");
  const [vatAmount, setVatAmount] = useState<string>("");
  const [vatManual, setVatManual] = useState<boolean>(false);
  const [totalCost, setTotalCost] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");

  // Keep VAT amount in sync with percentage unless the user overrode it.
  useEffect(() => {
    if (vatManual) return;
    const val = Number(projectValue);
    const pct = Number(vatPct);
    if (Number.isFinite(val) && Number.isFinite(pct)) {
      const amt = Math.round(((val * pct) / 100) * 100) / 100;
      setVatAmount(val > 0 ? String(amt) : "");
    }
  }, [projectValue, vatPct, vatManual]);

  // On success, route to the new project's detail page.
  useEffect(() => {
    if (state.projectId) {
      router.push(`/projects/${state.projectId}`);
    }
  }, [state.projectId, router]);

  // Customers belonging to the selected representative only.
  const repCustomers = useMemo(
    () => customers.filter((c) => c.representative_id === repId),
    [customers, repId]
  );

  // --- Live preview math (mirrors the server engine) ---
  const val = Number(projectValue) || 0;
  const vat = Number(vatAmount) || 0;
  const cost = Number(totalCost) || 0;
  const netProfit = Math.round((val - vat - cost) * 100) / 100;

  const repShare =
    Math.round(((netProfit * config.representative_percentage) / 100) * 100) / 100;
  const hqShare =
    Math.round(((netProfit * config.hq_percentage) / 100) * 100) / 100;
  const investShare =
    Math.round(((netProfit * config.investment_percentage) / 100) * 100) / 100;
  const perUnit =
    cost > 0
      ? Math.round((investShare / cost) * config.per_unit_amount * 10000) / 10000
      : 0;

  const netNegative = val > 0 && netProfit < 0;

  return (
    <form action={formAction} className="space-y-5">
      {/* Representative + customer */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Who & what
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Representative (main dealer)
            </span>
            <select
              name="representative_id"
              value={repId}
              onChange={(e) => {
                setRepId(e.target.value);
                setCustomerId("");
              }}
              disabled={lockRep}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            >
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.upazila_name}, {r.district_name}
                </option>
              ))}
            </select>
            {lockRep ? (
              <input type="hidden" name="representative_id" value={repId} />
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Customer (optional)
            </span>
            <select
              name="customer_id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {repCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </span>
          <input
            name="title"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Upazila office network installation"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </span>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional details about the project"
          />
        </label>
      </section>

      {/* Financials */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Financials
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Project value (৳)
            </span>
            <input
              name="project_value"
              type="number"
              min="0"
              step="0.01"
              required
              value={projectValue}
              onChange={(e) => setProjectValue(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="3000000"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Total cost (goods + expenses) (৳)
            </span>
            <input
              name="total_cost"
              type="number"
              min="0"
              step="0.01"
              required
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="2250000"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              VAT / tax %
            </span>
            <input
              name="vat_tax_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={vatPct}
              onChange={(e) => {
                setVatManual(false);
                setVatPct(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              VAT / tax amount (৳){" "}
              <span className="font-normal text-slate-400">
                (auto from %, editable)
              </span>
            </span>
            <input
              name="vat_tax_amount"
              type="number"
              min="0"
              step="0.01"
              required
              value={vatAmount}
              onChange={(e) => {
                setVatManual(true);
                setVatAmount(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="450000"
            />
          </label>
        </div>

        <label className="mt-4 block max-w-xs">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Save as
          </span>
          <select
            name="status"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            defaultValue="in_progress"
          >
            <option value="draft">Draft</option>
            <option value="in_progress">In progress</option>
          </select>
        </label>
      </section>

      {/* Live preview */}
      <section className="rounded-xl border border-brand-200 bg-brand-50/50 p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700">
          Live preview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PreviewStat label="Net profit" value={`৳${fmt(netProfit)}`} strong />
          <PreviewStat
            label={`Rep share (${config.representative_percentage}%)`}
            value={`৳${fmt(repShare)}`}
          />
          <PreviewStat
            label={`HQ share (${config.hq_percentage}%)`}
            value={`৳${fmt(hqShare)}`}
          />
          <PreviewStat
            label={`Investment pool (${config.investment_percentage}%)`}
            value={`৳${fmt(investShare)}`}
          />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Investment return per unit (per ৳
          {config.per_unit_amount.toLocaleString("en-BD")}):{" "}
          <span className="font-semibold text-slate-900">৳{fmt(perUnit, 4)}</span>
        </p>
        {netNegative ? (
          <p className="mt-2 text-sm font-medium text-red-700">
            Net profit is negative — VAT/tax plus total cost exceed the project
            value.
          </p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          Preview only. The final split is computed and locked by HQ when the
          profit is distributed, using the config effective at that time.
        </p>
      </section>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link
          href="/projects"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function PreviewStat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 ${
          strong ? "text-lg font-bold text-slate-900" : "text-base font-semibold text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
