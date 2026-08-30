"use client";

import { useMemo, useState } from "react";

// -----------------------------------------------------------------------------
// Reusable line-item editor for both order flows. Lets the user add product
// rows (product select + quantity + unit price), shows a running total, and
// serializes the rows into a hidden `items` field as JSON for the server
// action. `priceOf` picks the sensible default unit price for the flow
// (wholesale for restock, retail for sales).
// -----------------------------------------------------------------------------

export interface EditorProduct {
  id: string;
  name: string;
  sku: string;
  cost_price: string;
  retail_price: string;
  wholesale_price: string | null;
}

interface Line {
  key: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

function money(n: number): string {
  return "৳" + n.toLocaleString("en-BD");
}

let counter = 0;
function nextKey(): string {
  counter += 1;
  return `line-${counter}`;
}

export function LineItemEditor({
  products,
  defaultPrice,
  discountable = false,
}: {
  products: EditorProduct[];
  /** Which product price to prefill when a product is chosen. */
  defaultPrice: "wholesale" | "retail" | "cost";
  /** Show a discount input and factor it into the net total (customer sales). */
  discountable?: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);

  const productById = useMemo(() => {
    const map = new Map<string, EditorProduct>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  function priceFor(p: EditorProduct): number {
    if (defaultPrice === "retail") return Number(p.retail_price);
    if (defaultPrice === "cost") return Number(p.cost_price);
    // wholesale, falling back to cost when no wholesale price is set.
    return p.wholesale_price != null
      ? Number(p.wholesale_price)
      : Number(p.cost_price);
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: nextKey(), product_id: "", quantity: 1, unit_price: 0 },
    ]);
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    );
  }

  function onProductChange(key: string, productId: string) {
    const p = productById.get(productId);
    updateLine(key, {
      product_id: productId,
      unit_price: p ? priceFor(p) : 0,
    });
  }

  const total = lines.reduce(
    (sum, l) => sum + (l.quantity || 0) * (l.unit_price || 0),
    0
  );
  const safeDiscount = discountable ? Math.min(Math.max(discount, 0), total) : 0;
  const net = total - safeDiscount;

  // Only rows with a chosen product + positive quantity are submitted.
  const payload = lines
    .filter((l) => l.product_id && l.quantity > 0)
    .map((l) => ({
      product_id: l.product_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
    }));

  return (
    <div className="space-y-3">
      <input type="hidden" name="items" value={JSON.stringify(payload)} />
      {discountable ? (
        <input type="hidden" name="discount" value={safeDiscount} />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Unit price</th>
              <th className="px-3 py-2 font-medium">Subtotal</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  No line items yet. Add a product to begin.
                </td>
              </tr>
            ) : (
              lines.map((l) => {
                const subtotal = (l.quantity || 0) * (l.unit_price || 0);
                return (
                  <tr key={l.key}>
                    <td className="px-3 py-2">
                      <select
                        value={l.product_id}
                        onChange={(e) => onProductChange(l.key, e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(l.key, {
                            quantity: Math.max(
                              1,
                              Math.floor(Number(e.target.value) || 0)
                            ),
                          })
                        }
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={l.unit_price}
                        onChange={(e) =>
                          updateLine(l.key, {
                            unit_price: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {money(subtotal)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addLine}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        + Add line item
      </button>

      {/* Totals */}
      <div className="ml-auto max-w-xs space-y-1 pt-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Total</span>
          <span className="font-medium text-slate-800">{money(total)}</span>
        </div>
        {discountable ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Discount</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(e) =>
                  setDiscount(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm"
              />
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <span className="font-semibold text-slate-700">Net</span>
              <span className="font-bold text-slate-900">{money(net)}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
