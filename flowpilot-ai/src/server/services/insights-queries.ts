/**
 * Read models for the insights pages (dashboard, ROI, pilot). Derived figures are computed
 * here so the UI only formats them. Synthetic history and live measurements stay separated.
 */
import "server-only";
import { and, count, eq, inArray, lt } from "drizzle-orm";
import { INDUSTRY_TEMPLATES, type IndustryKey } from "@/domain/templates";
import type { DocType, LocalizedText } from "@/domain/types";
import type { Session } from "@/server/auth/session";
import { getDb, schema } from "@/server/db/client";
import { getMetrics, type Metrics } from "./queries";

const WEEKS_PER_MONTH = 4.33;

/** Typical document mix, used to weight per-type baseline minutes (same as the demo seed). */
const DOC_MIX: Record<string, number> = { purchase_order: 0.35, invoice: 0.25, order_confirmation: 0.15, delivery_note: 0.12, rfq: 0.06, delay_notice: 0.07 };

export interface MonthlyProjection {
  weeks: number;
  docsPerMonth: number;
  autoRate: number;
  hoursPerMonth: number;
  valuePerMonth: number;
  platformCost: number;
  netPotential: number;
  paybackMonths: number | null;
  implementationCost: number;
  confirmedMonthlySavings: number;
}

export function weightedBaselineMinutes(baseline: Record<string, number>): number {
  let sum = 0;
  let weight = 0;
  for (const [type, share] of Object.entries(DOC_MIX)) {
    if (baseline[type] == null) continue;
    sum += baseline[type] * share;
    weight += share;
  }
  return weight > 0 ? Math.round((sum / weight) * 10) / 10 : 8;
}

export function monthlyProjection(m: Metrics): MonthlyProjection {
  const synthetic = m.history.filter((h) => h.synthetic);
  const n = synthetic.length;
  const avg = (sel: (h: (typeof synthetic)[number]) => number) => (n === 0 ? 0 : synthetic.reduce((s, h) => s + sel(h), 0) / n);
  const docsPerWeek = avg((h) => h.documents);
  const autoPerWeek = avg((h) => h.automated);
  const hoursPerWeek = avg((h) => h.hoursFreed);
  const hoursPerMonth = Math.round(hoursPerWeek * WEEKS_PER_MONTH * 10) / 10;
  const valuePerMonth = Math.round(hoursPerMonth * m.settings.hourlyRate);
  const platformCost = m.settings.platformMonthlyCost;
  const netPotential = valuePerMonth - platformCost;
  return {
    weeks: n,
    docsPerMonth: Math.round(docsPerWeek * WEEKS_PER_MONTH),
    autoRate: docsPerWeek > 0 ? autoPerWeek / docsPerWeek : 0,
    hoursPerMonth,
    valuePerMonth,
    platformCost,
    netPotential,
    paybackMonths: netPotential > 0 ? Math.round((m.settings.implementationCost / netPotential) * 10) / 10 : null,
    implementationCost: m.settings.implementationCost,
    confirmedMonthlySavings: m.settings.confirmedMonthlySavings,
  };
}

export async function getRoiPage(s: Session) {
  const metrics = await getMetrics(s);
  return { metrics, projection: monthlyProjection(metrics), weightedBaseline: weightedBaselineMinutes(metrics.settings.baselineMinutes) };
}
export type RoiPageData = Awaited<ReturnType<typeof getRoiPage>>;

export async function getPilotPage(s: Session) {
  const db = await getDb();
  const metrics = await getMetrics(s);
  const projection = monthlyProjection(metrics);
  const industry = s.workspace.industry as IndustryKey;
  const template = INDUSTRY_TEMPLATES[industry] ?? INDUSTRY_TEMPLATES.manufacturing;
  const mainKey = template.workflows[0]?.key;
  const wf = mainKey ? await db.query.workflows.findFirst({ where: and(eq(schema.workflows.workspaceId, s.workspace.id), eq(schema.workflows.key, mainKey)) }) : null;

  // Live field statistics from processed documents.
  const docs = await db.query.documents.findMany({
    where: and(eq(schema.documents.workspaceId, s.workspace.id), inArray(schema.documents.status, ["auto_processed", "needs_review", "needs_approval", "info_requested", "approved", "rejected", "exported"])),
    columns: { extraction: true, docType: true, route: true },
  });
  let liveFields = 0;
  for (const d of docs) {
    const x = d.extraction;
    if (!x || x.docType === "other") continue;
    liveFields += Object.values(x.fields).filter((f) => f && (f.value != null || f.originalValue != null)).length;
    liveFields += x.lineItems.length * 4;
  }
  const autoInvoices = docs.filter((d) => d.docType === "invoice" && d.route === "auto").length;
  const [{ n: auditEvents }] = await db.select({ n: count() }).from(schema.auditEvents).where(eq(schema.auditEvents.workspaceId, s.workspace.id));
  const [{ n: overdueTasks }] = await db
    .select({ n: count() })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.workspaceId, s.workspace.id), eq(schema.tasks.status, "open"), lt(schema.tasks.dueAt, new Date().toISOString())));
  const [{ n: openTasks }] = await db
    .select({ n: count() })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.workspaceId, s.workspace.id), eq(schema.tasks.status, "open")));

  const historyFields = metrics.history.filter((h) => h.synthetic).reduce((n, h) => n + h.fieldsExtracted, 0);
  const historyCorrections = metrics.history.filter((h) => h.synthetic).reduce((n, h) => n + h.corrections, 0);
  const lastWeek = [...metrics.history].filter((h) => h.synthetic).at(-1) ?? null;

  return {
    metrics,
    projection,
    weightedBaseline: weightedBaselineMinutes(metrics.settings.baselineMinutes),
    company: s.workspace.settings.companyName,
    workflow: wf ? { name: wf.name as LocalizedText, docTypes: wf.docTypes as DocType[], version: wf.version } : null,
    quality: {
      historyFields,
      historyCorrections,
      historyAccuracy: historyFields > 0 ? 1 - historyCorrections / historyFields : null,
      liveFields,
      liveCorrections: metrics.corrections,
      liveAccuracy: liveFields > 0 ? Math.max(0, 1 - metrics.corrections / liveFields) : null,
    },
    lastWeekAutoRate: lastWeek && lastWeek.documents > 0 ? lastWeek.automated / lastWeek.documents : null,
    autoInvoices,
    auditEvents,
    overdueTasks,
    openTasks,
  };
}
export type PilotPageData = Awaited<ReturnType<typeof getPilotPage>>;
