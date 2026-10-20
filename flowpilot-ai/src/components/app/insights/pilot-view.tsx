"use client";

import { CheckCircle2, Circle, FlaskConical, Printer } from "lucide-react";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { pilotDict } from "@/i18n/ui/insights";
import { cn } from "@/lib/cn";
import type { PilotPageData } from "@/server/services/insights-queries";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardHeader, PageHeader } from "../../ui/card";
import { Callout, ProgressBar } from "../../ui/feedback";
import { ScrollX } from "../../ui/scroll-x";

const PILOT_LIMIT = 300;
const PILOT_WEEKS = 7;
const CURRENT_PHASE = 1;

interface Criterion {
  key: "accuracy" | "autoRate" | "handling" | "financial" | "audit" | "sla";
  actual: string;
  reached: boolean | null;
}

export function PilotView({ data, today }: { data: PilotPageData; today: string }) {
  const t = useT(pilotDict);
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const { metrics, quality, weightedBaseline } = data;
  const { live, settings } = metrics;

  // Handling time per document: measured in this demo if available, otherwise from the synthetic history.
  const history = metrics.history.filter((h) => h.synthetic);
  const histDocs = history.reduce((n, h) => n + h.documents, 0);
  const histAuto = history.reduce((n, h) => n + h.automated, 0);
  const histMinutes = histDocs > 0 ? (histAuto * settings.autoCheckMinutes + (histDocs - histAuto) * settings.defaultReviewMinutes) / histDocs : null;
  const pilotMinutes = live.documents > 0 ? (live.actualHours * 60) / live.documents : histMinutes;
  const pilotMinutesSource = live.documents > 0 ? (live.measuredShare > 0 ? t.sourceMeasured : t.sourceDemoDefault) : t.sourceHistory;
  // Automation rate of the pilot process only (its document types), measured if available.
  const pilotTypes = data.workflow?.docTypes ?? [];
  const pilotLive = pilotTypes.reduce((acc, type) => ({ total: acc.total + (metrics.byType[type]?.total ?? 0), auto: acc.auto + (metrics.byType[type]?.auto ?? 0) }), { total: 0, auto: 0 });
  const autoRate = pilotLive.total > 0 ? pilotLive.auto / pilotLive.total : data.lastWeekAutoRate;
  const autoRateSource = pilotLive.total > 0 ? t.sourceMeasured : t.sourceHistory;
  const allFields = quality.historyFields + quality.liveFields;
  const allCorrections = quality.historyCorrections + quality.liveCorrections;
  const accuracy = allFields > 0 ? Math.max(0, 1 - allCorrections / allFields) : null;
  const reduction = pilotMinutes != null && weightedBaseline > 0 ? 1 - pilotMinutes / weightedBaseline : null;
  const sla = data.openTasks > 0 ? 1 - data.overdueTasks / data.openTasks : null;

  const criteria: Criterion[] = [
    { key: "accuracy", actual: accuracy == null ? t.notMeasured : f.percent(accuracy, 1), reached: accuracy == null ? null : accuracy >= 0.95 },
    { key: "autoRate", actual: autoRate == null ? t.notMeasured : f.percent(autoRate), reached: autoRate == null ? null : autoRate >= 0.4 },
    { key: "handling", actual: reduction == null ? t.notMeasured : `−${f.percent(Math.max(0, reduction))}`, reached: reduction == null ? null : reduction >= 0.5 },
    { key: "financial", actual: fmt(t.financialActual, { n: data.autoInvoices }), reached: data.autoInvoices === 0 },
    { key: "audit", actual: fmt(t.auditActual, { n: f.number(data.auditEvents) }), reached: data.auditEvents > 0 },
    { key: "sla", actual: sla == null ? t.notMeasured : `${f.percent(sla)} · ${fmt(t.slaActual, { n: data.overdueTasks })}`, reached: sla == null ? null : sla >= 0.9 },
  ];
  const reachedCount = criteria.filter((c) => c.reached).length;

  const kpis = [
    { label: t.handling, before: fmt(t.minutes, { n: f.number(weightedBaseline, 1) }), beforeSource: t.sourceAssumption, after: pilotMinutes == null ? t.notMeasured : fmt(t.minutes, { n: f.number(pilotMinutes, 1) }), afterSource: pilotMinutesSource },
    { label: t.autoRate, before: f.percent(0), beforeSource: t.sourceAssumption, after: autoRate == null ? t.notMeasured : f.percent(autoRate), afterSource: autoRateSource },
    {
      label: t.reviewTime,
      before: "—",
      beforeSource: "—",
      after: metrics.avgReviewSeconds != null ? fmt(t.minutes, { n: f.number(metrics.avgReviewSeconds / 60, 1) }) : t.notMeasured,
      afterSource: metrics.avgReviewSeconds != null ? t.sourceMeasured : "—",
    },
    { label: t.accuracy, before: "—", beforeSource: "—", after: accuracy == null ? t.notMeasured : f.percent(accuracy, 1), afterSource: quality.liveFields > 0 ? `${t.sourceHistory} + ${t.sourceMeasured}` : t.sourceHistory },
  ];

  return (
    <div id="pilot-page">
      <style>{`@media print { aside, header, .no-print { display: none !important; } #pilot-page { font-size: 12px; } .lg\\:pl-60 { padding-left: 0 !important; } main { max-width: none !important; padding: 0 !important; } }`}</style>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button className="no-print" size="sm" icon={<Printer className="size-4" />} onClick={() => window.print()}>
            {t.print}
          </Button>
        }
      />
      <Callout tone="warning" icon={<FlaskConical className="size-4 text-amber-600" />} className="mb-4" title={t.banner} />

      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-2" as="div">
          <CardHeader title={t.planTitle} />
          <dl className="divide-y divide-slate-100 px-4 sm:px-5">
            <PlanRow label={t.process} value={data.workflow ? `${data.workflow.name[lang]} (v${data.workflow.version})` : "—"} />
            <PlanRow label={t.docTypes} value={data.workflow ? data.workflow.docTypes.map((x) => d.docTypePlural[x]).join(", ") : "—"} />
            <PlanRow label={t.scope} value={fmt(t.scopeValue, { limit: PILOT_LIMIT, weeks: PILOT_WEEKS })} />
            <PlanRow label={t.target} value={t.targetValue} />
            <PlanRow label={t.team} value={t.teamValue} />
            <PlanRow label={t.sample} value={t.sampleValue} />
          </dl>
        </Card>
        <Card className="min-w-0 lg:col-span-3" as="div">
          <CardHeader title={t.phasesTitle} />
          <ol className="space-y-0 px-4 py-4 sm:px-5">
            {t.phases.map((ph, i) => {
              const done = i < CURRENT_PHASE;
              const current = i === CURRENT_PHASE;
              return (
                <li key={ph.title} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < t.phases.length - 1 && <span className={cn("absolute top-7 bottom-0 left-[13px] w-px", done ? "bg-emerald-300" : "bg-slate-200")} aria-hidden />}
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-white",
                      done ? "bg-emerald-600 text-white" : current ? "bg-navy-800 text-white" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {done ? <CheckCircle2 className="size-4" /> : i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      {ph.title}
                      <span className="text-xs font-normal text-slate-500">{ph.weeks}</span>
                      {current && <Badge tone="info">{t.currentPhase}</Badge>}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{ph.text}</p>
                    {current && <ProgressBar value={0.5} tone="navy" className="mt-2 max-w-xs" label={ph.title} />}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-3" as="div">
          <CardHeader title={t.kpiTitle} />
          <ScrollX>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium sm:px-5">{t.kpi}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.before}</th>
                  <th className="px-4 py-2 text-right font-medium sm:px-5">{t.after}</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((k) => (
                  <tr key={k.label} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-slate-700 sm:px-5">{k.label}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <span className="tabular block text-slate-900">{k.before}</span>
                      <span className="block text-[11px] text-slate-500">{k.beforeSource}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right sm:px-5">
                      <span className="tabular block font-semibold text-slate-900">{k.after}</span>
                      <span className="block text-[11px] text-slate-500">{k.afterSource}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        </Card>
        <Card className="min-w-0 lg:col-span-2" as="div">
          <CardHeader title={t.qualityTitle} description={t.qualityDescription} />
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <QualityRow label={t.history} accuracy={quality.historyAccuracy} fields={quality.historyFields} corrections={quality.historyCorrections} />
            <QualityRow label={t.live} accuracy={quality.liveAccuracy} fields={quality.liveFields} corrections={quality.liveCorrections} />
          </div>
        </Card>
      </div>

      <Card className="mb-4" as="div">
        <CardHeader title={t.criteriaTitle} actions={<span className="tabular text-xs text-slate-500">{`${reachedCount}/${criteria.length} ${t.reached}`}</span>} />
        <ScrollX>
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium sm:px-5">{t.criterion}</th>
                <th className="px-3 py-2 font-medium">{t.targetCol}</th>
                <th className="px-3 py-2 font-medium">{t.actual}</th>
                <th className="px-4 py-2 text-right font-medium sm:px-5">{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c) => (
                <tr key={c.key} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-700 sm:px-5">{t.criteria[c.key]}</td>
                  <td className="tabular px-3 py-2.5 text-slate-600">{t.criteriaTargets[c.key]}</td>
                  <td className="tabular px-3 py-2.5 text-slate-900">{c.actual}</td>
                  <td className="px-4 py-2.5 text-right sm:px-5">
                    {c.reached ? (
                      <Badge tone="success" icon={<CheckCircle2 className="size-3" />}>
                        {t.reached}
                      </Badge>
                    ) : (
                      <Badge tone="neutral" icon={<Circle className="size-3" />}>
                        {t.open}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      </Card>

      <Card as="article" aria-labelledby="pilot-report-title" className="break-inside-avoid">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <h2 id="pilot-report-title" className="text-base font-semibold text-slate-900">
            {t.reportTitle}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">{t.reportSubtitle}</p>
        </div>
        <div className="grid gap-4 px-4 py-4 text-sm sm:px-5 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">{t.reportCompany}</p>
            <p className="font-medium text-slate-900">{data.company}</p>
            <p className="mt-2 text-xs text-slate-500">{t.process}</p>
            <p className="font-medium text-slate-900">{data.workflow?.name[lang] ?? "—"}</p>
            <p className="mt-2 text-xs text-slate-500">{t.reportDate}</p>
            <p className="font-medium text-slate-900">{f.date(today)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t.reportSummary}</p>
            <ul className="mt-1 space-y-1 text-[13px] text-slate-700">
              {kpis.map((k) => (
                <li key={k.label}>
                  {k.label}: <span className="font-semibold text-slate-900">{k.after}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t.reportRecommendation}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-800">
              {fmt(reachedCount >= 4 ? t.goText : t.noGoText, { n: reachedCount, total: criteria.length })}
            </p>
          </div>
        </div>
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">{t.reportNote}</p>
      </Card>
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[130px_1fr] sm:gap-3">
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="text-[13px] font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function QualityRow({ label, accuracy, fields, corrections }: { label: string; accuracy: number | null; fields: number; corrections: number }) {
  const t = useT(pilotDict);
  const f = useFormat();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-700">{label}</p>
        <p className="tabular text-lg font-semibold text-slate-900">{accuracy == null ? "—" : f.percent(accuracy, 1)}</p>
      </div>
      <ProgressBar value={accuracy ?? 0} tone={accuracy != null && accuracy >= 0.95 ? "emerald" : "amber"} className="mt-1.5" label={label} />
      <p className="mt-1 text-xs text-slate-500">
        {fmt(t.fields, { n: f.number(fields) })} · {fmt(t.corrections, { n: f.number(corrections) })}
      </p>
    </div>
  );
}
