"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import {
  generateMonthlyInvoices,
  createInvoice,
  recordPayment,
  verifyPayment,
  getInvoice,
} from "@/lib/fees";
import { createFeeSchedule } from "@/lib/fee-schedules";

// -----------------------------------------------------------------------------
// Server actions for the fees feature. Every action re-checks authorization
// server-side (HQ-only for all writes). Transactions + ledger posting live in
// lib/fees.ts, lib/fee-schedules.ts and lib/ledger.ts.
// -----------------------------------------------------------------------------

export interface ActionState {
  error?: string;
  success?: string;
}

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const FEE_TYPES = ["monthly_software", "contract_renewal", "other"] as const;
const PAYMENT_METHODS = [
  "bank_transfer",
  "bkash",
  "nagad",
  "rocket",
  "check",
  "other_dfs",
] as const;
const PAYMENT_TYPES = [
  "deposit",
  "fee",
  "order_payment",
  "renewal",
  "other",
] as const;

function revalidateFees() {
  revalidatePath("/fees");
  revalidatePath("/fees/payments");
}

// ------------------------- Generate monthly invoices -------------------------

const generateSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export async function generateMonthlyInvoicesAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor)) return { error: "Only HQ can generate monthly invoices." };

  const parsed = generateSchema.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Pick a valid period." };
  }

  try {
    const result = await generateMonthlyInvoices(
      parsed.data.year,
      parsed.data.month,
      actor
    );
    revalidateFees();
    return {
      success: `Generated ${result.created} invoice${
        result.created === 1 ? "" : "s"
      }, skipped ${result.skipped} (already invoiced or nothing to charge).`,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Could not generate invoices.";
    return { error: msg };
  }
}

// ------------------------------ Manual invoice -------------------------------

const invoiceSchema = z
  .object({
    representative_id: z.string().uuid("Pick a representative."),
    fee_type: z.enum(FEE_TYPES),
    period_start: z.string().trim().min(1, "Pick a period start."),
    period_end: z.string().trim().min(1, "Pick a period end."),
    amount: z.coerce.number().positive("Amount must be greater than 0."),
    due_date: z.string().trim().min(1, "Pick a due date."),
  })
  .refine((v) => v.period_end >= v.period_start, {
    message: "Period end cannot be before period start.",
    path: ["period_end"],
  });

export async function createInvoiceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor)) return { error: "Only HQ can create invoices." };

  const parsed = invoiceSchema.safeParse({
    representative_id: formData.get("representative_id"),
    fee_type: formData.get("fee_type"),
    period_start: formData.get("period_start"),
    period_end: formData.get("period_end"),
    amount: formData.get("amount"),
    due_date: formData.get("due_date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid invoice." };
  }
  const c = parsed.data;

  try {
    await createInvoice(
      {
        representativeId: c.representative_id,
        feeType: c.fee_type,
        periodStart: c.period_start,
        periodEnd: c.period_end,
        amount: c.amount,
        dueDate: c.due_date,
      },
      actor
    );
    revalidateFees();
    return { success: "Invoice created and posted to the ledger." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not create invoice.";
    return { error: msg };
  }
}

// ------------------------------ Record payment -------------------------------

const paymentSchema = z.object({
  representative_id: z.string().uuid("Pick a representative."),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  payment_date: z.string().trim().min(1, "Pick a payment date."),
  payment_method: z.enum(PAYMENT_METHODS),
  reference_no: z.string().trim().min(1, "A reference is required."),
  payment_type: z.enum(PAYMENT_TYPES),
  related_invoice_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  notes: optionalText,
});

export async function recordPaymentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor)) return { error: "Only HQ can record payments." };

  const parsed = paymentSchema.safeParse({
    representative_id: formData.get("representative_id"),
    amount: formData.get("amount"),
    payment_date: formData.get("payment_date"),
    payment_method: formData.get("payment_method"),
    reference_no: formData.get("reference_no"),
    payment_type: formData.get("payment_type"),
    related_invoice_id: formData.get("related_invoice_id"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid payment." };
  }
  const c = parsed.data;

  // If an invoice is linked, confirm it belongs to the selected rep up front
  // (recordPayment re-checks this inside the transaction too).
  if (c.related_invoice_id) {
    const inv = await getInvoice(c.related_invoice_id);
    if (!inv) return { error: "The linked invoice was not found." };
    if (inv.representative_id !== c.representative_id) {
      return { error: "The linked invoice belongs to a different representative." };
    }
  }

  try {
    await recordPayment(
      c.representative_id,
      {
        amount: c.amount,
        paymentDate: c.payment_date,
        paymentMethod: c.payment_method,
        referenceNo: c.reference_no,
        relatedInvoiceId: c.related_invoice_id ?? null,
        paymentType: c.payment_type,
        notes: c.notes ?? null,
      },
      actor
    );
    revalidateFees();
    return { success: "Payment recorded and posted to the ledger." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not record payment.";
    return { error: msg };
  }
}

// ------------------------------ Verify payment -------------------------------

export async function verifyPaymentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor)) return { error: "Only HQ can verify payments." };

  const paymentId = String(formData.get("payment_id") ?? "");
  if (!paymentId) return { error: "Missing payment." };

  try {
    await verifyPayment(paymentId, actor);
    revalidateFees();
    return { success: "Payment verified." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not verify payment.";
    return { error: msg };
  }
}

// --------------------------- Fee schedule (HQ only) --------------------------

const scheduleSchema = z.object({
  fee_type: z.enum(FEE_TYPES),
  amount: z.coerce.number().min(0, "Amount cannot be negative."),
  description: optionalText,
  effective_from: z.string().trim().min(1, "Pick an effective date."),
});

export async function createFeeScheduleAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };
  if (!isHQ(actor)) return { error: "Only HQ can manage fee schedules." };

  const parsed = scheduleSchema.safeParse({
    fee_type: formData.get("fee_type"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    effective_from: formData.get("effective_from"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid schedule." };
  }
  const c = parsed.data;

  try {
    await createFeeSchedule(
      {
        fee_type: c.fee_type,
        amount: c.amount,
        description: c.description ?? null,
        effective_from: c.effective_from,
      },
      actor.id
    );
    revalidatePath("/fees/schedules");
    return { success: "New fee schedule saved." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not save schedule.";
    return { error: msg };
  }
}
