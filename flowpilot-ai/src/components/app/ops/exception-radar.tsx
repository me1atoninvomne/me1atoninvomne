"use client";

import { AlarmClock, ArrowRight, CheckCircle2, Copy as CopyIcon, Inbox, Repeat, ShieldAlert, Truck, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { DocType, Severity } from "@/domain/types";
import { fmt, type Formatters } from "@/i18n/core";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { issueText, type DomainDict } from "@/i18n/domain";
import { exceptionsDict } from "@/i18n/ui/ops";
import { cn } from "@/lib/cn";
import type { ExceptionCategory, ExceptionItem } from "@/server/services/queries";
import { Badge } from "../../ui/badge";
import { ButtonLink } from "../../ui/button";
import { Card, PageHeader, Stat } from "../../ui/card";
import { EmptyState, ProgressBar } from "../../ui/feedback";
import { Segmented } from "../../ui/tabs";
import { DocTypeBadge, SeverityIcon } from "../badges";

const ORDER: ExceptionCategory[] = ["critical", "duplicate", "delay", "overdue", "unprocessed", "approval", "recurring"];

const CATEGORY_ICON: Record<ExceptionCategory, React.ComponentType<{ className?: string }>> = {
  critical: ShieldAlert,
  duplicate: CopyIcon,
  delay: Truck,
  overdue: AlarmClock,
  unprocessed: Inbox,
  approval: UserCheck,
  recurring: Repeat,
};

type Filter = "all" | ExceptionCategory;
type T = (typeof exceptionsDict)["de"];

export function ExceptionRadar({ items }: { items: ExceptionItem[] }) {
  const t = useT(exceptionsDict);
  const f = useFormat();
  const [filter, setFilter] = useState<Filter>("all");

  const active = items.filter((i) => i.category !== "recurring");
  const byCategory = useMemo(() => {
    const map = new Map<ExceptionCategory, ExceptionItem[]>();
    for (const c of ORDER) map.set(c, []);
    for (const i of items) map.get(i.category)?.push(i);
    return map;
  }, [items]);

  const atRisk = useMemo(() => {
    // Count each document once (its largest open amount) so that several findings do not inflate the sum.
    const perDoc = new Map<string, number>();
    for (const i of active) {
      if (!i.documentId || i.amountAtRisk == null || i.category === "approval") continue;
      perDoc.set(i.documentId, Math.max(perDoc.get(i.documentId) ?? 0, i.amountAtRisk));
    }
    return [...perDoc.values()].reduce((s, v) => s + v, 0);
  }, [active]);

  const criticalCount = active.filter((i) => i.severity === "critical").length;
  const overdueCount = byCategory.get("overdue")?.length ?? 0;
  const visibleCategories = ORDER.filter((c) => (filter === "all" || filter === c) && (byCategory.get(c)?.length ?? 0) > 0);

  return (
    <div>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <>
            <ButtonLink href="/app/inbox" size="sm">
              {t.toInbox}
            </ButtonLink>
            <ButtonLink href="/app/review" size="sm" variant="primary">
              {t.toReview} <ArrowRight className="size-4" />
            </ButtonLink>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t.summary.open} value={f.number(active.length)} hint={t.summary.openHint} />
        <Stat label={t.summary.critical} value={f.number(criticalCount)} hint={t.summary.criticalHint} tone={criticalCount > 0 ? "danger" : "default"} />
        <Stat label={t.summary.overdue} value={f.number(overdueCount)} hint={t.summary.overdueHint} tone={overdueCount > 0 ? "warning" : "default"} />
        <Stat label={t.summary.atRisk} value={f.money(atRisk, { decimals: 0 })} hint={t.summary.atRiskHint} />
      </div>

      <div className="mb-4">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t.filterAll, count: items.length },
            ...ORDER.filter((c) => (byCategory.get(c)?.length ?? 0) > 0).map((c) => ({ value: c, label: t.categories[c].short, count: byCategory.get(c)!.length })),
          ]}
        />
      </div>

      {items.length === 0 ? (
        <Card as="div">
          <EmptyState icon={<CheckCircle2 className="size-5 text-emerald-600" />} title={t.emptyTitle} text={t.emptyText} />
        </Card>
      ) : visibleCategories.length === 0 ? (
        <Card as="div">
          <EmptyState icon={<CheckCircle2 className="size-5 text-emerald-600" />} title={t.emptyTitle} text={t.emptyFilter} />
        </Card>
      ) : (
        <div className="space-y-7">
          {visibleCategories.map((category) => {
            const list = byCategory.get(category)!;
            const Icon = CATEGORY_ICON[category];
            return (
              <section key={category} aria-labelledby={`cat-${category}`}>
                <div className="mb-3 flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                      category === "critical" || category === "duplicate"
                        ? "bg-red-50 text-red-600"
                        : category === "delay" || category === "overdue" || category === "unprocessed"
                          ? "bg-amber-50 text-amber-600"
                          : category === "approval"
                            ? "bg-sky-50 text-sky-600"
                            : "bg-violet-50 text-violet-600",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 id={`cat-${category}`} className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {t.categories[category].title}
                      <span className="tabular rounded-full bg-slate-100 px-1.5 text-xs font-medium text-slate-600">{list.length}</span>
                    </h2>
                    <p className="text-[13px] text-slate-500">{t.categories[category].text}</p>
                  </div>
                </div>
                {category === "recurring" ? (
                  <RecurringList items={list} />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {list.map((item) => (
                      <ExceptionCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CardText {
  title: string;
  what: string;
  consequence: string;
  recommendation: string;
}

function describe(item: ExceptionItem, t: T, d: DomainDict, f: Formatters, lang: "de" | "en"): CardText {
  const amount = item.amountAtRisk != null && item.amountAtRisk > 0 ? f.money(item.amountAtRisk) : null;
  if (item.issue) {
    const txt = issueText(item.issue, d, f, item.docType ?? null);
    const p = item.issue.params;
    let consequence: string;
    switch (item.issue.code) {
      case "IBAN_CHANGED":
      case "IBAN_INVALID":
      case "DUPLICATE_INVOICE":
      case "DUPLICATE_ORDER":
      case "UNKNOWN_PARTY":
        consequence = amount ? fmt(t.consequences[item.issue.code], { amount }) : t.consequences.none;
        break;
      case "DELIVERY_DELAY":
        consequence =
          Number(p.affectedCount) > 0
            ? fmt(t.consequences.DELIVERY_DELAY_AFFECTED, { orders: p.affectedOrders, customers: p.customers, amount: amount ?? "—" })
            : t.consequences.DELIVERY_DELAY;
        break;
      case "NO_TEXT_LAYER":
        consequence = t.consequences.NO_TEXT_LAYER;
        break;
      default:
        consequence = amount ? fmt(t.consequences.amount, { amount }) : t.consequences.none;
    }
    return { title: txt.title, what: txt.why, consequence, recommendation: txt.recommendation };
  }
  if (item.category === "overdue") {
    const title = item.taskTitle?.[lang] ?? item.taskTitle?.de ?? "—";
    return { title, what: fmt(t.taskWhat, { title }), consequence: t.consequences.overdue, recommendation: t.recommendations.overdue };
  }
  if (item.category === "unprocessed" && item.email) {
    const m = item.email.minutes;
    const duration = m >= 120 ? fmt(t.durationHours, { n: f.number(m / 60, 1) }) : fmt(t.durationMinutes, { n: m });
    return {
      title: item.email.subject,
      what: fmt(t.unprocessedWhat, { subject: item.email.subject, from: item.email.from }),
      consequence: fmt(t.consequences.unprocessed, { duration }),
      recommendation: t.recommendations.unprocessed,
    };
  }
  // approval
  const docType = item.docType ? d.docType[item.docType] : "—";
  return {
    title: `${docType} ${item.number ?? ""}`.trim(),
    what: fmt(t.approvalWhat, { docType, number: item.number ?? "", party: item.party ?? "—" }),
    consequence: amount ? `${t.consequences.approval} ${fmt(t.consequences.amount, { amount })}` : t.consequences.approval,
    recommendation: t.recommendations.approval,
  };
}

function severityAccent(s: Severity) {
  return s === "critical" ? "before:bg-red-500" : s === "warning" ? "before:bg-amber-400" : "before:bg-sky-400";
}

function ExceptionCard({ item }: { item: ExceptionItem }) {
  const t = useT(exceptionsDict);
  const d = useDomain();
  const f = useFormat();
  const lang = useLang();
  const text = describe(item, t, d, f, lang);
  const overdue = item.dueAt != null && new Date(item.dueAt) < new Date();
  return (
    <Card
      as="article"
      className={cn("relative flex flex-col overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1", severityAccent(item.severity))}
    >
      <div className="flex-1 px-4 py-3.5 pl-5">
        <div className="flex items-start gap-2">
          <SeverityIcon severity={item.severity} className="mt-0.5 shrink-0" />
          <h3 className="min-w-0 flex-1 text-sm leading-snug font-semibold text-slate-900">{text.title}</h3>
          {item.amountAtRisk != null && item.amountAtRisk > 0 && item.category !== "approval" && (
            <span className="tabular shrink-0 text-sm font-semibold text-slate-900">{f.money(item.amountAtRisk)}</span>
          )}
        </div>
        {(item.docType || item.party) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-6 text-[13px] text-slate-500">
            {item.docType && <DocTypeBadge type={item.docType as DocType} />}
            {item.number && item.category !== "approval" && <span className="font-medium text-slate-700">{item.number}</span>}
            {item.party && <span className="truncate">{item.party}</span>}
          </div>
        )}
        <dl className="mt-3 space-y-2 pl-6 text-[13px] leading-relaxed">
          <div>
            <dt className="text-xs font-medium text-slate-500">{t.what}</dt>
            <dd className="text-slate-700">{text.what}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">{t.consequence}</dt>
            <dd className="text-slate-700">{text.consequence}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">{t.recommendation}</dt>
            <dd className="font-medium text-slate-900">{text.recommendation}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2 pl-5">
        <div className="flex flex-wrap gap-1.5">
          {item.dueAt && (
            <Badge tone={overdue ? "danger" : "neutral"} icon={<AlarmClock className="size-3" />}>
              {fmt(overdue ? t.overdueSince : t.due, { rel: f.relative(item.dueAt) })}
            </Badge>
          )}
          {item.email && <Badge tone="warning">{fmt(t.receivedAgo, { rel: f.relative(item.email.receivedAt) })}</Badge>}
        </div>
        {item.documentId ? (
          <ButtonLink href={`/app/documents/${item.documentId}`} size="xs" variant="primary">
            {t.openDocument} <ArrowRight className="size-3.5" />
          </ButtonLink>
        ) : item.category === "overdue" ? (
          <ButtonLink href="/app/tasks" size="xs">
            {t.openTasks} <ArrowRight className="size-3.5" />
          </ButtonLink>
        ) : item.category === "unprocessed" ? (
          <ButtonLink href="/app/inbox" size="xs" variant="primary">
            {t.processInbox} <ArrowRight className="size-3.5" />
          </ButtonLink>
        ) : null}
      </div>
    </Card>
  );
}

function RecurringList({ items }: { items: ExceptionItem[] }) {
  const t = useT(exceptionsDict);
  const f = useFormat();
  return (
    <Card as="div">
      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const r = item.recurring!;
          return (
            <li key={item.id} className="grid gap-3 px-4 py-3.5 sm:px-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{r.partyName}</p>
                <p className="text-[13px] text-slate-600">
                  {fmt(t.patternText, { label: t.patternLabels[r.code] ?? r.code, occurrences: r.occurrences, outOf: r.outOf, weeks: r.weeks })}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={r.outOf ? r.occurrences / r.outOf : 0} tone="amber" className="max-w-40" label={t.patternLabels[r.code]} />
                  <span className="tabular text-xs text-slate-500">{f.percent(r.outOf ? r.occurrences / r.outOf : 0)}</span>
                </div>
              </div>
              <div className="text-[13px]">
                <p className="text-xs font-medium text-slate-500">{t.recommendation}</p>
                <p className="font-medium text-slate-900">{t.patternFix[r.code] ?? t.patternFixDefault}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 sm:px-5">{t.syntheticLabel}</p>
    </Card>
  );
}
