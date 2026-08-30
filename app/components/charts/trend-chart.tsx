// -----------------------------------------------------------------------------
// A dependency-free SVG line chart for one or two monthly series (e.g. project
// profit and order revenue). Server-renderable (no client JS). Draws a light
// grid, one polyline per series, and a compact legend. The X axis is the month
// labels; the Y axis is auto-scaled to the max across both series.
// -----------------------------------------------------------------------------

export interface TrendSeriesPoint {
  label: string;
  a: number; // series A value
  b: number; // series B value
}

export function TrendChart({
  points,
  seriesA = "Series A",
  seriesB = "Series B",
  format = (n) => n.toLocaleString("en-BD"),
}: {
  points: TrendSeriesPoint[];
  seriesA?: string;
  seriesB?: string;
  format?: (n: number) => string;
}) {
  if (points.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        No trend data to display.
      </p>
    );
  }

  // Viewbox geometry.
  const W = 720;
  const H = 240;
  const padX = 40;
  const padY = 20;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;

  const max = Math.max(1, ...points.map((p) => Math.max(p.a, p.b)));
  const n = points.length;
  const stepX = n > 1 ? plotW / (n - 1) : 0;

  const x = (i: number) => padX + i * stepX;
  const y = (v: number) => padY + plotH - (v / max) * plotH;

  const lineFor = (key: "a" | "b") =>
    points.map((p, i) => `${x(i)},${y(p[key])}`).join(" ");

  // Horizontal grid lines at 0/25/50/75/100%.
  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-brand-500" />
          {seriesA}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />
          {seriesB}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Monthly trend of ${seriesA} and ${seriesB}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* grid */}
        {grid.map((g) => {
          const gy = padY + plotH - g * plotH;
          return (
            <line
              key={g}
              x1={padX}
              x2={W - padX}
              y1={gy}
              y2={gy}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}

        {/* series A */}
        <polyline
          points={lineFor("a")}
          fill="none"
          stroke="#4f7cff"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* series B */}
        <polyline
          points={lineFor("b")}
          fill="none"
          stroke="#10b981"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* points */}
        {points.map((p, i) => (
          <g key={`pt-${i}`}>
            <circle cx={x(i)} cy={y(p.a)} r={2.5} fill="#4f7cff" />
            <circle cx={x(i)} cy={y(p.b)} r={2.5} fill="#10b981" />
          </g>
        ))}

        {/* x labels (show every other label when crowded) */}
        {points.map((p, i) => {
          const show = n <= 8 || i % 2 === 0 || i === n - 1;
          if (!show) return null;
          return (
            <text
              key={`lbl-${i}`}
              x={x(i)}
              y={H - 4}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize={10}
            >
              {p.label}
            </text>
          );
        })}
      </svg>

      {/* Peak hint for accessibility / quick read */}
      <p className="mt-2 text-right text-xs text-slate-400">
        Peak: {format(max)}
      </p>
    </div>
  );
}
