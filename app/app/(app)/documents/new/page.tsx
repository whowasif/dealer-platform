import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listCategories, resolveOwnerScope } from "@/lib/documents";
import { listRepresentatives } from "@/lib/representatives";
import { listProjects } from "@/lib/projects";
import { listOrders } from "@/lib/orders";
import { listCustomers } from "@/lib/customers";
import type { DocumentRelatedType } from "@/lib/types";
import {
  UploadForm,
  type CategoryOption,
  type EntityOption,
  type UploadOptions,
} from "./upload-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upload document — Dealer Network" };

type RelatedType = "none" | DocumentRelatedType;

const VALID_PRESET: DocumentRelatedType[] = [
  "representative",
  "project",
  "order",
  "customer",
];

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: { related_type?: string; related_id?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Gather everything the user may link to (scope enforced by each list fn).
  const [categories, reps, projects, orders, customers] = await Promise.all([
    listCategories(),
    listRepresentatives(user, {}),
    listProjects(user, {}),
    listOrders(user, {}),
    listCustomers(user, {}),
  ]);

  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const options: UploadOptions = {
    reps: reps.map<EntityOption>((r) => ({
      id: r.id,
      label: `${r.full_name} — ${r.upazila_name}, ${r.district_name}`,
    })),
    projects: projects.map<EntityOption>((p) => ({
      id: p.id,
      label: `${p.project_number} — ${p.title}`,
    })),
    orders: orders.map<EntityOption>((o) => ({
      id: o.id,
      label: `${o.order_number}${o.customer_name ? ` — ${o.customer_name}` : ""}`,
    })),
    customers: customers.map<EntityOption>((c) => ({
      id: c.id,
      label: c.name,
    })),
  };

  // Resolve an optional preset (e.g. from a detail page "Upload document" link).
  // Validate that the preset entity is within the user's scope before locking.
  let presetType: RelatedType = "none";
  let presetId: string | null = null;
  let presetLabel: string | null = null;

  const rawType = searchParams.related_type ?? "";
  const rawId = searchParams.related_id ?? "";
  if (
    VALID_PRESET.includes(rawType as DocumentRelatedType) &&
    rawId.length > 0
  ) {
    const type = rawType as DocumentRelatedType;
    const inScope =
      (type === "representative" && options.reps.some((o) => o.id === rawId)) ||
      (type === "project" && options.projects.some((o) => o.id === rawId)) ||
      (type === "order" && options.orders.some((o) => o.id === rawId)) ||
      (type === "customer" && options.customers.some((o) => o.id === rawId));
    if (inScope) {
      const owner = await resolveOwnerScope(type, rawId);
      presetType = type;
      presetId = rawId;
      presetLabel = owner.label;
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload document</h1>
          <p className="mt-1 text-sm text-slate-500">
            Store a soft copy and (optionally) link it to a representative,
            project, order, or customer.
          </p>
        </div>
        <Link
          href="/documents"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to documents
        </Link>
      </div>

      <UploadForm
        categories={categoryOptions}
        options={options}
        presetType={presetType}
        presetId={presetId}
        presetLabel={presetLabel}
      />
    </div>
  );
}
