// -----------------------------------------------------------------------------
// A dependency-free horizontal bar chart rendered with plain divs + Tailwind.
// Server-renderable (no client JS). Each bar's width is proportional to the max
// value in the series. Values are formatted by the optional `format` callback.
// -----------------------------------------------------------------------------

export interface BarDatum {
  label: string;
  value: number;
  /** Optional sublabel shown under the main label (e.g. district name). */
  sublabel?: string;
}

export function BarChart({
  data,
  format = (n) => n.toLocaleString("en-BD"),
  barClass = "bg-brand-500",
  emptyText = "No data to display.",
}: {
  data: BarDatum[];
  format?: (n: number) => string;
  barClass?: string;
  emptyText?: string;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className="space-y-3">
      {data.map((d, i) => {
        const pct = Math.max(2, Math.round((d.value / max) * 100));
        return (
          <li key={`${d.label}-${i}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">
                {d.label}
                {d.sublabel ? (
                  <span className="ml-1 text-xs text-slate-400">
                    {d.sublabel}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-medium text-slate-800">
                {format(d.value)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${barClass}`}
                style={{ width: `${pct}%` }}
                role="img"
                aria-label={`${d.label}: ${format(d.value)}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
