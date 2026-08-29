"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { adjustStockAction, type ActionState } from "../actions";

// -----------------------------------------------------------------------------
// Records a manual central-warehouse stock movement (stock_in / return /
// adjustment). For `adjustment`, an extra direction selector appears so HQ can
// correct the count up or down. The server action re-checks authorization and
// guards against negative results.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Recording…" : "Record movement"}
    </button>
  );
}

export function StockPanel({ productId }: { productId: string }) {
  const [state, formAction] = useFormState(adjustStockAction, initialState);
  const [movementType, setMovementType] = useState<
    "stock_in" | "return" | "adjustment"
  >("stock_in");

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm font-medium text-slate-700">Record a stock movement</p>
      <input type="hidden" name="product_id" value={productId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Movement type
          </span>
          <select
            name="movement_type"
            value={movementType}
            onChange={(e) =>
              setMovementType(
                e.target.value as "stock_in" | "return" | "adjustment"
              )
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="stock_in">Stock in (add)</option>
            <option value="return">Return (add back)</option>
            <option value="adjustment">Adjustment (correct)</option>
          </select>
        </label>

        {movementType === "adjustment" ? (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Direction
            </span>
            <select
              name="adjust_direction"
              defaultValue="increase"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="increase">Increase (+)</option>
              <option value="decrease">Decrease (−)</option>
            </select>
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Quantity
          </span>
          <input
            name="quantity"
            type="number"
            step="1"
            min="1"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Reference no.
          </span>
          <input
            name="reference_no"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Notes
          </span>
          <input
            name="notes"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700">{state.success}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
