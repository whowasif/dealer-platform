"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTransaction, queryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import {
  canManageRepresentativeInDistrict,
  canManageRepresentatives,
  getRepresentative,
} from "@/lib/representatives";
import { nextContractNumber } from "@/lib/contracts";
import { recordAudit } from "@/lib/audit";
import type {
  ContractStatus,
  PackageRow,
  RepresentativeStatus,
} from "@/lib/types";

// -----------------------------------------------------------------------------
// Server actions for representative onboarding & contract management.
// Every action re-checks authorization server-side.
// -----------------------------------------------------------------------------

export interface ActionState {
  error?: string;
  success?: string;
}

// ------------------------------- Onboarding ----------------------------------

const onboardSchema = z.object({
  user_id: z.string().uuid("Select a user"),
  upazila_id: z.string().uuid("Select an upazila"),
  package_id: z.string().uuid("Select a package"),
  join_date: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

/**
 * Onboard a representative:
 *  - creates the representatives row
 *  - investment_units   = package.investment_amount / 100000
 *  - refundable_balance  = package.refundable_amount
 *  - is_district_head    = TRUE when the upazila is its district's sadar
 *  - status starts at 'applied'
 */
export async function onboardRepresentativeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!canManageRepresentatives(actor)) {
    return { error: "You are not authorized to onboard representatives." };
  }

  const parsed = onboardSchema.safeParse({
    user_id: formData.get("user_id"),
    upazila_id: formData.get("upazila_id"),
    package_id: formData.get("package_id"),
    join_date: formData.get("join_date"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  // Resolve the upazila's district/division + sadar flag for scope + dual-role.
  const geo = await queryOne<{
    district_id: string;
    division_id: string;
    is_sadar: boolean;
  }>(
    `SELECT up.district_id, d.division_id, up.is_sadar
       FROM upazilas up
       JOIN districts d ON d.id = up.district_id
      WHERE up.id = $1`,
    [d.upazila_id]
  );
  if (!geo) return { error: "Selected upazila was not found." };

  if (!canManageRepresentativeInDistrict(actor, geo.district_id, geo.division_id)) {
    return { error: "That upazila is outside your area of responsibility." };
  }

  const pkg = await queryOne<PackageRow>(
    `SELECT id, investment_amount, refundable_amount, investment_units
       FROM packages WHERE id = $1 AND is_active = TRUE`,
    [d.package_id]
  );
  if (!pkg) return { error: "Selected package was not found." };

  const investmentAmount = Number(pkg.investment_amount);
  const investmentUnits = investmentAmount / 100000;
  const refundableBalance = Number(pkg.refundable_amount);
  const isDistrictHead = geo.is_sadar === true;

  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO representatives (
            user_id, upazila_id, package_id, status, join_date,
            investment_amount, investment_units, refundable_balance,
            is_district_head, notes
         ) VALUES ($1,$2,$3,'applied',$4,$5,$6,$7,$8,$9)`,
        [
          d.user_id,
          d.upazila_id,
          d.package_id,
          d.join_date,
          investmentAmount,
          investmentUnits,
          refundableBalance,
          isDistrictHead,
          d.notes,
        ]
      );
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("representatives_upazila_id_key")) {
      return { error: "This upazila already has a representative." };
    }
    if (msg.includes("representatives_user_id_key")) {
      return { error: "This user is already a representative." };
    }
    return { error: "Could not onboard representative. Please try again." };
  }

  revalidatePath("/representatives");
  return {
    success: isDistrictHead
      ? "Representative onboarded and set as District Head (sadar upazila)."
      : "Representative onboarded successfully.",
  };
}

// --------------------------- Status transitions ------------------------------

// Allowed status transitions (current -> set of next states).
const ALLOWED_TRANSITIONS: Record<RepresentativeStatus, RepresentativeStatus[]> = {
  applied: ["approved", "terminated"],
  approved: ["active", "terminated"],
  active: ["suspended", "terminated", "resigned"],
  suspended: ["active", "terminated"],
  terminated: [],
  resigned: [],
};

const statusSchema = z.object({
  representative_id: z.string().uuid(),
  next_status: z.enum([
    "approved",
    "active",
    "suspended",
    "terminated",
    "resigned",
  ]),
});

export async function updateRepresentativeStatusAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const parsed = statusSchema.safeParse({
    representative_id: formData.get("representative_id"),
    next_status: formData.get("next_status"),
  });
  if (!parsed.success) return { error: "Invalid status change request." };
  const { representative_id, next_status } = parsed.data;

  const rep = await getRepresentative(representative_id);
  if (!rep) return { error: "Representative not found." };
  if (
    !canManageRepresentativeInDistrict(actor, rep.district_id, rep.division_id)
  ) {
    return { error: "You are not authorized to change this representative." };
  }

  const allowed = ALLOWED_TRANSITIONS[rep.status] ?? [];
  if (!allowed.includes(next_status)) {
    return {
      error: `Cannot change status from "${rep.status}" to "${next_status}".`,
    };
  }

  const terminating =
    next_status === "terminated" || next_status === "resigned";

  try {
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE representatives
            SET status = $1,
                termination_date = CASE WHEN $2 THEN CURRENT_DATE ELSE termination_date END,
                updated_at = NOW()
          WHERE id = $3`,
        [next_status, terminating, representative_id]
      );
      await recordAudit(client, {
        userId: actor.id,
        action: "status",
        tableName: "representatives",
        recordId: representative_id,
        oldValue: { status: rep.status },
        newValue: { status: next_status },
      });
    });
  } catch {
    return { error: "Could not update status. Please try again." };
  }

  revalidatePath(`/representatives/${representative_id}`);
  revalidatePath("/representatives");
  return { success: `Status updated to "${next_status}".` };
}

// ------------------------------- Deposits ------------------------------------

const depositSchema = z.object({
  representative_id: z.string().uuid(),
  type: z.enum([
    "investment_refundable",
    "investment_non_refundable",
    "onboarding_fee",
  ]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_method: z.enum([
    "bank_transfer",
    "bkash",
    "nagad",
    "rocket",
    "check",
    "other_dfs",
  ]),
  reference_no: z.string().trim().min(1, "Reference number is required"),
  notes: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export async function recordDepositAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const parsed = depositSchema.safeParse({
    representative_id: formData.get("representative_id"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    payment_date: formData.get("payment_date"),
    payment_method: formData.get("payment_method"),
    reference_no: formData.get("reference_no"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const rep = await getRepresentative(d.representative_id);
  if (!rep) return { error: "Representative not found." };
  if (
    !canManageRepresentativeInDistrict(actor, rep.district_id, rep.division_id)
  ) {
    return { error: "You are not authorized to record deposits for this rep." };
  }

  const isRefundable = d.type === "investment_refundable";

  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO deposits (
            representative_id, type, amount, is_refundable, payment_date,
            payment_method, reference_no, notes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          d.representative_id,
          d.type,
          d.amount,
          isRefundable,
          d.payment_date,
          d.payment_method,
          d.reference_no,
          d.notes ?? null,
        ]
      );
    });
  } catch {
    return { error: "Could not record deposit. Please try again." };
  }

  revalidatePath(`/representatives/${d.representative_id}`);
  return { success: "Deposit recorded." };
}

// ------------------------------- Contracts -----------------------------------

const contractSchema = z.object({
  representative_id: z.string().uuid(),
  start_date: z.string().min(1, "Start date is required"),
  term_years: z.coerce.number().int().min(1).max(20).default(3),
  renewal_fee: z.coerce.number().min(0).default(0),
});

export async function createContractAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const parsed = contractSchema.safeParse({
    representative_id: formData.get("representative_id"),
    start_date: formData.get("start_date"),
    term_years: formData.get("term_years") || 3,
    renewal_fee: formData.get("renewal_fee") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const rep = await getRepresentative(d.representative_id);
  if (!rep) return { error: "Representative not found." };
  if (
    !canManageRepresentativeInDistrict(actor, rep.district_id, rep.division_id)
  ) {
    return { error: "You are not authorized to create contracts for this rep." };
  }

  try {
    await withTransaction(async (client) => {
      const contractNumber = await nextContractNumber(client);
      // end_date = start_date + term_years, computed in SQL for accuracy.
      await client.query(
        `INSERT INTO contracts (
            representative_id, contract_number, start_date, end_date,
            term_years, renewal_fee, status
         ) VALUES (
            $1, $2, $3::date,
            ($3::date + ($4 || ' years')::interval)::date,
            $4, $5, 'draft'
         )`,
        [d.representative_id, contractNumber, d.start_date, d.term_years, d.renewal_fee]
      );
    });
  } catch {
    return { error: "Could not create contract. Please try again." };
  }

  revalidatePath(`/representatives/${d.representative_id}`);
  return { success: "Contract created (draft). Advance it through signing to activate." };
}

// Allowed contract status transitions.
const CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ["pending_signature", "terminated"],
  pending_signature: ["active", "terminated"],
  active: ["expired", "terminated", "renewed"],
  expired: ["renewed"],
  terminated: [],
  renewed: [],
};

const contractStatusSchema = z.object({
  contract_id: z.string().uuid(),
  representative_id: z.string().uuid(),
  next_status: z.enum([
    "pending_signature",
    "active",
    "expired",
    "terminated",
    "renewed",
  ]),
});

export async function updateContractStatusAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const parsed = contractStatusSchema.safeParse({
    contract_id: formData.get("contract_id"),
    representative_id: formData.get("representative_id"),
    next_status: formData.get("next_status"),
  });
  if (!parsed.success) return { error: "Invalid contract status request." };
  const { contract_id, representative_id, next_status } = parsed.data;

  const rep = await getRepresentative(representative_id);
  if (!rep) return { error: "Representative not found." };
  if (
    !canManageRepresentativeInDistrict(actor, rep.district_id, rep.division_id)
  ) {
    return { error: "You are not authorized to change this contract." };
  }

  const current = await queryOne<{ status: ContractStatus }>(
    `SELECT status FROM contracts WHERE id = $1 AND representative_id = $2`,
    [contract_id, representative_id]
  );
  if (!current) return { error: "Contract not found." };

  const allowed = CONTRACT_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(next_status)) {
    return {
      error: `Cannot change contract from "${current.status}" to "${next_status}".`,
    };
  }

  const nowSigned = next_status === "active";

  try {
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE contracts
            SET status = $1,
                signed_at = CASE WHEN $2 AND signed_at IS NULL THEN NOW() ELSE signed_at END,
                updated_at = NOW()
          WHERE id = $3`,
        [next_status, nowSigned, contract_id]
      );
    });
  } catch {
    return { error: "Could not update contract status. Please try again." };
  }

  revalidatePath(`/representatives/${representative_id}`);
  return { success: `Contract status updated to "${next_status}".` };
}
