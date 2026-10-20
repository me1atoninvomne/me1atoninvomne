"use client";

import { ArrowRight, Bot, Clock, Timer, UserCheck } from "lucide-react";
import Link from "next/link";
import type { DocType } from "@/domain/types";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useT } from "@/i18n/client";
import { chartDict, roiPageDict } from "@/i18n/ui/insights";
import { cn } from "@/lib/cn";
import type { RoiPageData } from "@/server/services/insights-queries";
import { RoiCalculator } from "../../roi/roi-calculator";
import { Badge } from "../../ui/badge";
import { Card, CardHeader, PageHeader, Stat } from "../../ui/card";
import { Callout } from "../../ui/feedback";
import { LineChart } from "../charts";
import { weeklySeries } from "./series";

const TYPE_ORDER: DocType[] = ["purchase_order", "invoice", "order_confirmation", "delivery_note", "rfq", "delay_notice"];

export function RoiView({ data, canEditSettings }: { data: RoiPageData; canEditSettings: boolean }) {
  const t = useT(roiPageDict);
  const ct = useT(chartDict);
  const d = useDomain();
  const f = useFormat();
  const { metrics, projection: p, weightedBaseline } = data;
  const { live, settings } = metrics;
  const series = weeklySeries(metrics, ct.weekShort);
  const hasLive = live.documents > 0;
  const negative = p.netPotential <= 0;

  return (
    <div>
      <PageHeader title={t.title} description={t.description} />

      {/* (3) Three separated figures */}
      <Card className="mb-4" as="div">
        <CardHeader title={t.threeTitle} description={t.threeDescription} />
        <div className="grid gap-px overflow-hidden bg-slate-100 md:grid-cols-3">
          <Figure label={t.freed} value={`${f.hours(p.hoursPerMonth)} ${t.perMonth}`} hint={t.freedHint} badge={<Badge tone="neutral">{ct.synthetic}</Badge>} />
          <Figure
            label={t.potential}
            value={`${f.money(p.netPotential, { decimals: 0 })} ${t.perMonth}`}
            hint={t.potentialHint}
            tone={negative ? "danger" : "default"}
            badge={<Badge tone="warning">{t.badgePotential}</Badge>}
          />
          <Figure
            label={t.confirmed}
            value={p.confirmedMonthlySavings > 0 ? `${f.money(p.confirmedMonthlySavings, { decimals: 0 })} ${t.perMonth}` : t.confirmedNone}
            hint={t.confirmedHint}
            muted={p.confirmedMonthlySavings <= 0}
            badge={p.confirmedMonthlySavings > 0 ? <Badge tone="success">{t.badgeEvidence}</Badge> : undefined}
          />
        </div>
      </Card>

      {/* (1) Measured in this demo */}
      <Card className="mb-4" as="div">
        <CardHeader title={t.measuredTitle} description={t.measuredDescription} />
        {hasLive ? (
          <div className="grid grid-cols-2 gap-3 p-4 sm:p-5 lg:grid-cols-4">
            <Stat className="min-w-0" label={t.documents} value={f.number(live.documents)} icon={<Bot className="size-4" />} hint={`${t.automated}: ${live.automated} · ${t.human}: ${live.humanHandled}`} />
            <Stat className="min-w-0" label={t.baselineHours} value={f.hours(live.baselineHours)} icon={<Clock className="size-4" />} hint={t.baselineHint} />
            <Stat className="min-w-0" label={t.actualHours} value={f.hours(live.actualHours)} icon={<UserCheck className="size-4" />} hint={t.actualHint} />
            <Stat className="min-w-0"
              label={t.hoursFreed}
              value={f.hours(Math.max(0, live.hoursFreed))}
              icon={<Timer className="size-4" />}
              tone="success"
              hint={`${t.value}: ${f.money(Math.max(0, live.laborValue), { decimals: 0 })}`}
            />
            <div className="col-span-2 lg:col-span-4">
              <p className="text-[13px] text-slate-600">{fmt(t.measuredShareHint, { n: f.percent(live.measuredShare), m: f.number(settings.defaultReviewMinutes, 1) })}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <Callout tone="info">{t.measuredEmpty}</Callout>
          </div>
        )}
      </Card>

      {/* (2) Monthly projection + history chart */}
      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-2" as="div">
          <CardHeader title={t.monthlyTitle} description={t.monthlyDescription} />
          <dl className="divide-y divide-slate-100 px-4 sm:px-5">
            <Row label={t.docsPerMonth} value={f.number(p.docsPerMonth)} />
            <Row label={t.autoRate} value={f.percent(p.autoRate)} />
            <Row label={t.hoursPerMonth} value={f.hours(p.hoursPerMonth)} />
            <Row label={t.valuePerMonth} value={f.money(p.valuePerMonth, { decimals: 0 })} />
            <Row label={t.platformCost} value={`− ${f.money(p.platformCost, { decimals: 0 })}`} />
            <Row label={t.netPotential} value={<span className={negative ? "text-red-700" : "text-emerald-700"}>{f.money(p.netPotential, { decimals: 0 })}</span>} strong />
            <Row
              label={t.payback}
              value={p.paybackMonths != null ? fmt(t.paybackMonths, { n: f.number(p.paybackMonths, 1) }) : <span className="text-red-700">{t.paybackNone}</span>}
              hint={`${t.implementation}: ${f.money(p.implementationCost, { decimals: 0 })}`}
            />
          </dl>
          {negative && (
            <div className="px-4 pb-4 sm:px-5">
              <Callout tone="danger">{t.negativeNote}</Callout>
            </div>
          )}
        </Card>
        <Card className="min-w-0 lg:col-span-3" as="div">
          <CardHeader title={t.historyTitle} description={t.historyDescription} />
          <div className="px-4 py-4 sm:px-5">
            <LineChart data={series.hours} valueLabel={ct.hoursFreed} format={(v) => f.hours(v)} note={fmt(ct.liveNote, { week: series.liveLabel, value: f.hours(series.liveHours) })} height={240} />
          </div>
        </Card>
      </div>

      {/* (4) Assumptions */}
      <Card className="mb-4" as="div">
        <CardHeader
          title={t.assumptionsTitle}
          description={t.assumptionsDescription}
          actions={
            canEditSettings && (
              <Link href="/app/settings" className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-700 hover:underline">
                {t.editAssumptions} <ArrowRight className="size-3.5" />
              </Link>
            )
          }
        />
        <div className="grid gap-x-8 px-4 py-3 sm:px-5 md:grid-cols-2">
          <div>
            <p className="pt-1 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.baselinePerType}</p>
            <table className="w-full text-[13px]">
              <tbody>
                {TYPE_ORDER.map((type) => (
                  <tr key={type} className="border-b border-slate-50 last:border-0">
                    <td className="py-1.5 text-slate-600">{d.docType[type]}</td>
                    <td className="tabular py-1.5 text-right font-medium text-slate-900">{f.number(settings.baselineMinutes[type] ?? 0, 1)} {t.min}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1.5 text-slate-500">{t.weightedAvg}</td>
                  <td className="tabular py-1.5 text-right text-slate-500">{f.number(weightedBaseline, 1)} {t.min}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <dl className="divide-y divide-slate-100">
            <Row label={t.autoCheck} value={`${f.number(settings.autoCheckMinutes, 1)} ${t.min}`} />
            <Row label={t.defaultReview} value={`${f.number(settings.defaultReviewMinutes, 1)} ${t.min}`} />
            <Row label={t.hourlyRate} value={`${f.number(settings.hourlyRate)} ${t.perHour}`} />
            <Row label={t.platformCost} value={`${f.money(settings.platformMonthlyCost, { decimals: 0 })} ${t.perMonth}`} />
            <Row label={t.implementation} value={f.money(settings.implementationCost, { decimals: 0 })} />
          </dl>
        </div>
      </Card>

      {/* (5) Calculator */}
      <div className="mb-2">
        <h2 className="text-base font-semibold text-slate-900">{t.calculatorTitle}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{t.calculatorDescription}</p>
      </div>
      <RoiCalculator
        initial={{
          documentsPerMonth: p.docsPerMonth || 1000,
          manualMinutesPerDocument: weightedBaseline,
          hourlyRate: settings.hourlyRate,
          automationRate: Math.round(p.autoRate * 20) / 20,
          reviewMinutesPerAutomatedDocument: settings.autoCheckMinutes,
          implementationCost: settings.implementationCost,
          platformMonthlyCost: settings.platformMonthlyCost,
        }}
      />
    </div>
  );
}

function Figure({
  label,
  value,
  hint,
  badge,
  tone = "default",
  muted,
}: {
  label: string;
  value: string;
  hint: string;
  badge?: React.ReactNode;
  tone?: "default" | "danger";
  muted?: boolean;
}) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-600">{label}</p>
        {badge}
      </div>
      <p className={cn("mt-1.5 font-semibold tracking-tight", muted ? "text-base text-slate-500" : "text-2xl", tone === "danger" ? "text-red-700" : !muted && "text-slate-900")}>{value}</p>
      <p className="mt-1 text-xs leading-snug text-slate-500">{hint}</p>
    </div>
  );
}

function Row({ label, value, strong, hint }: { label: string; value: React.ReactNode; strong?: boolean; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-slate-600">
        {label}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </dt>
      <dd className={cn("tabular text-right text-sm whitespace-nowrap", strong ? "text-base font-semibold" : "font-medium text-slate-900")}>{value}</dd>
    </div>
  );
}
