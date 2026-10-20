"use client";

import { AlertTriangle, Calculator, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateRoi, DEFAULT_ROI_INPUT, ROI_LIMITS, type RoiInput } from "@/domain/roi";
import { fmt } from "@/i18n/core";
import { useFormat, useT } from "@/i18n/client";
import { roiCalcDict } from "@/i18n/ui/roi-calculator";
import { cn } from "@/lib/cn";
import { Button } from "../ui/button";
import { Card, CardHeader } from "../ui/card";
import { Callout } from "../ui/feedback";

type NumericKey = Exclude<keyof RoiInput, "confirmedMonthlySavings">;

interface FieldDef {
  key: NumericKey;
  label: string;
  hint?: string;
  unit: string;
  step: number;
  percent?: boolean;
  sliderMax: number;
}

/**
 * Interactive ROI calculator. Used on the public website (before purchase) and inside the app
 * (prefilled with workspace assumptions). All formulas live in `src/domain/roi.ts`.
 */
export function RoiCalculator({ initial, compact, onChange }: { initial?: Partial<RoiInput>; compact?: boolean; onChange?: (input: RoiInput) => void }) {
  const t = useT(roiCalcDict);
  const f = useFormat();
  const start = { ...DEFAULT_ROI_INPUT, ...initial };
  const [input, setInput] = useState<RoiInput>(start);
  const result = useMemo(() => calculateRoi(input), [input]);

  const fields: FieldDef[] = [
    { key: "documentsPerMonth", label: t.documentsPerMonth, hint: t.documentsHint, unit: "", step: 50, sliderMax: 10000 },
    { key: "manualMinutesPerDocument", label: t.manualMinutes, hint: t.manualHint, unit: t.minutes, step: 0.5, sliderMax: 30 },
    { key: "hourlyRate", label: t.hourlyRate, hint: t.hourlyHint, unit: t.perHour, step: 1, sliderMax: 120 },
    { key: "automationRate", label: t.automationRate, hint: t.automationHint, unit: "%", step: 0.05, percent: true, sliderMax: 1 },
    { key: "reviewMinutesPerAutomatedDocument", label: t.reviewMinutes, hint: t.reviewHint, unit: t.minutes, step: 0.5, sliderMax: 15 },
    { key: "implementationCost", label: t.implementationCost, unit: "€", step: 500, sliderMax: 30000 },
    { key: "platformMonthlyCost", label: t.platformCost, unit: t.perMonth, step: 50, sliderMax: 4000 },
  ];

  const update = (key: NumericKey, raw: number) => {
    const limits = ROI_LIMITS[key];
    const value = Math.min(limits.max, Math.max(limits.min, Number.isFinite(raw) ? raw : 0));
    const next = { ...input, [key]: value };
    setInput(next);
    onChange?.(next);
  };

  return (
    <div className={cn("grid gap-4", !compact && "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]")}>
      <Card as="div">
        <CardHeader
          title={t.inputs}
          icon={<Calculator className="size-4" />}
          actions={
            <Button size="xs" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={() => setInput(start)}>
              {t.reset}
            </Button>
          }
        />
        <div className="space-y-4 px-4 py-4 sm:px-5">
          {fields.map((fd) => {
            const value = input[fd.key];
            const shown = fd.percent ? Math.round(value * 100) : value;
            const id = `roi-${fd.key}`;
            return (
              <div key={fd.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor={id} className="text-[13px] font-medium text-slate-700">
                    {fd.label}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id={id}
                      type="number"
                      inputMode="decimal"
                      value={shown}
                      min={0}
                      step={fd.percent ? 5 : fd.step}
                      onChange={(e) => update(fd.key, fd.percent ? Number(e.target.value) / 100 : Number(e.target.value))}
                      className="tabular h-8 w-24 rounded-md border-0 px-2 text-right text-sm font-medium shadow-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <span className="w-14 text-xs text-slate-500">{fd.unit}</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label={fd.label}
                  min={0}
                  max={fd.sliderMax}
                  step={fd.step}
                  value={Math.min(value, fd.sliderMax)}
                  onChange={(e) => update(fd.key, Number(e.target.value))}
                  className="mt-1.5 w-full accent-navy-800"
                />
                {fd.hint && <p className="text-xs text-slate-500">{fd.hint}</p>}
              </div>
            );
          })}
          <p className="text-xs text-slate-500">{t.defaultsNote}</p>
        </div>
      </Card>

      <div className="space-y-4">
        <Card as="div">
          <CardHeader title={t.results} />
          <div className="grid gap-px overflow-hidden bg-slate-100 sm:grid-cols-3">
            <Metric label={t.hoursBefore} value={f.hours(result.hoursBefore)} />
            <Metric label={t.hoursAfter} value={f.hours(result.hoursAfter)} />
            <Metric label={t.hoursFreed} value={f.hours(result.hoursFreed)} sub={fmt(t.fte, { n: f.number(result.fteEquivalent, 2) })} strong />
          </div>
          <dl className="divide-y divide-slate-100 px-4 sm:px-5">
            <Row label={t.laborValue} hint={t.laborValueHint} value={f.money(result.laborValue, { decimals: 0 })} />
            <Row label={t.platform} value={`− ${f.money(input.platformMonthlyCost, { decimals: 0 })}`} />
            <Row
              label={t.net}
              value={<span className={result.isPositive ? "text-emerald-700" : "text-red-700"}>{f.money(result.netMonthlyEffect, { decimals: 0 })}</span>}
              strong
            />
            <Row
              label={t.payback}
              value={result.paybackMonths != null ? fmt(t.paybackValue, { n: f.number(result.paybackMonths, 1) }) : <span className="text-red-700">{t.paybackNone}</span>}
            />
            <Row label={t.firstYear} value={<span className={result.firstYearNet >= 0 ? "text-slate-900" : "text-red-700"}>{f.money(result.firstYearNet, { decimals: 0 })}</span>} />
          </dl>
        </Card>
        {result.warnings.length > 0 && (
          <div className="space-y-2">
            {result.warnings.map((w) => (
              <Callout key={w} tone={w === "NET_NOT_POSITIVE" || w === "REVIEW_NOT_FASTER" ? "danger" : "warning"} icon={<AlertTriangle className="size-4" />}>
                {t.warnings[w]}
              </Callout>
            ))}
          </div>
        )}
        <Callout tone="neutral" title={t.formula}>
          <ul className="mt-1 space-y-0.5 text-[13px]">
            {t.formulaLines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] font-medium">{t.honesty}</p>
        </Callout>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="bg-white px-4 py-3.5 sm:px-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tracking-tight", strong ? "text-navy-900" : "text-slate-900")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Row({ label, hint, value, strong }: { label: string; hint?: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-slate-600">
        {label}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </dt>
      <dd className={cn("tabular text-right text-sm", strong ? "text-base font-semibold" : "font-medium text-slate-900")}>{value}</dd>
    </div>
  );
}
