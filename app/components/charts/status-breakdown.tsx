// -----------------------------------------------------------------------------
// A dependency-free status breakdown: a single stacked horizontal bar plus a
// legend with counts. Server-renderable (no client JS). Colors cycle through a
// fixed palette keyed by index so the same status always reads consistently
// within a chart.
// -----------------------------------------------------------------------------

export interface StatusSlice {
  status: string;
  count: number;
}

const PALETTE = [
  "bg-brand-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-slate-400",
];

function label(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBreakdown({
  data,
  emptyText = "No data to display.",
}: {
  data: StatusSlice[];
  emptyText?: string;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {data.map((d, i) => {
          const pct = (d.count / total) * 100;
          return (
            <div
              key={d.status}
              className={PALETTE[i % PALETTE.length]}
              style={{ width: `${pct}%` }}
              title={`${label(d.status)}: ${d.count}`}
            />
          );
        })}
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        {data.map((d, i) => (
          <li key={d.status} className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${
                PALETTE[i % PALETTE.length]
              }`}
            />
            <span className="text-slate-600">{label(d.status)}</span>
            <span className="ml-auto font-medium text-slate-800">
              {d.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
