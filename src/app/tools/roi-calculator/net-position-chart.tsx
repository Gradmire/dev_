import type { MonthlyPoint } from "@/lib/roi-calculator";

/**
 * Hand-rolled inline SVG rather than a chart library — see CLAUDE session
 * notes: no new runtime dependency for one line chart. Colors are brand
 * hues (navy/green/amber) stepped to clear the categorical-palette gates
 * (lightness band, chroma floor, CVD separation) at the brand's own
 * lightness rather than the site's UI shades of those same hues, which are
 * too dark/desaturated to pass as chart marks. Validated with the dataviz
 * skill's palette checker; the amber (downside) sits below 3:1 contrast by
 * design, which is why every line also gets a direct end-label in text ink,
 * never in the series color.
 */

const SERIES = [
  { key: "stayPutINR", label: "Stay put", color: "#2075b6" },
  { key: "optimisticINR", label: "Study abroad — job secured", color: "#2c9676" },
  { key: "downsideINR", label: "Study abroad — no qualifying job in time", color: "#dc8f09" },
] as const;

const WIDTH = 640;
const HEIGHT = 340;
const MARGIN = { top: 16, right: 88, bottom: 28, left: 16 };

function niceStep(rawStep: number): number {
  if (rawStep <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function NetPositionChart({
  series,
  formatValue,
}: {
  series: MonthlyPoint[];
  formatValue: (n: number) => string;
}) {
  const months = series.map((p) => p.month);
  const maxMonth = Math.max(...months);
  const values = series.flatMap((p) => [p.optimisticINR, p.downsideINR, p.stayPutINR]);
  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  const pad = (rawMax - rawMin) * 0.1 || Math.abs(rawMax) * 0.1 || 1;
  const yMax = rawMax + pad;
  const yMin = rawMin - pad;

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = (month: number) => MARGIN.left + (month / maxMonth) * plotW;
  const y = (value: number) => MARGIN.top + plotH - ((value - yMin) / (yMax - yMin)) * plotH;

  const gridStep = niceStep((yMax - yMin) / 4);
  const gridLines: number[] = [];
  for (let v = Math.ceil(yMin / gridStep) * gridStep; v <= yMax; v += gridStep) {
    gridLines.push(v);
  }

  const yearTicks = Array.from({ length: Math.floor(maxMonth / 24) + 1 }, (_, i) => i * 24).filter(
    (m) => m <= maxMonth,
  );

  const summary = SERIES.map((s) => `${s.label}: ${formatValue(series[series.length - 1][s.key])} after ${Math.round(maxMonth / 12)} years`).join("; ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Cumulative net position over ${Math.round(maxMonth / 12)} years. ${summary}. Exact figures are in the table above.`}
        className="w-full"
      >
        {/* Gridlines */}
        {gridLines.map((v) => (
          <line
            key={v}
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={y(v)}
            y2={y(v)}
            stroke="#e1e0d9"
            strokeWidth={1}
          />
        ))}

        {/* Zero baseline, drawn heavier than the gridlines */}
        {yMin < 0 && yMax > 0 && (
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={y(0)}
            y2={y(0)}
            stroke="#c3c2b7"
            strokeWidth={1.5}
          />
        )}

        {/* Y-axis value labels */}
        {gridLines.map((v) => (
          <text key={v} x={MARGIN.left} y={y(v) - 4} fontSize={10} fill="#898781">
            {formatValue(v)}
          </text>
        ))}

        {/* X-axis year labels */}
        {yearTicks.map((m) => (
          <text
            key={m}
            x={x(m)}
            y={HEIGHT - 8}
            fontSize={10}
            fill="#898781"
            textAnchor={m === 0 ? "start" : m === maxMonth ? "end" : "middle"}
          >
            Yr {m / 12}
          </text>
        ))}

        {/* Series lines */}
        {SERIES.map((s) => {
          const path = series
            .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.month)} ${y(p[s.key])}`)
            .join(" ");
          const last = series[series.length - 1];
          return (
            <g key={s.key}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={x(last.month)} cy={y(last[s.key])} r={5} fill={s.color} stroke="#fcfcfb" strokeWidth={2} />
              <text
                x={x(last.month) + 8}
                y={y(last[s.key])}
                fontSize={11}
                fontWeight={600}
                fill="#0b0b0b"
                dominantBaseline="middle"
              >
                {formatValue(last[s.key])}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend — identity never rests on color alone */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-mini text-ink-soft">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
