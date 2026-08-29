"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  onboardRepresentativeAction,
  type ActionState,
} from "../actions";
import type { DistrictRow, DivisionRow, PackageRow } from "@/lib/types";
import type {
  AvailableUpazila,
  OnboardingCandidate,
} from "@/lib/representatives";

const initialState: ActionState = {};

function money(v: string | number | null): string {
  const n = Number(v ?? 0);
  return "৳" + n.toLocaleString("en-BD");
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Onboarding…" : "Onboard representative"}
    </button>
  );
}

export function OnboardForm({
  candidates,
  upazilas,
  divisions,
  districts,
  packages,
}: {
  candidates: OnboardingCandidate[];
  upazilas: AvailableUpazila[];
  divisions: DivisionRow[];
  districts: DistrictRow[];
  packages: PackageRow[];
}) {
  const [state, formAction] = useFormState(
    onboardRepresentativeAction,
    initialState
  );

  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [upazilaId, setUpazilaId] = useState("");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");

  const filteredDistricts = useMemo(
    () => districts.filter((d) => d.division_id === divisionId),
    [districts, divisionId]
  );
  // Only upazilas that (a) belong to the selected district AND (b) have no rep.
  const filteredUpazilas = useMemo(
    () => upazilas.filter((u) => u.district_id === districtId),
    [upazilas, districtId]
  );

  const selectedPackage = packages.find((p) => p.id === packageId) ?? null;
  const selectedUpazila = upazilas.find((u) => u.id === upazilaId) ?? null;
  const isSadar = selectedUpazila?.is_sadar === true;

  return (
    <form action={formAction} className="space-y-5">
      {/* User selection */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Person
        </h2>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            User <span className="text-red-500">*</span>
          </span>
          <select
            name="user_id"
            required
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Select a user…
            </option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} — {c.phone}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-400">
            Only users who are not already representatives are listed.
          </span>
        </label>
      </section>

      {/* Geography */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Location (one representative per upazila)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Division <span className="text-red-500">*</span>
            </span>
            <select
              value={divisionId}
              onChange={(e) => {
                setDivisionId(e.target.value);
                setDistrictId("");
                setUpazilaId("");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              District <span className="text-red-500">*</span>
            </span>
            <select
              value={districtId}
              onChange={(e) => {
                setDistrictId(e.target.value);
                setUpazilaId("");
              }}
              disabled={!divisionId}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="">Select…</option>
              {filteredDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Upazila <span className="text-red-500">*</span>
            </span>
            <select
              name="upazila_id"
              required
              value={upazilaId}
              onChange={(e) => setUpazilaId(e.target.value)}
              disabled={!districtId}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="">Select…</option>
              {filteredUpazilas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.is_sadar ? " (Sadar)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {districtId && filteredUpazilas.length === 0 ? (
          <p className="mt-3 text-xs text-amber-600">
            All upazilas in this district already have a representative.
          </p>
        ) : null}

        {isSadar ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This is the district&apos;s <strong>Sadar</strong> upazila — the
            representative will automatically be set as the{" "}
            <strong>District Head</strong>.
          </p>
        ) : null}
      </section>

      {/* Package */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Package
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {packages.map((p) => {
            const active = p.id === packageId;
            return (
              <label
                key={p.id}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  active
                    ? "border-brand-500 ring-2 ring-brand-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="package_id"
                    value={p.id}
                    checked={active}
                    onChange={() => setPackageId(p.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    {p.display_name}
                  </span>
                </span>
                <dl className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <dt>Investment</dt>
                    <dd className="font-medium">{money(p.investment_amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>· Refundable</dt>
                    <dd>{money(p.refundable_amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>· Non-refundable</dt>
                    <dd>{money(p.non_refundable_amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Onboarding fee</dt>
                    <dd>{money(p.onboarding_fee)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Investment units</dt>
                    <dd>{Number(p.investment_units)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Laptop included</dt>
                    <dd>{p.includes_laptop ? "Yes" : "No"}</dd>
                  </div>
                </dl>
              </label>
            );
          })}
        </div>
        {selectedPackage ? (
          <p className="mt-3 text-xs text-slate-500">
            Refundable balance will be initialised to{" "}
            <strong>{money(selectedPackage.refundable_amount)}</strong> and
            investment units to{" "}
            <strong>
              {Number(selectedPackage.investment_amount) / 100000}
            </strong>
            .
          </p>
        ) : null}
      </section>

      {/* Optional details */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Optional
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Join date
            </span>
            <input
              name="join_date"
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Notes
            </span>
            <textarea
              name="notes"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}{" "}
          <Link href="/representatives" className="font-semibold underline">
            View representatives
          </Link>
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link
          href="/representatives"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
