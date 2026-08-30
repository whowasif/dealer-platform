"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { getRepresentativeIdByUser } from "@/lib/representatives";
import {
  createCustomer,
  updateCustomer,
  getCustomer,
  canAccessCustomer,
  type CustomerInput,
} from "@/lib/customers";

// -----------------------------------------------------------------------------
// Server actions for customers. A customer always belongs to the representative
// creating it. Only users with a representative record may create customers;
// edits are guarded by canAccessCustomer (scope). Every action re-checks auth.
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

const customerSchema = z.object({
  customer_id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Customer name is required"),
  phone: optionalText,
  email: optionalText,
  address: optionalText,
  type: z.enum(["retail", "institutional", "government"]),
  organization_name: optionalText,
  upazila_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  notes: optionalText,
});

function readForm(formData: FormData) {
  return customerSchema.safeParse({
    customer_id: formData.get("customer_id") || undefined,
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    type: formData.get("type"),
    organization_name: formData.get("organization_name"),
    upazila_id: formData.get("upazila_id"),
    notes: formData.get("notes"),
  });
}

export async function createCustomerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const repId = await getRepresentativeIdByUser(actor.id);
  if (!repId) {
    return { error: "Only representatives can create customers." };
  }

  const parsed = readForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const input: CustomerInput = {
    representative_id: repId,
    name: d.name,
    phone: d.phone ?? null,
    email: d.email ?? null,
    address: d.address ?? null,
    type: d.type,
    organization_name: d.organization_name ?? null,
    upazila_id: d.upazila_id ?? null,
    notes: d.notes ?? null,
  };

  let newId: string;
  try {
    newId = await createCustomer(input);
  } catch {
    return { error: "Could not create customer. Please try again." };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${newId}`);
  return { success: "Customer created." };
}

export async function updateCustomerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getSessionUser();
  if (!actor) return { error: "Not authenticated." };

  const id = String(formData.get("customer_id") ?? "");
  if (!id) return { error: "Missing customer id." };

  const existing = await getCustomer(id);
  if (!existing) return { error: "Customer not found." };
  if (!canAccessCustomer(actor, existing)) {
    return { error: "You are not authorized to edit this customer." };
  }

  const parsed = readForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  try {
    await updateCustomer(id, {
      name: d.name,
      phone: d.phone ?? null,
      email: d.email ?? null,
      address: d.address ?? null,
      type: d.type,
      organization_name: d.organization_name ?? null,
      upazila_id: d.upazila_id ?? null,
      notes: d.notes ?? null,
    });
  } catch {
    return { error: "Could not update customer. Please try again." };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { success: "Customer updated." };
}
