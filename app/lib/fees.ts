import "server-only";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "./db";
import { isHQ } from "./rbac";
import { repScopeForUser } from "./representatives";
import { getActiveFeeScheduleTx } from "./fee-schedules";
import { postLedgerEntry } from "./ledger";
import { recordAudit } from "./audit";
import type {
  FeeInvoiceListItem,
  FeeType,
  PaymentListItem,
  PaymentMethod,
  PaymentType,
  SessionUser,
} from "./types";

// -----------------------------------------------------------------------------
// Fee invoices & payments, with atomic ledger posting.
//
// fee_invoices has NO invoice number column — invoices are identified by id.
//
// Ledger rules (see lib/ledger.ts for the full model):
//   * Creating a fee invoice posts a DEBIT  (the rep now owes the amount).
//   * Recording a payment posts a CREDIT     (the rep settled part of what they
//     owe).
// Each of these happens in the SAME transaction as the invoice/payment insert,
// so the ledger can never drift from the underlying records.
//
// "Overdue" is computed VIRTUALLY in queries (status = 'pending' AND due_date <
// today) so no cron/persisted state is required; a helper is provided to persist
// it if HQ wants to.
//
// Money DECIMALs are strings from node-postgres; math uses Number(), rounded to
// 2 decimals.
// -----------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const FEE_LABEL: Record<FeeType, string> = {
  monthly_software: "Monthly software fee",
  contract_renewal: "Contract renewal fee",
  other: "Fee",
};

// ------------------------- Monthly invoice generation ------------------------

export interface GenerateResult {
  created: number;
  skipped: number;
  period_start: string;
  period_end: string;
}

/**
 * Generate 'monthly_software' fee invoices for a given year/month, one per
 * ACTIVE representative. Idempotent: a rep that already has a monthly_software
 * invoice for that exact period (representative_id + fee_type + period_start) is
 * SKIPPED. Each newly-created invoice also posts a ledger DEBIT — all within one
 * transaction.
 *
 * Amount = the active monthly_software fee_schedule amount on period_start, or,
 * when no schedule row exists, the representative's package.monthly_maintenance_fee.
 * Reps without either an amount source are skipped (nothing to charge).
 *
 * period_start = 1st of the month, period_end = last day, due_date = 10th.
 * HQ-only (enforced by the caller; re-checked here as defense-in-depth).
 */
export async function generateMonthlyInvoices(
  year: number,
  month: number,
  user: SessionUser
): Promise<GenerateResult> {
  if (!isHQ(user)) {
    throw new Error("Only HQ can generate monthly invoices.");
  }
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error("Pick a valid year and month.");
  }

  // Period boundaries (UTC-safe date literals).
  const periodStart = isoDate(new Date(Date.UTC(year, month - 1, 1)));
  const periodEnd = isoDate(new Date(Date.UTC(year, month, 0))); // day 0 of next month = last day
  const dueDate = isoDate(new Date(Date.UTC(year, month - 1, 10)));

  return withTransaction(async (client) => {
    // All active representatives + their package maintenance fee (fallback).
    const reps = await client.query<{
      id: string;
      monthly_maintenance_fee: string | null;
    }>(
      `SELECT rep.id, pk.monthly_maintenance_fee
         FROM representatives rep
         JOIN packages pk ON pk.id = rep.package_id
        WHERE rep.status = 'active'
        ORDER BY rep.id`
    );

    // Active fee schedule for the period (may be null -> use package fallback).
    const schedule = await getActiveFeeScheduleTx(
      client,
      "monthly_software",
      periodStart
    );
    const scheduleAmount = schedule ? Number(schedule.amount) : null;

    let created = 0;
    let skipped = 0;

    for (const rep of reps.rows) {
      // Idempotency guard: already invoiced for this rep+type+period?
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM fee_invoices
          WHERE representative_id = $1
            AND fee_type = 'monthly_software'
            AND period_start = $2::date`,
        [rep.id, periodStart]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        skipped += 1;
        continue;
      }

      const amount =
        scheduleAmount != null
          ? scheduleAmount
          : rep.monthly_maintenance_fee != null
            ? Number(rep.monthly_maintenance_fee)
            : null;

      // Nothing to charge (no schedule and no package fee) -> skip.
      if (amount == null || !(amount > 0)) {
        skipped += 1;
        continue;
      }

      const rounded = round2(amount);
      const invRes = await client.query<{ id: string }>(
        `INSERT INTO fee_invoices
            (representative_id, fee_type, period_start, period_end, amount,
             due_date, status)
         VALUES ($1,'monthly_software',$2::date,$3::date,$4,$5::date,'pending')
         RETURNING id`,
        [rep.id, periodStart, periodEnd, rounded, dueDate]
      );
      const invoiceId = invRes.rows[0]!.id;

      await postLedgerEntry(client, {
        representativeId: rep.id,
        transactionDate: periodStart,
        transactionType: "fee_charge",
        description: `${FEE_LABEL.monthly_software} (${periodStart} – ${periodEnd})`,
        debit: rounded,
        credit: 0,
        referenceType: "fee_invoice",
        referenceId: invoiceId,
      });

      created += 1;
    }

    return { created, skipped, period_start: periodStart, period_end: periodEnd };
  });
}

// ------------------------------ Manual invoice -------------------------------

export interface NewInvoice {
  representativeId: string;
  feeType: FeeType;
  periodStart: string; // 'YYYY-MM-DD'
  periodEnd: string;
  amount: number;
  dueDate: string;
}

/**
 * Create a single manual fee invoice (e.g. contract_renewal or other) and post
 * its ledger DEBIT atomically. Returns the new invoice id. HQ-only (enforced by
 * caller; re-checked here).
 */
export async function createInvoice(
  input: NewInvoice,
  user: SessionUser
): Promise<string> {
  if (!isHQ(user)) {
    throw new Error("Only HQ can create fee invoices.");
  }
  if (!(input.amount > 0)) {
    throw new Error("Invoice amount must be greater than zero.");
  }
  if (input.periodEnd < input.periodStart) {
    throw new Error("Period end cannot be before period start.");
  }

  const amount = round2(input.amount);

  return withTransaction(async (client) => {
    const rep = await client.query<{ id: string }>(
      `SELECT id FROM representatives WHERE id = $1`,
      [input.representativeId]
    );
    if (rep.rowCount === 0) {
      throw new Error("Selected representative was not found.");
    }

    const invRes = await client.query<{ id: string }>(
      `INSERT INTO fee_invoices
          (representative_id, fee_type, period_start, period_end, amount,
           due_date, status)
       VALUES ($1,$2,$3::date,$4::date,$5,$6::date,'pending')
       RETURNING id`,
      [
        input.representativeId,
        input.feeType,
        input.periodStart,
        input.periodEnd,
        amount,
        input.dueDate,
      ]
    );
    const invoiceId = invRes.rows[0]!.id;

    await postLedgerEntry(client, {
      representativeId: input.representativeId,
      transactionDate: input.periodStart,
      transactionType: "fee_charge",
      description: `${FEE_LABEL[input.feeType]} (${input.periodStart} – ${input.periodEnd})`,
      debit: amount,
      credit: 0,
      referenceType: "fee_invoice",
      referenceId: invoiceId,
    });

    await recordAudit(client, {
      userId: user.id,
      action: "create",
      tableName: "fee_invoices",
      recordId: invoiceId,
      newValue: {
        representative_id: input.representativeId,
        fee_type: input.feeType,
        amount,
      },
    });

    return invoiceId;
  });
}

// --------------------------------- Reads -------------------------------------

const INVOICE_SELECT = `
  SELECT fi.id,
         fi.representative_id,
         ru.full_name AS representative_name,
         rep.user_id  AS rep_user_id,
         rd.division_id AS rep_division_id,
         rd.id          AS rep_district_id,
         fi.fee_type,
         fi.period_start,
         fi.period_end,
         fi.amount,
         fi.due_date,
         fi.status,
         fi.paid_date,
         fi.payment_reference,
         fi.created_at,
         fi.updated_at,
         (fi.status = 'pending' AND fi.due_date < CURRENT_DATE) AS is_overdue
    FROM fee_invoices fi
    JOIN representatives rep ON rep.id = fi.representative_id
    JOIN users ru            ON ru.id = rep.user_id
    JOIN upazilas rup        ON rup.id = rep.upazila_id
    JOIN districts rd        ON rd.id = rup.district_id`;

export interface InvoiceListFilters {
  /** 'pending' | 'paid' | 'overdue' | 'waived'. 'overdue' is virtual. */
  status?: string | null;
  feeType?: string | null;
  search?: string | null;
  /** period_start month, 'YYYY-MM'. */
  period?: string | null;
}

/**
 * List fee invoices visible to `user`, optionally narrowed by filters.
 * Geographic scope is always enforced server-side (self / district / division /
 * all). The virtual "overdue" status filter matches pending invoices past due.
 */
export async function listInvoices(
  user: SessionUser,
  filters: InvoiceListFilters = {}
): Promise<FeeInvoiceListItem[]> {
  const scope = repScopeForUser(user);
  const conditions: string[] = [];
  const params: unknown[] = [];

  // --- enforce scope ---
  if (scope.selfOnly) {
    params.push(user.id);
    conditions.push(`rep.user_id = $${params.length}`);
  } else if (scope.divisionId) {
    params.push(scope.divisionId);
    conditions.push(`rd.division_id = $${params.length}`);
  } else if (scope.districtId) {
    params.push(scope.districtId);
    conditions.push(`rd.id = $${params.length}`);
  }

  // --- optional UI filters ---
  if (filters.status === "overdue") {
    conditions.push(`(fi.status = 'pending' AND fi.due_date < CURRENT_DATE)`);
  } else if (filters.status) {
    params.push(filters.status);
    conditions.push(`fi.status = $${params.length}`);
  }
  if (filters.feeType) {
    params.push(filters.feeType);
    conditions.push(`fi.fee_type = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`ru.full_name ILIKE $${params.length}`);
  }
  if (filters.period) {
    // period is 'YYYY-MM' -> match invoices whose period_start is in that month.
    params.push(`${filters.period}-01`);
    conditions.push(
      `date_trunc('month', fi.period_start) = date_trunc('month', $${params.length}::date)`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<FeeInvoiceListItem>(
    `${INVOICE_SELECT} ${where}
      ORDER BY fi.period_start DESC, fi.created_at DESC`,
    params
  );
}

/** All fee invoices for a specific representative, newest period first. */
export async function listInvoicesForRep(
  representativeId: string
): Promise<FeeInvoiceListItem[]> {
  return query<FeeInvoiceListItem>(
    `${INVOICE_SELECT}
      WHERE fi.representative_id = $1
      ORDER BY fi.period_start DESC, fi.created_at DESC`,
    [representativeId]
  );
}

const PAYMENT_SELECT = `
  SELECT pm.id,
         pm.representative_id,
         ru.full_name AS representative_name,
         rep.user_id  AS rep_user_id,
         rd.division_id AS rep_division_id,
         rd.id          AS rep_district_id,
         pm.payment_type,
         pm.amount,
         pm.payment_date,
         pm.payment_method,
         pm.reference_no,
         pm.related_invoice_id,
         pm.verified,
         pm.verified_by,
         vb.full_name AS verified_by_name,
         pm.verified_at,
         pm.notes,
         pm.created_at
    FROM payments pm
    JOIN representatives rep ON rep.id = pm.representative_id
    JOIN users ru            ON ru.id = rep.user_id
    JOIN upazilas rup        ON rup.id = rep.upazila_id
    JOIN districts rd        ON rd.id = rup.district_id
    LEFT JOIN users vb       ON vb.id = pm.verified_by`;

export interface PaymentListFilters {
  paymentType?: string | null;
  method?: string | null;
  verified?: string | null; // 'true' | 'false'
  search?: string | null;
}

/**
 * List payments visible to `user`, optionally narrowed by filters. Geographic
 * scope is always enforced server-side.
 */
export async function listPayments(
  user: SessionUser,
  filters: PaymentListFilters = {}
): Promise<PaymentListItem[]> {
  const scope = repScopeForUser(user);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (scope.selfOnly) {
    params.push(user.id);
    conditions.push(`rep.user_id = $${params.length}`);
  } else if (scope.divisionId) {
    params.push(scope.divisionId);
    conditions.push(`rd.division_id = $${params.length}`);
  } else if (scope.districtId) {
    params.push(scope.districtId);
    conditions.push(`rd.id = $${params.length}`);
  }

  if (filters.paymentType) {
    params.push(filters.paymentType);
    conditions.push(`pm.payment_type = $${params.length}`);
  }
  if (filters.method) {
    params.push(filters.method);
    conditions.push(`pm.payment_method = $${params.length}`);
  }
  if (filters.verified === "true") {
    conditions.push(`pm.verified = TRUE`);
  } else if (filters.verified === "false") {
    conditions.push(`pm.verified = FALSE`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`ru.full_name ILIKE $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<PaymentListItem>(
    `${PAYMENT_SELECT} ${where}
      ORDER BY pm.payment_date DESC, pm.created_at DESC`,
    params
  );
}

/** All payments for a specific representative, newest first. */
export async function listPaymentsForRep(
  representativeId: string
): Promise<PaymentListItem[]> {
  return query<PaymentListItem>(
    `${PAYMENT_SELECT}
      WHERE pm.representative_id = $1
      ORDER BY pm.payment_date DESC, pm.created_at DESC`,
    [representativeId]
  );
}

/** Fetch a single invoice by id (no scope check — caller enforces). */
export async function getInvoice(
  id: string
): Promise<FeeInvoiceListItem | null> {
  return queryOne<FeeInvoiceListItem>(
    `${INVOICE_SELECT} WHERE fi.id = $1`,
    [id]
  );
}

// ------------------------------ Record payment -------------------------------

export interface NewPayment {
  amount: number;
  paymentDate: string; // 'YYYY-MM-DD'
  paymentMethod: PaymentMethod;
  referenceNo: string;
  relatedInvoiceId?: string | null;
  paymentType: PaymentType;
  notes?: string | null;
}

/**
 * Record a payment made by a representative and post a ledger CREDIT — all in
 * one transaction. When relatedInvoiceId is provided and the payment covers the
 * invoice amount, the invoice is marked 'paid' (paid_date + payment_reference).
 * HQ-only (enforced by caller; re-checked here). Returns the new payment id.
 */
export async function recordPayment(
  representativeId: string,
  input: NewPayment,
  user: SessionUser
): Promise<string> {
  if (!isHQ(user)) {
    throw new Error("Only HQ can record payments.");
  }
  if (!(input.amount > 0)) {
    throw new Error("Payment amount must be greater than zero.");
  }
  if (!input.referenceNo || !input.referenceNo.trim()) {
    throw new Error("A payment reference is required.");
  }

  const amount = round2(input.amount);

  return withTransaction(async (client) => {
    const rep = await client.query<{ id: string }>(
      `SELECT id FROM representatives WHERE id = $1`,
      [representativeId]
    );
    if (rep.rowCount === 0) {
      throw new Error("Selected representative was not found.");
    }

    // If linked to an invoice, lock it and confirm it belongs to this rep.
    let invoiceDescription = "";
    if (input.relatedInvoiceId) {
      const inv = await client.query<{
        id: string;
        representative_id: string;
        amount: string;
        status: string;
        fee_type: FeeType;
      }>(
        `SELECT id, representative_id, amount, status, fee_type
           FROM fee_invoices
          WHERE id = $1
          FOR UPDATE`,
        [input.relatedInvoiceId]
      );
      if (inv.rowCount === 0) {
        throw new Error("The linked invoice was not found.");
      }
      const invoice = inv.rows[0]!;
      if (invoice.representative_id !== representativeId) {
        throw new Error("The linked invoice belongs to a different representative.");
      }
      invoiceDescription = ` for ${FEE_LABEL[invoice.fee_type]}`;

      // Mark paid when the payment covers the invoice and it isn't already paid.
      if (
        invoice.status !== "paid" &&
        invoice.status !== "waived" &&
        amount >= Number(invoice.amount)
      ) {
        await client.query(
          `UPDATE fee_invoices
              SET status = 'paid',
                  paid_date = $1::date,
                  payment_reference = $2,
                  updated_at = NOW()
            WHERE id = $3`,
          [input.paymentDate, input.referenceNo.trim(), invoice.id]
        );
      }
    }

    const payRes = await client.query<{ id: string }>(
      `INSERT INTO payments
          (representative_id, payment_type, amount, payment_date, payment_method,
           reference_no, related_invoice_id, notes)
       VALUES ($1,$2,$3,$4::date,$5,$6,$7,$8)
       RETURNING id`,
      [
        representativeId,
        input.paymentType,
        amount,
        input.paymentDate,
        input.paymentMethod,
        input.referenceNo.trim(),
        input.relatedInvoiceId ?? null,
        input.notes ?? null,
      ]
    );
    const paymentId = payRes.rows[0]!.id;

    await postLedgerEntry(client, {
      representativeId,
      transactionDate: input.paymentDate,
      transactionType: "fee_payment",
      description: `Payment received${invoiceDescription} (${input.paymentMethod.replace(/_/g, " ")}, ref ${input.referenceNo.trim()})`,
      debit: 0,
      credit: amount,
      referenceType: "payment",
      referenceId: paymentId,
    });

    await recordAudit(client, {
      userId: user.id,
      action: "create",
      tableName: "payments",
      recordId: paymentId,
      newValue: {
        representative_id: representativeId,
        amount,
        payment_method: input.paymentMethod,
        payment_type: input.paymentType,
        related_invoice_id: input.relatedInvoiceId ?? null,
      },
    });

    return paymentId;
  });
}

// ------------------------------ Verify payment -------------------------------

/**
 * HQ marks a payment as verified. Idempotent-ish: re-verifying an already
 * verified payment is a no-op error. HQ-only (enforced by caller; re-checked).
 */
export async function verifyPayment(
  paymentId: string,
  user: SessionUser
): Promise<void> {
  if (!isHQ(user)) {
    throw new Error("Only HQ can verify payments.");
  }
  const res = await query<{ id: string }>(
    `UPDATE payments
        SET verified = TRUE, verified_by = $1, verified_at = NOW()
      WHERE id = $2 AND verified = FALSE
      RETURNING id`,
    [user.id, paymentId]
  );
  if (res.length === 0) {
    throw new Error("Payment not found or already verified.");
  }

  await recordAudit(null, {
    userId: user.id,
    action: "verify",
    tableName: "payments",
    recordId: paymentId,
    oldValue: { verified: false },
    newValue: { verified: true, verified_by: user.id },
  });
}

// ------------------------- Optional: persist overdue -------------------------

/**
 * Flip pending invoices whose due_date has passed to 'overdue'. Overdue is
 * normally computed virtually in listings/badges; this is provided so HQ can
 * persist the status on demand. Returns the number of rows updated.
 */
export async function markOverdue(user: SessionUser): Promise<number> {
  if (!isHQ(user)) {
    throw new Error("Only HQ can update overdue invoices.");
  }
  const res = await query<{ id: string }>(
    `UPDATE fee_invoices
        SET status = 'overdue', updated_at = NOW()
      WHERE status = 'pending' AND due_date < CURRENT_DATE
      RETURNING id`
  );
  return res.length;
}

// ------------------------------ Rep summary ----------------------------------

export interface FeeSummary {
  invoice_count: number;
  pending_count: number;
  overdue_count: number;
  paid_count: number;
  total_invoiced: number;
  total_paid: number;
}

/** Aggregate fee/payment counters for a representative (for detail summaries). */
export async function getRepFeeSummary(
  representativeId: string
): Promise<FeeSummary> {
  const inv = await queryOne<{
    invoice_count: string;
    pending_count: string;
    overdue_count: string;
    paid_count: string;
    total_invoiced: string;
  }>(
    `SELECT COUNT(*)                                                   AS invoice_count,
            COUNT(*) FILTER (WHERE status = 'pending' AND due_date >= CURRENT_DATE) AS pending_count,
            COUNT(*) FILTER (WHERE status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE)) AS overdue_count,
            COUNT(*) FILTER (WHERE status = 'paid')                    AS paid_count,
            COALESCE(SUM(amount), 0)                                   AS total_invoiced
       FROM fee_invoices
      WHERE representative_id = $1`,
    [representativeId]
  );
  const pay = await queryOne<{ total_paid: string }>(
    `SELECT COALESCE(SUM(amount), 0) AS total_paid
       FROM payments
      WHERE representative_id = $1`,
    [representativeId]
  );

  return {
    invoice_count: Number(inv?.invoice_count ?? 0),
    pending_count: Number(inv?.pending_count ?? 0),
    overdue_count: Number(inv?.overdue_count ?? 0),
    paid_count: Number(inv?.paid_count ?? 0),
    total_invoiced: Number(inv?.total_invoiced ?? 0),
    total_paid: Number(pay?.total_paid ?? 0),
  };
}
