import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  getGeoRollup,
  getTopRepresentatives,
  reportScopeLabel,
} from "@/lib/reports";

// -----------------------------------------------------------------------------
// CSV export for the reports. Route Handler, streamed as text/csv. Scope is
// enforced by resolving the session user server-side and delegating to the
// SAME scope-aware report functions the pages use — an unauthorized viewer can
// never widen their export beyond what they can see on screen.
//
//   /reports/export?type=rollup     -> the geo roll-up for the viewer's level
//   /reports/export?type=top-reps   -> ranked representatives within scope
// -----------------------------------------------------------------------------

export const dynamic = "force-dynamic";

/** Quote a CSV field (wrap in quotes, escape embedded quotes). */
function csvField(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((r) => r.map(csvField).join(",")).join("\r\n");
}

function csvResponse(filename: string, body: string): NextResponse {
  // Prefix with a UTF-8 BOM so Excel renders ৳ and Bangla text correctly.
  return new NextResponse("\uFEFF" + body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "rollup";
  const stamp = new Date().toISOString().slice(0, 10);
  const scope = reportScopeLabel(user).toLowerCase();

  if (type === "top-reps") {
    const reps = await getTopRepresentatives(user, 50);
    const rows: (string | number | null)[][] = [
      ["Rank", "Representative", "Upazila", "District", "Project profit", "Sales revenue"],
      ...reps.map((r, i) => [
        i + 1,
        r.full_name,
        r.upazila_name,
        r.district_name,
        r.project_profit,
        r.order_revenue,
      ]),
    ];
    return csvResponse(`top-representatives-${scope}-${stamp}.csv`, toCsv(rows));
  }

  // Default: geo roll-up.
  const rollup = await getGeoRollup(user);
  const rows: (string | number | null)[][] = [
    [rollup.unit, "Representatives", "Project profit", "Sales revenue", "Outstanding fees"],
    ...rollup.rows.map((r) => [
      r.name,
      r.rep_count,
      r.project_profit,
      r.order_revenue,
      r.outstanding_fees,
    ]),
  ];
  return csvResponse(`rollup-${rollup.level}-${scope}-${stamp}.csv`, toCsv(rows));
}
