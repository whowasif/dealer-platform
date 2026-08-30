"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { uploadDocumentAction, type ActionState } from "../actions";

// -----------------------------------------------------------------------------
// Upload form (multipart/form-data). Lets the user choose a category, a link
// target (rep / project / order / customer / none) with a scoped picker of the
// specific entity, and document metadata. The file input is validated again on
// the server (type + size). representative_id / project_id are auto-filled on
// the server from the chosen link, so this form only submits related_type +
// related_id.
// -----------------------------------------------------------------------------

export interface CategoryOption {
  id: string;
  name: string;
}

export interface EntityOption {
  id: string;
  label: string;
}

export interface UploadOptions {
  reps: EntityOption[];
  projects: EntityOption[];
  orders: EntityOption[];
  customers: EntityOption[];
}

type RelatedType = "none" | "representative" | "project" | "order" | "customer";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Uploading…" : "Upload document"}
    </button>
  );
}

export function UploadForm({
  categories,
  options,
  presetType,
  presetId,
  presetLabel,
}: {
  categories: CategoryOption[];
  options: UploadOptions;
  presetType: RelatedType;
  presetId: string | null;
  presetLabel: string | null;
}) {
  const [state, formAction] = useFormState(uploadDocumentAction, initialState);
  const router = useRouter();

  const preLocked = presetType !== "none" && presetId != null;

  const [relatedType, setRelatedType] = useState<RelatedType>(presetType);
  const [relatedId, setRelatedId] = useState<string>(presetId ?? "");

  const entityList = useMemo<EntityOption[]>(() => {
    switch (relatedType) {
      case "representative":
        return options.reps;
      case "project":
        return options.projects;
      case "order":
        return options.orders;
      case "customer":
        return options.customers;
      default:
        return [];
    }
  }, [relatedType, options]);

  useEffect(() => {
    if (state.documentId) {
      router.push(`/documents/${state.documentId}`);
    }
  }, [state.documentId, router]);

  return (
    <form action={formAction} className="space-y-5" encType="multipart/form-data">
      {/* File + category */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          File & category
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              File
            </span>
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,image/*"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
            />
            <span className="mt-1 block text-xs text-slate-400">
              PDF, images, Word/Excel, or text/CSV. Max 15MB.
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Category
            </span>
            <select
              name="category_id"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
            >
              <option value="" disabled>
                — Choose a category —
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Link target */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Link to
        </h2>
        {preLocked ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2 text-sm text-brand-800">
            Linking to <span className="font-semibold">{presetLabel}</span>.
            <input type="hidden" name="related_type" value={presetType} />
            <input type="hidden" name="related_id" value={presetId ?? ""} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Type
              </span>
              <select
                name="related_type"
                value={relatedType}
                onChange={(e) => {
                  setRelatedType(e.target.value as RelatedType);
                  setRelatedId("");
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
              >
                <option value="none">Not linked</option>
                <option value="representative">Representative</option>
                <option value="project">Project</option>
                <option value="order">Order</option>
                <option value="customer">Customer</option>
              </select>
            </label>

            {relatedType !== "none" ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  {relatedType === "representative"
                    ? "Representative"
                    : relatedType === "project"
                      ? "Project"
                      : relatedType === "order"
                        ? "Order"
                        : "Customer"}
                </span>
                <select
                  name="related_id"
                  required
                  value={relatedId}
                  onChange={(e) => setRelatedId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    — Choose —
                  </option>
                  {entityList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {entityList.length === 0 ? (
                  <span className="mt-1 block text-xs text-amber-600">
                    None available in your scope.
                  </span>
                ) : null}
              </label>
            ) : null}
          </div>
        )}
      </section>

      {/* Metadata */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Details
        </h2>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </span>
          <input
            name="title"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Signed work order for office network"
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Document number{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              name="document_number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. WO-2026-014"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Document date{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              name="document_date"
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Amount (৳){" "}
              <span className="font-normal text-slate-400">
                (for bills/quotations)
              </span>
            </span>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. 125000"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Expiry date{" "}
              <span className="font-normal text-slate-400">
                (for licenses, etc.)
              </span>
            </span>
            <input
              name="expiry_date"
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Tags{" "}
            <span className="font-normal text-slate-400">
              (comma-separated, optional)
            </span>
          </span>
          <input
            name="tags"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. urgent, 2026, signed"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Notes{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Any extra context about this document"
          />
        </label>
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
          href="/documents"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
