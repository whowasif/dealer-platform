"use client";

import { useFormState, useFormStatus } from "react-dom";
import { PasswordInput } from "@/components/password-input";
import {
  updateProfileAction,
  changePasswordAction,
  type ProfileState,
  type PasswordState,
} from "./actions";
import type { ProfileRow } from "@/lib/profile";

const profileInit: ProfileState = {};
const passwordInit: PasswordState = {};

function TextField({
  label,
  name,
  defaultValue,
  type = "text",
  disabled = false,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function ProfileEditForm({ profile }: { profile: ProfileRow }) {
  const [state, action] = useFormState(updateProfileAction, profileInit);

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Account (read only)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Full name" name="_full_name" defaultValue={profile.full_name} disabled />
          <TextField label="Phone" name="_phone" defaultValue={profile.phone} disabled />
          <TextField label="Official email" name="_official_email" defaultValue={profile.official_email} disabled />
          <TextField label="NID number" name="_nid" defaultValue={profile.nid_number} disabled />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Contact the super admin to change your name, phone, official email, or
          NID.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Personal details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Personal email" name="personal_email" type="email" defaultValue={profile.personal_email} />
          <TextField label="Father's name" name="father_name" defaultValue={profile.father_name} />
          <TextField label="Mother's name" name="mother_name" defaultValue={profile.mother_name} />
          <TextField label="Address" name="address" defaultValue={profile.address} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bank & nominee
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Bank name" name="bank_name" defaultValue={profile.bank_name} />
          <TextField label="Account number" name="bank_account_no" defaultValue={profile.bank_account_no} />
          <TextField label="Branch" name="bank_branch" defaultValue={profile.bank_branch} />
          <TextField label="Mobile banking number" name="mobile_banking_no" defaultValue={profile.mobile_banking_no} />
          <TextField label="Nominee name" name="nominee_name" defaultValue={profile.nominee_name} />
          <TextField label="Nominee phone" name="nominee_phone" defaultValue={profile.nominee_phone} />
          <TextField label="Nominee relation" name="nominee_relation" defaultValue={profile.nominee_relation} />
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      ) : null}

      <SaveButton label="Save profile" />
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useFormState(changePasswordAction, passwordInit);

  return (
    <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Change password
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:max-w-md">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Current password
          </span>
          <PasswordInput name="current_password" autoComplete="current-password" required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            New password
          </span>
          <PasswordInput name="new_password" autoComplete="new-password" required placeholder="Min 6 characters" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Confirm new password
          </span>
          <PasswordInput name="confirm_password" autoComplete="new-password" required />
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      ) : null}

      <SaveButton label="Update password" />
    </form>
  );
}
