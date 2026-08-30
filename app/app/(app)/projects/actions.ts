"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  getRepresentativeIdByUser,
  canManageRepresentativeInDistrict,
} from "@/lib/representatives";
import { queryOne } from "@/lib/db";
import {
  createProject,
  distributeProject,
  getProject,
  canViewProject,
} from "@/lib/projects";
import { createProfitConfig, createInvestmentConfig } from "@/lib/profit-config";

// -----------------------------------------------------------------------------
// Server actions for the projects feature. Every action re-checks authorization
// server-side. Financial engine + transactions live in lib/projects.ts.
// -----------------------------------------------------------------------------

export interface ActionState {
  error?: string;
  success?: string;
  projectId?: string;
}

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

// ------------------------------ Create project -------------------------------

const createSchema = z.object({
  representative_id: z.string().uuid(),
  customer_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  title: z.string().trim().min(3, "Title must be at least 3 characters."),
  description: optionalText,
  project_value: z.coerce.number().positive("Project value must be greater than 0."),
  vat_tax_percentage: z.coerce.number().min(0).max(100),
  vat_tax_amount: z.coerce.number().min(0),
  total_cost: z.coerce.number().min(0),
  status: z.enum(["draft", "in_progress"]),
});

/**
 * Determine whether `user` may create a project for the given representative.
 * Reps create their own; HQ any; heads within their scope. Returns an error
 * message string when not allowed, otherwise null.
 */
async function assertCanCreateForRep(
  user: Awaited<ReturnType<typeof getSessionUser>>,
  representativeId: string
): Promise<string | null> {
  if (!user) return "Not authenticated.";

  // A representative may only create for themselves.
  const ownRepId = await getRepresentativeIdByUser(user.id);
  if (ownRepId && ownRepId === representativeId) return null;

  // HQ / heads: check management scope for the rep's district/division.
  const geo = await queryOne<{ district_id: string; division_id: string }>(
    `SELECT d.id AS district_id, d.division_id
       FROM representatives rep
       JOIN upazilas up ON up.id = rep.upazila_id
       JOIN districts d  ON d.id = up.district_id
      WHERE rep.id = $1`,
    [representativeId]
  );
  if (!geo) return "Selected representative was not found.";

  if (canManageRepresentativeInDistrict(user, geo.district_id, geo.division_id)) {
    return null;
  }
  return "You are not authorized to create a project for that representative.";
}

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const parsed = createSchema.safeParse({
    representative_id: formData.get("representative_id"),
    customer_id: formData.get("customer_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    project_value: formData.get("project_value"),
    vat_tax_percentage: formData.get("vat_tax_percentage"),
    vat_tax_amount: formData.get("vat_tax_amount"),
    total_cost: formData.get("total_cost"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid project details." };
  }
  const input = parsed.data;

  // net profit must be sensible: costs + vat cannot exceed value below zero net.
  if (input.vat_tax_amount + input.total_cost > input.project_value) {
    return {
      error:
        "VAT/tax plus total cost cannot exceed the project value (net profit would be negative).",
    };
  }

  const authErr = await assertCanCreateForRep(actor, input.representative_id);
  if (authErr) return { error: authErr };

  let projectId: string;
  try {
    projectId = await createProject(
      {
        representative_id: input.representative_id,
        customer_id: input.customer_id ?? null,
        title: input.title,
        description: input.description ?? null,
        project_value: input.project_value,
        vat_tax_percentage: input.vat_tax_percentage,
        vat_tax_amount: input.vat_tax_amount,
        total_cost: input.total_cost,
        status: input.status,
      },
      actor
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not create project.";
    return { error: msg };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: "Project created.", projectId };
}

// ----------------------------- Distribute profit -----------------------------

export async function distributeProjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor)) {
    return { error: "Only HQ can distribute project profit." };
  }

  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return { error: "Missing project." };

  // Confirm the project exists and is viewable (defense-in-depth).
  const project = await getProject(projectId);
  if (!project) return { error: "Project not found." };
  if (!canViewProject(actor, project)) {
    return { error: "You are not authorized for this project." };
  }

  try {
    await distributeProject(projectId, actor);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not distribute profit.";
    return { error: msg };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: "Profit distributed. The breakdown is now locked." };
}

// --------------------------- Profit config (HQ only) -------------------------

const profitConfigSchema = z.object({
  representative_percentage: z.coerce.number().min(0).max(100),
  hq_percentage: z.coerce.number().min(0).max(100),
  investment_percentage: z.coerce.number().min(0).max(100),
  effective_from: z.string().trim().min(1, "Pick an effective date."),
});

export async function createProfitConfigAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor)) return { error: "Only HQ can change the profit split." };

  const parsed = profitConfigSchema.safeParse({
    representative_percentage: formData.get("representative_percentage"),
    hq_percentage: formData.get("hq_percentage"),
    investment_percentage: formData.get("investment_percentage"),
    effective_from: formData.get("effective_from"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid config." };
  }
  const c = parsed.data;

  try {
    await createProfitConfig(
      {
        representative_percentage: c.representative_percentage,
        hq_percentage: c.hq_percentage,
        investment_percentage: c.investment_percentage,
        effective_from: c.effective_from,
      },
      actor.id
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not save config.";
    return { error: msg };
  }

  revalidatePath("/projects/config");
  return { success: "New profit split saved." };
}

const investConfigSchema = z.object({
  per_unit_amount: z.coerce.number().positive("Per-unit amount must be > 0."),
  total_working_capital: z.coerce.number().min(0).optional(),
  effective_from: z.string().trim().min(1, "Pick an effective date."),
  notes: optionalText,
});

export async function createInvestmentConfigAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor)) return { error: "Only HQ can change the investment pool." };

  const parsed = investConfigSchema.safeParse({
    per_unit_amount: formData.get("per_unit_amount"),
    total_working_capital: formData.get("total_working_capital"),
    effective_from: formData.get("effective_from"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid config." };
  }
  const c = parsed.data;

  try {
    await createInvestmentConfig(
      {
        per_unit_amount: c.per_unit_amount,
        total_working_capital: c.total_working_capital ?? null,
        effective_from: c.effective_from,
        notes: c.notes ?? null,
      },
      actor.id
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not save config.";
    return { error: msg };
  }

  revalidatePath("/projects/config");
  return { success: "New investment pool config saved." };
}
