"use client";

import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Clock, Inbox, Play, Radar, Timer, Wallet, XCircle } from "lucide-react";
import Link from "next/link";
import type { DocType } from "@/domain/types";
import { fmt } from "@/i18n/core";
import { useDomain, useFormat, useT } from "@/i18n/client";
import { issueText } from "@/i18n/domain";
import { chartDict, dashboardDict } from "@/i18n/ui/insights";
import { cn } from "@/lib/cn";
import type { DocListItem, Metrics } from "@/server/services/queries";
import { ButtonLink } from "../../ui/button";
import { Card, CardHeader, PageHeader, Stat } from "../../ui/card";
import { Callout, EmptyState } from "../../ui/feedback";
import { DocTypeBadge, SeverityIcon, StatusBadge } from "../badges";
import { BreakdownBars, LineChart, WeeklyStackedChart } from "../charts";
import { AuditTimeline, type TimelineEvent } from "../timeline";
import { weeklySeries } from "./series";

const CATEGORY_ORDER = ["critical", "duplicate", "delay", "overdue", "unprocessed", "approval"];

export function DashboardView({
  metrics,
  queue,
  openReviews,
  recent,
  exceptionCounts,
  exceptionTotal,
  users,
}: {
  metrics: Metrics;
  queue: DocListItem[];
  openReviews: number;
  recent: TimelineEvent[];
  exceptionCounts: Record<string, number>;
  exceptionTotal: number;
  users: { id: string; name: string }[];
}) {
  const t = useT(dashboardDict);
  const ct = useT(chartDict);
  const d = useDomain();
  const f = useFormat();
  const { live } = metrics;
  const series = weeklySeries(metrics, ct.weekShort);
  const autoRate = live.documents > 0 ? live.automated / live.documents : null;

  const breakdown = Object.entries(metrics.byType)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([type, v]) => ({ key: type, label: d.docTypePlural[type as DocType] ?? type, auto: v.auto, total: v.total, caption: fmt(t.ofAuto, { auto: v.auto, total: v.total }) }));

  return (
    <div>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <ButtonLink href="/app/inbox" size="sm" icon={<Inbox className="size-4" />}>
            {t.inboxCta}
          </ButtonLink>
        }
      />

      {metrics.pending > 0 && (
        <Callout
          tone="info"
          className="mb-5"
          title={t.pendingTitle}
          action={
            <ButtonLink href="/app/inbox?tour=1" variant="primary" size="sm" icon={<Play className="size-4" />}>
              {t.pendingCta}
            </ButtonLink>
          }
        >
          {fmt(t.pendingText, { n: metrics.pending })}
        </Callout>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat className="min-w-0"
          label={t.kpi.processed}
          value={f.number(live.documents)}
          icon={<Inbox className="size-4" />}
          hint={live.ignored > 0 ? fmt(t.kpi.processedHint, { n: live.ignored }) : t.kpi.processedNone}
        />
        <Stat className="min-w-0"
          label={t.kpi.autoRate}
          value={autoRate == null ? "—" : f.percent(autoRate)}
          icon={<Bot className="size-4" />}
          hint={fmt(t.kpi.autoRateHint, { auto: live.automated, total: live.documents })}
        />
        <Stat className="min-w-0" label={t.kpi.openReviews} value={f.number(openReviews)} icon={<Clock className="size-4" />} hint={t.kpi.openReviewsHint} tone={openReviews > 0 ? "warning" : "default"} />
        <Stat className="min-w-0" label={t.kpi.hoursFreed} value={f.hours(Math.max(0, live.hoursFreed))} icon={<Timer className="size-4" />} hint={t.kpi.hoursFreedHint} tone={live.hoursFreed > 0 ? "success" : "default"} />
        <Stat className="min-w-0" label={t.kpi.value} value={f.money(Math.max(0, live.laborValue), { decimals: 0 })} icon={<Wallet className="size-4" />} hint={t.kpi.valueHint} />
        <Stat className="min-w-0" label={t.kpi.exceptions} value={f.number(exceptionTotal)} icon={<Radar className="size-4" />} hint={t.kpi.exceptionsHint} tone={exceptionTotal > 0 ? "danger" : "default"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2" as="div">
          <CardHeader title={t.weeklyTitle} description={t.weeklyDescription} />
          <div className="px-4 py-4 sm:px-5">
            <WeeklyStackedChart data={series.bars} />
          </div>
        </Card>
        <Card className="min-w-0" as="div">
          <CardHeader
            title={t.exceptionsTitle}
            icon={<AlertTriangle className="size-4" />}
            actions={
              <Link href="/app/exceptions" className="text-[13px] font-medium text-blue-700 hover:underline">
                {t.exceptionsAll}
              </Link>
            }
          />
          {CATEGORY_ORDER.every((c) => !exceptionCounts[c]) ? (
            <EmptyState icon={<CheckCircle2 className="size-5" />} title={t.exceptionsNone} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {CATEGORY_ORDER.filter((c) => exceptionCounts[c]).map((c) => (
                <li key={c}>
                  <Link href="/app/exceptions" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 sm:px-5">
                    <span
                      className={cn(
                        "tabular flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        c === "critical" || c === "duplicate" ? "bg-red-50 text-red-700" : c === "approval" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {exceptionCounts[c]}
                    </span>
                    <span className="flex-1 text-sm text-slate-700">{t.exceptionCategory[c]}</span>
                    <ArrowRight className="size-4 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2" as="div">
          <CardHeader title={t.hoursTitle} description={t.hoursDescription} />
          <div className="px-4 py-4 sm:px-5">
            <LineChart data={series.hours} valueLabel={ct.hoursFreed} format={(v) => f.hours(v)} note={fmt(ct.liveNote, { week: series.liveLabel, value: f.hours(series.liveHours) })} />
          </div>
        </Card>
        <Card className="min-w-0" as="div">
          <CardHeader title={t.byTypeTitle} description={t.byTypeDescription} />
          <div className="px-4 py-4 sm:px-5">{breakdown.length === 0 ? <p className="text-sm text-slate-500">{t.byTypeEmpty}</p> : <BreakdownBars rows={breakdown} />}</div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2" as="div">
          <CardHeader
            title={t.queueTitle}
            actions={
              queue.length > 0 && (
                <Link href="/app/review" className="text-[13px] font-medium text-blue-700 hover:underline">
                  {t.queueAll}
                </Link>
              )
            }
          />
          {queue.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="size-5" />} title={t.queueEmpty} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {queue.map((item) => (
                <li key={item.id}>
                  <Link href={`/app/documents/${item.id}`} className="flex flex-col gap-1.5 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <DocTypeBadge type={item.docType} />
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-slate-900">
                        {item.documentNumber ?? item.fileName ?? "—"} <span className="font-normal text-slate-500">· {item.partyName ?? "—"}</span>
                      </p>
                      {item.topIssue && (
                        <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-slate-600">
                          <SeverityIcon severity={item.topIssue.severity} className="mt-0.5 size-3.5 shrink-0" />
                          <span className="truncate">{issueText(item.topIssue, d, f, item.docType as DocType).title}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 text-[13px] sm:justify-end">
                      <span className="tabular font-medium text-slate-900">{f.money(item.grossAmount ?? item.netAmount)}</span>
                      <span className="text-slate-500">{users.find((u) => u.id === item.assigneeId)?.name ?? "—"}</span>
                      <ArrowRight className="hidden size-4 text-slate-300 sm:block" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="min-w-0" as="div">
          <CardHeader
            title={t.activityTitle}
            actions={
              <Link href="/app/audit" className="text-[13px] font-medium text-blue-700 hover:underline">
                {t.activityAll}
              </Link>
            }
          />
          <div className="max-h-[440px] overflow-y-auto px-4 py-4 sm:px-5">
            {recent.length === 0 ? <p className="text-sm text-slate-500">{t.activityEmpty}</p> : <AuditTimeline events={recent} dense showDocumentLinks />}
          </div>
        </Card>
      </div>

      <Card className="mt-4" as="div">
        <CardHeader title={t.beforeAfter.title} />
        <div className="grid gap-px overflow-hidden bg-slate-100 md:grid-cols-2">
          <div className="bg-white px-4 py-4 sm:px-5">
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.beforeAfter.before}</p>
            <ul className="space-y-1.5">
              {t.beforeAfter.beforeItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white px-4 py-4 sm:px-5">
            <p className="mb-2 text-xs font-semibold tracking-wide text-navy-700 uppercase">{t.beforeAfter.after}</p>
            <ul className="space-y-1.5">
              {t.beforeAfter.afterItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-800">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
