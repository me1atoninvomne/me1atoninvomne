/**
 * Read models for the UI. Server components call these directly; API routes reuse them.
 * Binary content (PDF bytes) is never included – it is served by a dedicated route.
 */
import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { findAgreedPrice, findArticle, findPurchaseOrder } from "@/domain/matching";
import { isoWeekMonday, isoWeekOf } from "@/domain/parse";
import { measureRoi, type ProcessedRecord } from "@/domain/roi";
import type { DocType, IssueCode, Severity } from "@/domain/types";
import { buildSteps } from "@/domain/workflows";
import { resolveProvider } from "@/server/ai";
import type { Session } from "@/server/auth/session";
import { getDb, schema } from "@/server/db/client";
import type { DocumentStatus } from "@/server/db/schema";
import { SIMULATION_POOL } from "@/server/demo/corpus";
import { notFound } from "@/server/errors";
import { todayIso } from "@/server/ids";
import { integrationCatalogue } from "@/server/integrations/registry";
import { listAudit, type AuditFilter } from "./audit";
import { approvalCheck } from "./review";

const docColumns = {
  id: schema.documents.id,
  emailId: schema.documents.emailId,
  fileName: schema.documents.fileName,
  docType: schema.documents.docType,
  status: schema.documents.status,
  route: schema.documents.route,
  issues: schema.documents.issues,
  routing: schema.documents.routing,
  partyName: schema.documents.partyName,
  partyNumber: schema.documents.partyNumber,
  documentNumber: schema.documents.documentNumber,
  netAmount: schema.documents.netAmount,
  grossAmount: schema.documents.grossAmount,
  priority: schema.documents.priority,
  department: schema.documents.department,
  dueAt: schema.documents.dueAt,
  assigneeId: schema.documents.assigneeId,
  requiredRole: schema.documents.requiredRole,
  createdAt: schema.documents.createdAt,
  processedAt: schema.documents.processedAt,
  decidedAt: schema.documents.decidedAt,
  decidedBy: schema.documents.decidedBy,
  exportRef: schema.documents.exportRef,
  reviewSeconds: schema.documents.reviewSeconds,
  workflowId: schema.documents.workflowId,
};

export type DocListItem = Awaited<ReturnType<typeof listDocuments>>[number];

async function listDocuments(workspaceId: string, statuses?: DocumentStatus[]) {
  const db = await getDb();
  const rows = await db
    .select(docColumns)
    .from(schema.documents)
    .where(statuses ? and(eq(schema.documents.workspaceId, workspaceId), inArray(schema.documents.status, statuses)) : eq(schema.documents.workspaceId, workspaceId))
    .orderBy(desc(schema.documents.createdAt));
  return rows.map((r) => ({
    ...r,
    confidence: r.routing?.confidence ?? null,
    critical: (r.issues ?? []).filter((i) => i.status === "open" && i.severity === "critical").length,
    warnings: (r.issues ?? []).filter((i) => i.status === "open" && i.severity === "warning").length,
    topIssue: (r.issues ?? []).filter((i) => i.status === "open" && i.severity !== "info").sort((a, b) => sevRank(a.severity) - sevRank(b.severity))[0] ?? null,
  }));
}

const sevRank = (s: Severity) => (s === "critical" ? 0 : s === "warning" ? 1 : 2);

/* ---------- Inbox ---------- */

export async function getInbox(s: Session) {
  const db = await getDb();
  const emails = await db.query.emails.findMany({ where: eq(schema.emails.workspaceId, s.workspace.id), orderBy: desc(schema.emails.receivedAt) });
  const docs = await listDocuments(s.workspace.id);
  return {
    emails: emails.map((e) => ({ ...e, documents: docs.filter((d) => d.emailId === e.id) })),
    simulationRemaining: Math.max(0, SIMULATION_POOL.length - s.workspace.simulationCursor),
  };
}
export type InboxData = Awaited<ReturnType<typeof getInbox>>;
export type InboxEmail = InboxData["emails"][number];

/* ---------- Document detail ---------- */

export async function getDocumentDetail(s: Session, documentId: string) {
  const db = await getDb();
  const doc = await db.query.documents.findFirst({ where: and(eq(schema.documents.id, documentId), eq(schema.documents.workspaceId, s.workspace.id)) });
  if (!doc) throw notFound("document");
  const email = await db.query.emails.findFirst({ where: eq(schema.emails.id, doc.emailId) });
  const master = await db.query.masterData.findFirst({ where: eq(schema.masterData.workspaceId, s.workspace.id) });
  const rules = await db.query.rules.findMany({ where: eq(schema.rules.workspaceId, s.workspace.id) });
  const workflow = doc.workflowId ? await db.query.workflows.findFirst({ where: eq(schema.workflows.id, doc.workflowId) }) : null;
  const timeline = await listAudit(db, s.workspace.id, { documentId: doc.id, limit: 200 });
  const emailEvents = email ? (await listAudit(db, s.workspace.id, { limit: 400 })).filter((e) => e.emailId === email.id && !e.documentId) : [];
  const erp = await db.query.erpRecords.findFirst({ where: eq(schema.erpRecords.documentId, doc.id) });
  const tasks = await db.query.tasks.findMany({ where: eq(schema.tasks.documentId, doc.id), orderBy: desc(schema.tasks.createdAt) });
  const siblings = email ? await db.select({ id: schema.documents.id, fileName: schema.documents.fileName }).from(schema.documents).where(eq(schema.documents.emailId, email.id)) : [];

  // Comparison data from master data: what the document was checked against.
  const x = doc.extraction;
  const m = master?.data;
  let comparison: {
    party: { number: string; name: string; address: string; iban?: string; phone?: string; paymentTerms?: string } | null;
    lines: { pos: string; articleNo: string | null; matchedArticle: string | null; description: string | null; expectedQty: number | null; expectedPrice: number | null; priceSource: string | null }[];
    reference: { number: string; date: string; requestedDate: string; status: string } | null;
  } = { party: null, lines: [], reference: null };
  if (x && m && x.docType !== "other") {
    const isCustomer = x.docType === "purchase_order" || x.docType === "rfq";
    const p = isCustomer ? m.customers.find((c) => c.number === doc.partyNumber) : m.suppliers.find((c) => c.number === doc.partyNumber);
    if (p) {
      comparison.party = {
        number: p.number,
        name: p.name,
        address: `${p.address.street}, ${p.address.zip} ${p.address.city}`,
        ...("iban" in p ? { iban: p.iban, phone: p.phone } : { paymentTerms: (p as { paymentTerms: string }).paymentTerms }),
      };
    }
    const po = !isCustomer ? findPurchaseOrder(m, x.fields.referenceNumber?.value) : null;
    if (po) comparison.reference = { number: po.number, date: po.date, requestedDate: po.confirmedDate ?? po.requestedDate, status: po.status };
    comparison.lines = x.lineItems.map((li) => {
      const art = findArticle(m, li.articleNo, isCustomer ? null : po?.supplierNumber ?? doc.partyNumber);
      if (!art) return { pos: li.pos, articleNo: li.articleNo, matchedArticle: null, description: null, expectedQty: null, expectedPrice: null, priceSource: null };
      if (isCustomer) {
        const agreed = doc.partyNumber ? findAgreedPrice(m, doc.partyNumber, art.number, x.fields.documentDate?.value ?? todayIso()) : null;
        return { pos: li.pos, articleNo: li.articleNo, matchedArticle: art.number, description: art.description, expectedQty: null, expectedPrice: agreed?.price ?? art.listPrice, priceSource: agreed ? "agreed" : "list" };
      }
      const line = po?.lines.find((l) => l.articleNo === art.number);
      return { pos: li.pos, articleNo: li.articleNo, matchedArticle: art.number, description: art.description, expectedQty: line?.quantity ?? null, expectedPrice: line?.unitPrice ?? null, priceSource: line ? "order" : null };
    });
  }
  const { file, ...rest } = doc;
  return {
    doc: { ...rest, hasFile: Boolean(file), fileSize: file ? file.length : 0 },
    email,
    siblings,
    workflow,
    ruleNames: Object.fromEntries(rules.map((r) => [r.id, r.name])),
    timeline: [...timeline].reverse(),
    emailEvents,
    erp,
    tasks,
    comparison,
    approval: await approvalCheck(s, doc),
    users: s.users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name, role: u.role, department: u.department, title: u.title })),
  };
}
export type DocumentDetail = Awaited<ReturnType<typeof getDocumentDetail>>;

export async function getDocumentFile(s: Session, documentId: string) {
  const db = await getDb();
  const doc = await db.query.documents.findFirst({
    where: and(eq(schema.documents.id, documentId), eq(schema.documents.workspaceId, s.workspace.id)),
    columns: { file: true, fileName: true, mimeType: true, contentDeletedAt: true },
  });
  if (!doc?.file) throw notFound("file");
  return doc;
}

/* ---------- Review queue & tasks ---------- */

export async function getReviewQueue(s: Session) {
  const docs = await listDocuments(s.workspace.id, ["needs_review", "needs_approval", "info_requested"]);
  const prio = { high: 0, normal: 1, low: 2 } as const;
  return docs.sort((a, b) => prio[a.priority ?? "normal"] - prio[b.priority ?? "normal"] || b.critical - a.critical || (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
}

export async function getTasks(s: Session) {
  const db = await getDb();
  const tasks = await db.query.tasks.findMany({ where: eq(schema.tasks.workspaceId, s.workspace.id), orderBy: [asc(schema.tasks.status), asc(schema.tasks.dueAt)] });
  const docs = await listDocuments(s.workspace.id);
  return tasks.map((t) => ({ ...t, document: docs.find((d) => d.id === t.documentId) ?? null }));
}
export type TaskItem = Awaited<ReturnType<typeof getTasks>>[number];

/* ---------- Notifications ---------- */

export async function getNotifications(s: Session) {
  const db = await getDb();
  const rows = await db.query.notifications.findMany({
    where: and(eq(schema.notifications.workspaceId, s.workspace.id), or(eq(schema.notifications.userId, s.user.id), and(isNull(schema.notifications.userId), eq(schema.notifications.department, s.user.department)))),
    orderBy: desc(schema.notifications.at),
    limit: 30,
  });
  const all = s.user.role === "manager" || s.user.role === "admin" || s.user.role === "viewer";
  const list = all
    ? await db.query.notifications.findMany({ where: eq(schema.notifications.workspaceId, s.workspace.id), orderBy: desc(schema.notifications.at), limit: 30 })
    : rows;
  return { items: list, unread: list.filter((n) => !n.read).length };
}

/* ---------- Metrics: dashboard, ROI, pilot ---------- */

function processedRecords(docs: DocListItem[]): ProcessedRecord[] {
  return docs
    .filter((d) => d.status !== "received" && d.status !== "error" && d.route)
    .map((d) => ({ docType: d.docType ?? "other", route: d.route!, handlingSeconds: d.reviewSeconds ?? null }));
}

export async function getMetrics(s: Session) {
  const db = await getDb();
  const docs = await listDocuments(s.workspace.id);
  const settings = s.workspace.settings;
  const records = processedRecords(docs);
  const live = measureRoi(records, {
    baselineMinutes: settings.roi.baselineMinutes,
    autoCheckMinutes: settings.roi.autoCheckMinutes,
    defaultReviewMinutes: settings.roi.defaultReviewMinutes,
    hourlyRate: settings.roi.hourlyRate,
  });
  const history = await db.query.metricWeeks.findMany({ where: eq(schema.metricWeeks.workspaceId, s.workspace.id), orderBy: asc(schema.metricWeeks.weekStart) });
  const { week, year } = isoWeekOf(todayIso());
  const currentWeek = {
    weekStart: isoWeekMonday(year, week),
    documents: live.documents,
    automated: live.automated,
    reviewed: live.humanHandled,
    hoursFreed: live.hoursFreed,
    synthetic: false,
  };
  const corrections = await db
    .select({ id: schema.auditEvents.id, action: schema.auditEvents.action })
    .from(schema.auditEvents)
    .where(and(eq(schema.auditEvents.workspaceId, s.workspace.id), inArray(schema.auditEvents.action, ["field.corrected", "lineitem.corrected"])));
  const extractedFields = docs.reduce((n, d) => n + (d.status !== "received" && d.docType !== "other" ? 1 : 0), 0);
  const byType: Record<string, { total: number; auto: number }> = {};
  for (const r of records) {
    if (r.route === "ignore") continue;
    byType[r.docType] ??= { total: 0, auto: 0 };
    byType[r.docType].total++;
    if (r.route === "auto") byType[r.docType].auto++;
  }
  const statusCounts: Partial<Record<DocumentStatus, number>> = {};
  for (const d of docs) statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;
  const decided = docs.filter((d) => d.reviewSeconds != null && d.reviewSeconds > 0);
  return {
    live,
    history: history.map((h) => ({ weekStart: h.weekStart, documents: h.documents, automated: h.automated, reviewed: h.reviewed, hoursFreed: h.hoursFreed, synthetic: h.synthetic, corrections: h.corrections, fieldsExtracted: h.fieldsExtracted })),
    currentWeek,
    byType,
    statusCounts,
    corrections: corrections.length,
    processedBusinessDocs: extractedFields,
    avgReviewSeconds: decided.length ? Math.round(decided.reduce((n, d) => n + (d.reviewSeconds ?? 0), 0) / decided.length) : null,
    settings: settings.roi,
    pending: docs.filter((d) => d.status === "received").length,
  };
}
export type Metrics = Awaited<ReturnType<typeof getMetrics>>;

/* ---------- Exception radar ---------- */

export type ExceptionCategory = "critical" | "overdue" | "delay" | "unprocessed" | "duplicate" | "approval" | "recurring";

export interface ExceptionItem {
  id: string;
  category: ExceptionCategory;
  severity: Severity;
  documentId?: string;
  docType?: DocType | null;
  party?: string | null;
  number?: string | null;
  issue?: { code: IssueCode; params: Record<string, string | number | null> };
  amountAtRisk?: number | null;
  dueAt?: string | null;
  taskTitle?: { de: string; en: string };
  email?: { subject: string; from: string; receivedAt: string; minutes: number };
  recurring?: { partyName: string; code: string; occurrences: number; outOf: number; weeks: number };
}

export async function getExceptions(s: Session): Promise<ExceptionItem[]> {
  const db = await getDb();
  const docs = await listDocuments(s.workspace.id);
  const open = docs.filter((d) => ["needs_review", "needs_approval", "info_requested"].includes(d.status));
  const out: ExceptionItem[] = [];
  for (const d of open) {
    for (const i of d.issues ?? []) {
      if (i.status !== "open") continue;
      const category: ExceptionCategory | null =
        i.code === "DUPLICATE_ORDER" || i.code === "DUPLICATE_INVOICE"
          ? "duplicate"
          : i.code === "DELIVERY_DELAY"
            ? "delay"
            : i.severity === "critical"
              ? "critical"
              : null;
      if (!category) continue;
      out.push({
        id: `${d.id}-${i.id}`,
        category,
        severity: i.severity,
        documentId: d.id,
        docType: d.docType as DocType,
        party: d.partyName,
        number: d.documentNumber,
        issue: { code: i.code, params: i.params },
        amountAtRisk: i.amountAtRisk ?? null,
        dueAt: d.dueAt,
      });
    }
    if (d.status === "needs_approval" && d.critical === 0) {
      out.push({ id: `${d.id}-approval`, category: "approval", severity: "info", documentId: d.id, docType: d.docType as DocType, party: d.partyName, number: d.documentNumber, amountAtRisk: d.netAmount, dueAt: d.dueAt });
    }
  }
  const now = new Date().toISOString();
  const tasks = await db.query.tasks.findMany({ where: and(eq(schema.tasks.workspaceId, s.workspace.id), eq(schema.tasks.status, "open")) });
  for (const t of tasks.filter((t) => t.dueAt && t.dueAt < now)) {
    out.push({ id: `task-${t.id}`, category: "overdue", severity: "warning", documentId: t.documentId ?? undefined, dueAt: t.dueAt, taskTitle: t.title });
  }
  const twoHoursAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  const pending = await db.query.emails.findMany({
    where: and(eq(schema.emails.workspaceId, s.workspace.id), inArray(schema.emails.status, ["new", "error"])),
    orderBy: asc(schema.emails.receivedAt),
  });
  for (const e of pending.filter((e) => e.receivedAt < twoHoursAgo || e.status === "error")) {
    out.push({
      id: `email-${e.id}`,
      category: "unprocessed",
      severity: e.status === "error" ? "critical" : "warning",
      email: { subject: e.subject, from: e.fromName, receivedAt: e.receivedAt, minutes: Math.round((Date.now() - Date.parse(e.receivedAt)) / 60000) },
    });
  }
  for (const r of s.workspace.settings.issueHistory ?? []) {
    out.push({ id: `rec-${r.partyName}-${r.code}`, category: "recurring", severity: "info", recurring: r });
  }
  const order: ExceptionCategory[] = ["critical", "duplicate", "delay", "overdue", "unprocessed", "approval", "recurring"];
  return out.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || sevRank(a.severity) - sevRank(b.severity) || (b.amountAtRisk ?? 0) - (a.amountAtRisk ?? 0));
}

/* ---------- Dashboard ---------- */

export async function getDashboard(s: Session) {
  const db = await getDb();
  const metrics = await getMetrics(s);
  const exceptions = await getExceptions(s);
  const recent = await listAudit(db, s.workspace.id, { limit: 12 });
  const queue = await getReviewQueue(s);
  const erpCount = (await db.query.erpRecords.findMany({ where: eq(schema.erpRecords.workspaceId, s.workspace.id), columns: { id: true } })).length;
  const decided = await db
    .select({ id: schema.documents.id })
    .from(schema.documents)
    .where(and(eq(schema.documents.workspaceId, s.workspace.id), inArray(schema.documents.status, ["approved", "exported", "rejected"]), gte(schema.documents.decidedAt, "2000")));
  const tour = {
    processed: metrics.pending === 0 && metrics.live.documents > 0,
    reviewed: decided.length > 0,
    exported: erpCount > 0,
    exceptionsSeen: true,
  };
  return { metrics, exceptions: exceptions.filter((e) => e.category !== "recurring"), recent, queue: queue.slice(0, 6), erpCount, tour };
}

/* ---------- Workflows, integrations, settings ---------- */

export async function getWorkflowsPage(s: Session) {
  const db = await getDb();
  const workflows = await db.query.workflows.findMany({ where: eq(schema.workflows.workspaceId, s.workspace.id) });
  const rules = await db.query.rules.findMany({ where: eq(schema.rules.workspaceId, s.workspace.id), orderBy: asc(schema.rules.position) });
  const docs = (await listDocuments(s.workspace.id)).filter((d) => d.docType && d.docType !== "other" && d.status !== "received");
  return {
    workflows: workflows.map((w) => ({ ...w, steps: buildSteps(w.params) })),
    rules,
    sampleDocs: docs.map((d) => ({ id: d.id, docType: d.docType as DocType, label: `${d.documentNumber ?? d.fileName ?? d.id} – ${d.partyName ?? ""}`, route: d.route, workflowId: d.workflowId })),
  };
}

export async function getIntegrationsPage(s: Session) {
  const db = await getDb();
  const provider = resolveProvider({ demo: s.workspace.isDemo });
  const erp = await db.query.erpRecords.findMany({ where: eq(schema.erpRecords.workspaceId, s.workspace.id), orderBy: desc(schema.erpRecords.createdAt) });
  return {
    catalogue: integrationCatalogue({ anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AI_PROVIDER === "anthropic" }),
    provider: { id: provider.active.id, label: provider.active.label, requested: provider.requested, fallbackReason: provider.fallbackReason, demoForced: s.workspace.isDemo },
    erp,
  };
}

export async function getAuditPage(s: Session, f: AuditFilter) {
  const db = await getDb();
  return listAudit(db, s.workspace.id, f);
}
