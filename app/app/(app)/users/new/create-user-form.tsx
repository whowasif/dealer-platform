"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createUserAction,
  type CreateUserState,
} from "../actions";
import type {
  DistrictRow,
  DivisionRow,
  RoleRow,
  UpazilaRow,
} from "@/lib/types";

const initialState: CreateUserState = {};

// Roles that carry a geographic scope, and which level of scope they need.
const SCOPE_BY_ROLE: Record<string, "division" | "district" | "upazila" | null> = {
  divisional_head: "division",
  district_head: "district",
  upazila_representative: "upazila",
};

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create user"}
    </button>
  );
}

/** Scope selector shown when a scoped role is checked. */
function ScopeSelector({
  role,
  divisions,
  districts,
  upazilas,
}: {
  role: RoleRow;
  divisions: DivisionRow[];
  districts: DistrictRow[];
  upazilas: UpazilaRow[];
}) {
  const scopeLevel = SCOPE_BY_ROLE[role.name] ?? null;
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");

  const filteredDistricts = useMemo(
    () => districts.filter((d) => d.division_id === divisionId),
    [districts, divisionId]
  );
  const filteredUpazilas = useMemo(
    () => upazilas.filter((u) => u.district_id === districtId),
    [upazilas, districtId]
  );

  if (!scopeLevel) {
    return (
      <p className="mt-2 text-xs text-slate-400">
        This role has national scope (no geographic selection).
      </p>
    );
  }

  const needDivision = true;
  const needDistrict = scopeLevel === "district" || scopeLevel === "upazila";
  const needUpazila = scopeLevel === "upazila";

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {needDivision ? (
        <select
          name={`scope_division_${role.id}`}
          value={divisionId}
          onChange={(e) => {
            setDivisionId(e.target.value);
            setDistrictId("");
          }}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Select division…</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      ) : null}

      {needDistrict ? (
        <select
          name={`scope_district_${role.id}`}
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
          disabled={!divisionId}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
        >
          <option value="">Select district…</option>
          {filteredDistricts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      ) : null}

      {needUpazila ? (
        <select
          name={`scope_upazila_${role.id}`}
          disabled={!districtId}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
        >
          <option value="">Select upazila…</option>
          {filteredUpazilas.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

export function CreateUserForm({
  roles,
  divisions,
  districts,
  upazilas,
}: {
  roles: RoleRow[];
  divisions: DivisionRow[];
  districts: DistrictRow[];
  upazilas: UpazilaRow[];
}) {
  const [state, formAction] = useFormState(createUserAction, initialState);
  const [checkedRoles, setCheckedRoles] = useState<Set<string>>(new Set());

  function toggleRole(id: string, checked: boolean) {
    setCheckedRoles((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      <Section title="Basic information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" name="full_name" required />
          <Field label="Phone" name="phone" required placeholder="01700000000" />
          <Field label="Personal email" name="personal_email" type="email" />
          <Field label="Official email" name="official_email" type="email" />
          <Field label="NID number" name="nid_number" />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            placeholder="Min 6 characters"
          />
        </div>
      </Section>

      <Section title="Bank information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Bank name" name="bank_name" />
          <Field label="Account number" name="bank_account_no" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Account type
            </span>
            <select
              name="bank_account_type"
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="savings">Savings</option>
              <option value="current">Current</option>
              <option value="other">Other</option>
            </select>
          </label>
          <Field label="Branch" name="bank_branch" />
          <Field label="Routing number" name="bank_routing_no" />
          <Field label="Mobile banking number" name="mobile_banking_no" />
        </div>
      </Section>

      <Section title="Nominee information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nominee name" name="nominee_name" />
          <Field label="Nominee NID" name="nominee_nid" />
          <Field label="Nominee phone" name="nominee_phone" />
          <Field label="Relation" name="nominee_relation" />
          <Field label="Nominee address" name="nominee_address" />
        </div>
      </Section>

      <Section title="Roles & scope">
        <p className="mb-3 text-xs text-slate-500">
          Select one or more roles. Scoped roles require a geographic selection.
        </p>
        <div className="space-y-3">
          {roles.map((role) => {
            const checked = checkedRoles.has(role.id);
            return (
              <div
                key={role.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="role_ids"
                    value={role.id}
                    checked={checked}
                    onChange={(e) => toggleRole(role.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {role.display_name}
                  </span>
                  <span className="text-xs text-slate-400">
                    (level {role.level})
                  </span>
                </label>
                {checked ? (
                  <ScopeSelector
                    role={role}
                    divisions={divisions}
                    districts={districts}
                    upazilas={upazilas}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}{" "}
          <Link href="/users" className="font-semibold underline">
            View users
          </Link>
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link
          href="/users"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
