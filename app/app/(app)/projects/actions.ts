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
import { createProfitConfig, getActiveProfitConfig } from "@/lib/profit-config";
import { createInvestmentSplitConfig } from "@/lib/investment-split-config";
import { notifyApproversOfNew } from "@/lib/approvals";
import { saveFile } from "@/lib/storage";
import {
  createProjectFile,
  sendProjectMessage,
  transitionProjectProgress,
  updateProjectFile,
  createWorkFileCategory,
} from "@/lib/project-workflow";

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

  // If the project starts as a draft, it needs dual approval — notify approvers.
  if (input.status === "draft") {
    try {
      await notifyApproversOfNew("project", projectId);
    } catch {
      /* non-fatal */
    }
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

// -------------------------- Project workspace -------------------------------

export async function createProjectFileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  const projectId = String(formData.get("project_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const contentText = String(formData.get("content_text") ?? "").trim();
  const recipientId = String(formData.get("recipient_id") ?? "").trim() || null;
  const file = formData.get("file");
  if (!projectId || !categoryId || title.length < 2) return { error: "Project, category, and title are required." };
  if (!contentText && (!(file instanceof File) || file.size === 0)) return { error: "Type the document or attach a file." };
  if (file instanceof File && file.size > 15 * 1024 * 1024) return { error: "File is too large (max 15MB)." };

  let storageKey: string | null = null;
  let fileSize: number | null = null;
  let mimeType: string | null = null;
  try {
    if (file instanceof File && file.size > 0) {
      const saved = await saveFile({
        buffer: Buffer.from(await file.arrayBuffer()),
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
      });
      storageKey = saved.storageKey;
      fileSize = saved.fileSize;
      mimeType = file.type || "application/octet-stream";
    }
    await createProjectFile({
      projectId,
      categoryId,
      title,
      contentText: contentText || null,
      storageKey,
      fileSize,
      mimeType,
      recipientId,
    }, actor);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send project file." };
  }
  revalidatePath(`/projects/${projectId}`);
  return { success: "Project file sent." };
}

export async function createWorkFileCategoryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  try {
    await createWorkFileCategory(String(formData.get("name") ?? ""), String(formData.get("description") ?? "").trim() || null, actor);
    revalidatePath("/projects");
    return { success: "Category added." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add category." };
  }
}

export async function sendProjectMessageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  const projectId = String(formData.get("project_id") ?? "");
  const recipientId = String(formData.get("recipient_id") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "");
  try {
    await sendProjectMessage(projectId, recipientId, body, actor);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send message." };
  }
  revalidatePath(`/projects/${projectId}`);
  return { success: "Message sent." };
}

export async function updateProjectFileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  const id = String(formData.get("file_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content_text") ?? "");
  if (!id || title.length < 2 || !content.trim()) return { error: "Title and document text are required." };
  try {
    await updateProjectFile(id, title, content, actor);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not edit project file." };
  }
  return { success: "Project file updated." };
}

export async function transitionProjectProgressAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  const projectId = String(formData.get("project_id") ?? "");
  const stageId = String(formData.get("stage_id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  try {
    await transitionProjectProgress(projectId, stageId, note, actor);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not change project progress." };
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { success: "Project progress updated." };
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

// The investment 40% slice sub-split (executives / supervision+support / future
// works), all as % of NET PROFIT. Top three must sum to the active investment
// percentage; the two supervision sub-parts must sum to supervision %.
const splitConfigSchema = z.object({
  executive_percentage: z.coerce.number().min(0).max(100),
  supervision_percentage: z.coerce.number().min(0).max(100),
  future_works_percentage: z.coerce.number().min(0).max(100),
  supervision_sub_percentage: z.coerce.number().min(0).max(100),
  support_fund_sub_percentage: z.coerce.number().min(0).max(100),
  effective_from: z.string().trim().min(1, "Pick an effective date."),
  notes: optionalText,
});

export async function createInvestmentSplitConfigAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor))
    return { error: "Only HQ can change the investment split." };

  const parsed = splitConfigSchema.safeParse({
    executive_percentage: formData.get("executive_percentage"),
    supervision_percentage: formData.get("supervision_percentage"),
    future_works_percentage: formData.get("future_works_percentage"),
    supervision_sub_percentage: formData.get("supervision_sub_percentage"),
    support_fund_sub_percentage: formData.get("support_fund_sub_percentage"),
    effective_from: formData.get("effective_from"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid config." };
  }
  const c = parsed.data;

  // The top three must equal the CURRENT investment percentage (40 by default).
  const profitCfg = await getActiveProfitConfig();
  const investmentPct = Number(profitCfg?.investment_percentage ?? 40);

  try {
    await createInvestmentSplitConfig(
      {
        executive_percentage: c.executive_percentage,
        supervision_percentage: c.supervision_percentage,
        future_works_percentage: c.future_works_percentage,
        supervision_sub_percentage: c.supervision_sub_percentage,
        support_fund_sub_percentage: c.support_fund_sub_percentage,
        effective_from: c.effective_from,
        notes: c.notes ?? null,
      },
      investmentPct,
      actor.id
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not save config.";
    return { error: msg };
  }

  revalidatePath("/projects/config");
  return { success: "New investment split saved." };
}
