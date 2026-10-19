"use client";

/**
 * Hand-rolled SVG charts for the insights pages.
 * Marks follow the data-viz spec: bars ≤ 24px with 4px rounded data-end and a 2px surface gap
 * between stacked segments, 2px lines, recessive 1px grid, legend for multi-series charts,
 * hover/focus tooltips and a table view. Series colours come from validated CSS variables.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormat, useT } from "@/i18n/client";
import { chartDict } from "@/i18n/ui/insights";
import { cn } from "@/lib/cn";
import { Segmented } from "../ui/tabs";

const S1 = "var(--color-series-1)";
const S2 = "var(--color-series-2)";
const GRID = "var(--color-grid)";
const AXIS = "#c3c7d0";
const MUTED = "#7b8190";
const SURFACE = "#ffffff";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Rect with rounded top corners (data-end) and a square base. */
function topRoundedRect(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0 || w <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function ViewToggle({ value, onChange }: { value: "chart" | "table"; onChange: (v: "chart" | "table") => void }) {
  const t = useT(chartDict);
  return (
    <Segmented
      size="xs"
      value={value}
      onChange={onChange}
      options={[
        { value: "chart", label: t.chart },
        { value: "table", label: t.table },
      ]}
    />
  );
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  // Keep the tooltip inside the chart area.
  const left = Math.min(Math.max(x, 80), Math.max(80, width - 80));
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-white px-3 py-2 text-xs whitespace-nowrap shadow-[var(--shadow-pop)] ring-1 ring-slate-200"
      style={{ left, top: Math.max(y - 8, 4) }}
      role="status"
    >
      {children}
    </div>
  );
}

function TooltipRow({ color, label, value, dashed }: { color?: string; label: string; value: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {color ? (
        <svg width="12" height="4" aria-hidden>
          <line x1="0" y1="2" x2="12" y2="2" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={dashed ? "3 2" : undefined} />
        </svg>
      ) : (
        <span className="w-3" />
      )}
      <span className="tabular font-semibold text-slate-900">{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

/* ---------- Weekly stacked bars ---------- */

export interface WeekDatum {
  key: string;
  label: string;
  automated: number;
  reviewed: number;
  synthetic: boolean;
}

export function WeeklyStackedChart({ data, height = 220 }: { data: WeekDatum[]; height?: number }) {
  const t = useT(chartDict);
  const f = useFormat();
  const { ref, width } = useWidth<HTMLDivElement>();
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);

  const margin = { top: 12, right: 8, bottom: 26, left: 40 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;
  const max = Math.max(1, ...data.map((d) => d.automated + d.reviewed));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.min(24, band * 0.56);
  const y = (v: number) => margin.top + innerH - (v / top) * innerH;
  const showEvery = band > 0 ? Math.max(1, Math.ceil(46 / band)) : 1;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legende">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: S1 }} />
            {t.automated}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: S2 }} />
            {t.reviewed}
          </li>
          <li className="flex items-center gap-1.5 text-slate-500">
            <span className="size-2.5 rounded-[3px] bg-slate-400 opacity-45" />
            {t.syntheticLegend}
          </li>
        </ul>
        <ViewToggle value={view} onChange={setView} />
      </div>
      {view === "table" ? (
        <DataTable
          head={[t.week, t.automated, t.reviewed, t.total, t.autoRate]}
          rows={data.map((d) => {
            const total = d.automated + d.reviewed;
            return [`${d.label}${d.synthetic ? ` (${t.synthetic})` : ` (${t.measured})`}`, f.number(d.automated), f.number(d.reviewed), f.number(total), total ? f.percent(d.automated / total) : "—"];
          })}
        />
      ) : (
        <div ref={ref} className="relative w-full" style={{ height }} onPointerLeave={() => setActive(null)}>
          {width > 0 && (
            <svg width={width} height={height} role="img" aria-label={`${t.automated} / ${t.reviewed}`} className="overflow-visible">
              {ticks.map((tk) => (
                <g key={tk}>
                  <line x1={margin.left} x2={width - margin.right} y1={y(tk)} y2={y(tk)} stroke={tk === 0 ? AXIS : GRID} strokeWidth={1} shapeRendering="crispEdges" />
                  <text x={margin.left - 8} y={y(tk)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED} className="tabular">
                    {f.number(tk)}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const cx = margin.left + band * i + band / 2;
                const x = cx - barW / 2;
                const base = y(0);
                const hA = base - y(d.automated);
                const hR = base - y(d.reviewed);
                const gap = d.automated > 0 && d.reviewed > 0 ? 2 : 0;
                const opacity = d.synthetic ? 0.45 : 1;
                const lifted = active === i;
                const total = d.automated + d.reviewed;
                return (
                  <g
                    key={d.key}
                    tabIndex={0}
                    role="img"
                    aria-label={`${d.label}: ${t.automated} ${d.automated}, ${t.reviewed} ${d.reviewed}`}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="outline-none"
                  >
                    <rect x={margin.left + band * i} y={margin.top} width={band} height={innerH} fill="transparent" />
                    {lifted && <rect x={margin.left + band * i + 2} y={margin.top} width={band - 4} height={innerH} fill="#f1f3f7" rx={4} />}
                    {d.reviewed > 0 || d.automated > 0 ? (
                      <>
                        {d.automated > 0 && (
                          <path
                            d={d.reviewed > 0 ? `M${x},${base}V${base - hA}H${x + barW}V${base}Z` : topRoundedRect(x, base - hA, barW, hA)}
                            fill={S1}
                            opacity={opacity}
                          />
                        )}
                        {d.reviewed > 0 && <path d={topRoundedRect(x, base - hA - hR, barW, Math.max(0, hR - gap))} fill={S2} opacity={opacity} />}
                      </>
                    ) : null}
                    {!d.synthetic && total > 0 && (
                      <text x={cx} y={y(total) - 6} textAnchor="middle" fontSize={11} fill="#334155" fontWeight={600} className="tabular">
                        {f.number(total)}
                      </text>
                    )}
                    {i % showEvery === (data.length - 1) % showEvery && (
                      <text x={cx} y={height - 8} textAnchor="middle" fontSize={11} fill={d.synthetic ? MUTED : "#334155"} fontWeight={d.synthetic ? 400 : 600}>
                        {d.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
          {active != null && data[active] && (
            <Tooltip x={margin.left + band * active + band / 2} y={y(data[active].automated + data[active].reviewed)} width={width}>
              <p className="mb-1 font-medium text-slate-700">
                {data[active].label} · {data[active].synthetic ? t.synthetic : t.measured}
              </p>
              <TooltipRow color={S1} label={t.automated} value={f.number(data[active].automated)} />
              <TooltipRow color={S2} label={t.reviewed} value={f.number(data[active].reviewed)} />
              <TooltipRow
                label={t.autoRate}
                value={data[active].automated + data[active].reviewed > 0 ? f.percent(data[active].automated / (data[active].automated + data[active].reviewed)) : "—"}
              />
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Line chart (single series) ---------- */

export interface LineDatum {
  key: string;
  label: string;
  value: number;
  synthetic: boolean;
}

export function LineChart({
  data,
  height = 200,
  valueLabel,
  format,
  note,
}: {
  data: LineDatum[];
  height?: number;
  valueLabel: string;
  format: (v: number) => string;
  note?: string;
}) {
  const t = useT(chartDict);
  const f = useFormat();
  const { ref, width } = useWidth<HTMLDivElement>();
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);
  const margin = { top: 14, right: 16, bottom: 26, left: 40 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;
  const ticks = niceTicks(Math.max(1, ...data.map((d) => d.value)));
  const top = ticks[ticks.length - 1];
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xAt = (i: number) => margin.left + (data.length > 1 ? step * i : innerW / 2);
  const yAt = (v: number) => margin.top + innerH - (v / top) * innerH;
  const showEvery = step > 0 ? Math.max(1, Math.ceil(50 / step)) : 1;

  const { solid, tail, area } = useMemo(() => {
    const pts = data.map((d, i) => [xAt(i), yAt(d.value)] as const);
    const lastSynthetic = data.map((d) => d.synthetic).lastIndexOf(true);
    const solidPts = lastSynthetic >= 0 ? pts.slice(0, lastSynthetic + 1) : pts;
    const tailPts = lastSynthetic >= 0 && lastSynthetic < pts.length - 1 ? pts.slice(lastSynthetic) : [];
    const toPath = (p: readonly (readonly [number, number])[]) => p.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join("");
    const areaPath = pts.length ? `${toPath(pts)}L${pts[pts.length - 1][0]},${yAt(0)}L${pts[0][0]},${yAt(0)}Z` : "";
    return { solid: toPath(solidPts), tail: toPath(tailPts), area: areaPath };
  }, [data, width, top]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = data.length > 1 ? Math.round((px - margin.left) / step) : 0;
    setActive(Math.max(0, Math.min(data.length - 1, idx)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
    if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1));
  };
  const last = data.length - 1;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <ViewToggle value={view} onChange={setView} />
      </div>
      {view === "table" ? (
        <DataTable head={[t.week, valueLabel]} rows={data.map((d) => [`${d.label}${d.synthetic ? ` (${t.synthetic})` : ` (${t.measured})`}`, format(d.value)])} />
      ) : (
        <div ref={ref} className="relative w-full" style={{ height }}>
          {width > 0 && data.length > 0 && (
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={valueLabel}
              tabIndex={0}
              onPointerMove={onMove}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(last)}
              onBlur={() => setActive(null)}
              onKeyDown={onKey}
              className="overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {ticks.map((tk) => (
                <g key={tk}>
                  <line x1={margin.left} x2={width - margin.right} y1={yAt(tk)} y2={yAt(tk)} stroke={tk === 0 ? AXIS : GRID} strokeWidth={1} shapeRendering="crispEdges" />
                  <text x={margin.left - 8} y={yAt(tk)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED} className="tabular">
                    {f.number(tk)}
                  </text>
                </g>
              ))}
              <path d={area} fill={S1} opacity={0.08} />
              <path d={solid} fill="none" stroke={S1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {tail && <path d={tail} fill="none" stroke={S1} strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" />}
              {active != null && <line x1={xAt(active)} x2={xAt(active)} y1={margin.top} y2={yAt(0)} stroke="#94a3b8" strokeWidth={1} shapeRendering="crispEdges" />}
              {active != null && <circle cx={xAt(active)} cy={yAt(data[active].value)} r={4.5} fill={S1} stroke={SURFACE} strokeWidth={2} />}
              <circle cx={xAt(last)} cy={yAt(data[last].value)} r={4.5} fill={S1} stroke={SURFACE} strokeWidth={2} />
              <text x={xAt(last)} y={yAt(data[last].value) - 10} textAnchor="end" fontSize={11} fontWeight={600} fill="#334155" className="tabular">
                {format(data[last].value)}
              </text>
              {data.map((d, i) =>
                i % showEvery === last % showEvery ? (
                  <text key={d.key} x={xAt(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={d.synthetic ? MUTED : "#334155"} fontWeight={d.synthetic ? 400 : 600}>
                    {d.label}
                  </text>
                ) : null,
              )}
            </svg>
          )}
          {active != null && data[active] && (
            <Tooltip x={xAt(active)} y={yAt(data[active].value)} width={width}>
              <p className="mb-1 font-medium text-slate-700">
                {data[active].label} · {data[active].synthetic ? t.synthetic : t.measured}
              </p>
              <TooltipRow color={S1} label={valueLabel} value={format(data[active].value)} dashed={!data[active].synthetic} />
            </Tooltip>
          )}
        </div>
      )}
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

/* ---------- Horizontal stacked breakdown ---------- */

export interface BreakdownRow {
  key: string;
  label: string;
  auto: number;
  total: number;
  caption: string;
}

export function BreakdownBars({ rows }: { rows: BreakdownRow[] }) {
  const t = useT(chartDict);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legende">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: S1 }} />
          {t.automated}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: S2 }} />
          {t.reviewed}
        </li>
      </ul>
      <ul className="space-y-3">
        {rows.map((r) => {
          const human = r.total - r.auto;
          return (
            <li key={r.key} className="group">
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-medium text-slate-700">{r.label}</span>
                <span className="tabular text-xs text-slate-500">{r.caption}</span>
              </div>
              <div className="flex h-3 w-full items-stretch" role="img" aria-label={`${r.label}: ${t.automated} ${r.auto}, ${t.reviewed} ${human}`}>
                <div className="flex h-full" style={{ width: `${(r.total / max) * 100}%` }}>
                  {r.auto > 0 && <div className={cn("h-full", human === 0 ? "rounded-r-[4px]" : "")} style={{ width: `${(r.auto / r.total) * 100}%`, background: S1 }} />}
                  {r.auto > 0 && human > 0 && <div className="h-full w-[2px] shrink-0 bg-white" />}
                  {human > 0 && <div className="h-full rounded-r-[4px]" style={{ width: `${(human / r.total) * 100}%`, background: S2 }} />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Table view ---------- */

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            {head.map((h, i) => (
              <th key={h} className={cn("py-2 pr-3 font-medium", i > 0 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-slate-50 last:border-0">
              {r.map((c, ci) => (
                <td key={ci} className={cn("py-1.5 pr-3", ci > 0 ? "tabular text-right text-slate-900" : "text-slate-700")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
