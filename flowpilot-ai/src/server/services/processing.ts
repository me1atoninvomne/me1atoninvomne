/**
 * Persisted processing: runs the analysis chain for an e-mail, stores the result, creates tasks
 * and notifications, transfers released documents to the (demo) ERP and writes the full activity
 * trail to the audit log.
 */
import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { documentNetAmount } from "@/domain/documents";
import { maxRole } from "@/domain/routing";
import type { DocType, Extraction, LocalizedText, Role, Rule, ValidationIssue, WorkflowParams } from "@/domain/types";
import { formatters } from "@/i18n/core";
import { dom, fieldLabel, issueText, reasonText } from "@/i18n/domain";
import { resolveProvider } from "@/server/ai";
import type { Session } from "@/server/auth/session";
import { getDb, schema, type Db } from "@/server/db/client";
import type { DocumentStatus } from "@/server/db/schema";
import { buildCorpus, SIMULATION_POOL } from "@/server/demo/corpus";
import { layoutToText } from "@/server/documents/text-layout";
import { AppError, notFound } from "@/server/errors";
import { newId, nowIso, todayIso } from "@/server/ids";
import { demoErpConnector, STAGE_KIND_LABEL, stageKindFor } from "@/server/integrations/demo-erp";
import { analyzeDocument, type AnalysisResult, type WorkflowLike } from "@/server/pipeline/analyze";
import { buildSummary } from "@/server/pipeline/summary";
import { AI_ACTOR, audit } from "./audit";
import { insertEmail, touchWorkspace } from "./workspace";

type DocRow = typeof schema.documents.$inferSelect;
type EmailRow = typeof schema.emails.$inferSelect;

const pair = (fn: (lang: "de" | "en") => string): LocalizedText => ({ de: fn("de"), en: fn("en") });
const pairList = (fn: (lang: "de" | "en") => string[]) => ({ de: fn("de"), en: fn("en") });

export interface ProcessContext {
  db: Db;
  workspaceId: string;
  workflows: (WorkflowLike & { row: typeof schema.workflows.$inferSelect })[];
  rules: Rule[];
  ruleName: (id: string, lang: "de" | "en") => string;
  users: (typeof schema.users.$inferSelect)[];
}

export async function loadProcessContext(db: Db, workspaceId: string): Promise<ProcessContext> {
  const wfRows = await db.query.workflows.findMany({ where: eq(schema.workflows.workspaceId, workspaceId) });
  const ruleRows = await db.query.rules.findMany({ where: eq(schema.rules.workspaceId, workspaceId), orderBy: asc(schema.rules.position) });
  const users = await db.query.users.findMany({ where: eq(schema.users.workspaceId, workspaceId) });
  const rules: Rule[] = ruleRows.map((r) => ({ id: r.id, name: r.name, enabled: r.enabled, docTypes: r.docTypes, conditions: r.conditions, action: r.action }));
  return {
    db,
    workspaceId,
    workflows: wfRows.map((w) => ({ id: w.id, docTypes: w.docTypes as DocType[], active: w.active, params: w.params, row: w })),
    rules,
    ruleName: (id, lang) => ruleRows.find((r) => r.id === id)?.name[lang] ?? id,
    users,
  };
}

async function knownDocuments(db: Db, workspaceId: string, excludeIds: string[]) {
  const rows = await db
    .select({ id: schema.documents.id, docType: schema.documents.docType, partyNumber: schema.documents.partyNumber, documentNumber: schema.documents.documentNumber, status: schema.documents.status })
    .from(schema.documents)
    .where(and(eq(schema.documents.workspaceId, workspaceId), ne(schema.documents.status, "received")));
  return rows
    .filter((r) => !excludeIds.includes(r.id) && r.docType && r.status !== "rejected" && r.status !== "ignored")
    .map((r) => ({ id: r.id, docType: r.docType as DocType, partyNumber: r.partyNumber, documentNumber: r.documentNumber }));
}

export async function processEmail(s: Session, emailId: string) {
  s.require("inbox.process");
  const db = await getDb();
  const email = await db.query.emails.findFirst({ where: and(eq(schema.emails.id, emailId), eq(schema.emails.workspaceId, s.workspace.id)) });
  if (!email) throw notFound("email");
  if (email.status === "processed") return { emailId, alreadyProcessed: true, documents: [] as ProcessedDocSummary[] };

  const t0 = performance.now();
  await db.update(schema.emails).set({ status: "processing", error: null }).where(eq(schema.emails.id, emailId));
  try {
    const ctx = await loadProcessContext(db, s.workspace.id);
    const docs = await db.query.documents.findMany({ where: eq(schema.documents.emailId, emailId) });
    const results: ProcessedDocSummary[] = [];
    for (const doc of docs) results.push(await processDocument(ctx, s, email, doc));

    const main = results.find((r) => r.route !== "ignore") ?? results[0];
    const priority = results.some((r) => r.priority === "high") ? "high" : main?.priority ?? "normal";
    await db
      .update(schema.emails)
      .set({
        status: "processed",
        processedAt: nowIso(),
        summary: main?.summary ?? null,
        nextAction: main?.nextAction ?? null,
        priority,
        department: main?.department ?? null,
      })
      .where(eq(schema.emails.id, emailId));
    await audit(db, {
      workspaceId: s.workspace.id,
      ...AI_ACTOR,
      action: "email.processed",
      entityType: "email",
      entityId: emailId,
      emailId,
      params: { documents: docs.length, durationMs: Math.round(performance.now() - t0) },
    });
    await touchWorkspace(db, s.workspace.id);
    return { emailId, alreadyProcessed: false, documents: results };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(schema.emails).set({ status: "error", error: message }).where(eq(schema.emails.id, emailId));
    await audit(db, { workspaceId: s.workspace.id, ...AI_ACTOR, action: "email.failed", entityType: "email", entityId: emailId, emailId, params: { error: message } });
    throw new AppError("processing_failed", 500, { message });
  }
}

export interface ProcessedDocSummary {
  documentId: string;
  docType: DocType;
  route: AnalysisResult["routing"]["route"];
  status: DocumentStatus;
  priority: "high" | "normal" | "low";
  department: string;
  issues: number;
  critical: number;
  trace: AnalysisResult["trace"];
  summary: LocalizedText;
  nextAction: LocalizedText;
  exportRef: string | null;
}

async function processDocument(ctx: ProcessContext, s: Session, email: EmailRow, doc: DocRow): Promise<ProcessedDocSummary> {
  const { db } = ctx;
  const master = await db.query.masterData.findFirst({ where: eq(schema.masterData.workspaceId, ctx.workspaceId) });
  if (!master) throw new Error("master data missing");
  const provider = resolveProvider({ demo: s.workspace.isDemo });
  const result = await analyzeDocument({
    pdf: doc.file ? new Uint8Array(doc.file) : null,
    bodyText: doc.file ? "" : `${email.body}`,
    fileName: doc.fileName,
    emailSubject: email.subject,
    emailFromName: email.fromName,
    emailReceivedAt: email.receivedAt,
    ownCompanyName: s.workspace.settings.companyName,
    ownVatId: "DE123456789",
    master: master.data,
    knownDocuments: await knownDocuments(db, ctx.workspaceId, [doc.id]),
    workflows: ctx.workflows,
    rules: ctx.rules,
    today: todayIso(),
    provider: provider.active,
  });
  await writeAnalysisAudit(ctx, doc, email.id, result, provider.active.label);
  const applied = await applyRouting(ctx, s, doc, result, { textContent: layoutToText(result.layout), humanInLoop: false });
  return {
    documentId: doc.id,
    docType: result.extraction.docType,
    route: result.routing.route,
    status: applied.status,
    priority: result.routing.priority,
    department: result.routing.department,
    issues: result.issues.filter((i) => i.severity !== "info").length,
    critical: result.issues.filter((i) => i.severity === "critical").length,
    trace: result.trace,
    summary: applied.summary,
    nextAction: applied.nextAction,
    exportRef: applied.exportRef,
  };
}

async function writeAnalysisAudit(ctx: ProcessContext, doc: DocRow, emailId: string, r: AnalysisResult, providerLabel: string) {
  const base = { workspaceId: ctx.workspaceId, ...AI_ACTOR, entityType: "document", entityId: doc.id, documentId: doc.id, emailId };
  const step = (name: string) => r.trace.find((t) => t.step === name)?.detail ?? {};
  const docType = r.extraction.docType;
  const missing = (step("extract").fieldsMissing as string[] | undefined) ?? [];
  await audit(ctx.db, { ...base, action: "document.text_extracted", params: { ...step("text"), fileName: doc.fileName } });
  await audit(ctx.db, { ...base, action: "document.classified", params: { ...step("classify"), providerLabel } });
  if (docType === "other") return;
  await audit(ctx.db, {
    ...base,
    action: "document.extracted",
    params: {
      fieldsFound: step("extract").fieldsFound,
      lineItems: step("extract").lineItems,
      missingLabels: pairList((l) => missing.map((k) => fieldLabel(dom(l), k as never, docType))),
    },
  });
  await audit(ctx.db, { ...base, action: "document.matched", params: step("match") });
  await audit(ctx.db, {
    ...base,
    action: "document.validated",
    params: {
      codes: r.issues.map((i) => i.code),
      titles: pairList((l) => r.issues.map((i) => issueText(i, dom(l), formatters(l), docType).title)),
    },
  });
  const matched = r.routing.ruleEvaluations.filter((e) => e.matched).map((e) => e.rule);
  await audit(ctx.db, {
    ...base,
    action: "rules.evaluated",
    params: { evaluated: r.routing.ruleEvaluations.length, matchedIds: matched.map((m) => m.id), matchedNames: pairList((l) => matched.map((m) => m.name[l])) },
  });
}

/** Persists an analysis result and performs the routing side effects. */
export async function applyRouting(
  ctx: ProcessContext,
  actor: Pick<Session, "user"> | null,
  doc: DocRow,
  r: Pick<AnalysisResult, "extraction" | "issues" | "routing" | "facts" | "party" | "workflowId">,
  opts: { textContent?: string; humanInLoop: boolean },
) {
  const { db } = ctx;
  const now = nowIso();
  const x = r.extraction;
  const workflow = ctx.workflows.find((w) => w.id === r.workflowId) ?? null;
  const params: WorkflowParams | null = workflow?.params ?? null;
  let route = r.routing.route;
  let requiredRole: Role | null = r.routing.requiredRole;
  let reasons = r.routing.reasons;
  // A document a human has already touched is never released silently: it needs a confirmation.
  if (opts.humanInLoop && route === "auto") {
    route = "approval";
    requiredRole = maxRole(requiredRole, "clerk");
    reasons = [...reasons.filter((x) => x.code !== "ALL_CHECKS_PASSED" && x.code !== "RULE_CONTINUE"), { code: "HUMAN_CORRECTED" }];
  }
  const partyName = r.party?.name ?? x.fields.partyName?.value ?? null;
  const net = documentNetAmount(x.fields, x.lineItems);
  const gross = x.fields.grossTotal?.value != null ? Number(x.fields.grossTotal.value) : null;
  const department = r.routing.department;
  const assignee = ctx.users.find((u) => u.department === department && u.role === "clerk") ?? ctx.users.find((u) => u.department === department);
  const dueAt = route === "review" || route === "approval" ? new Date(Date.now() + (params?.slaHours ?? 8) * 3600_000).toISOString() : null;

  let status: DocumentStatus =
    route === "auto" ? "auto_processed" : route === "review" ? "needs_review" : route === "approval" ? "needs_approval" : "ignored";

  // Automatic transfer only for auto-routed documents of workflows that target the ERP.
  let exportRef: string | null = null;
  if (route === "auto" && params?.targetSystem === "demo_erp" && stageKindFor(x.docType)) {
    const staged = await demoErpConnector.stage(db, {
      workspaceId: ctx.workspaceId,
      documentId: doc.id,
      fileName: doc.fileName,
      partyNumber: r.party?.number ?? null,
      extraction: x,
      createdBy: "FlowPilot AI",
      mode: "auto",
    });
    exportRef = staged.externalRef;
    status = "exported";
    await audit(db, {
      workspaceId: ctx.workspaceId,
      actorType: "integration",
      actorId: demoErpConnector.id,
      actorName: demoErpConnector.label.de,
      action: "erp.staged",
      entityType: "document",
      entityId: doc.id,
      documentId: doc.id,
      emailId: doc.emailId,
      params: { connectorLabel: demoErpConnector.label, kindLabel: STAGE_KIND_LABEL[staged.kind], externalRef: staged.externalRef, mode: "auto" },
    });
  }

  const summary = buildSummary({ extraction: x, issues: r.issues, routing: { ...r.routing, route }, partyName, autoTransferred: exportRef != null });
  const { ruleEvaluations: _omit, ...routingStored } = r.routing as typeof r.routing & { ruleEvaluations?: unknown };
  void _omit;

  await db
    .update(schema.documents)
    .set({
      docType: x.docType,
      status,
      extraction: x,
      issues: r.issues,
      routing: { ...routingStored, route, requiredRole, reasons },
      facts: r.facts,
      route,
      requiredRole,
      department,
      priority: r.routing.priority,
      workflowId: r.workflowId,
      partyNumber: r.party?.number ?? null,
      partyName,
      documentNumber: x.fields.documentNumber?.value ?? null,
      netAmount: net,
      grossAmount: gross,
      assigneeId: route === "review" || route === "approval" ? assignee?.id ?? null : null,
      dueAt,
      processedAt: doc.processedAt ?? now,
      exportRef: exportRef ?? doc.exportRef,
      ...(opts.textContent != null ? { textContent: opts.textContent } : {}),
    })
    .where(eq(schema.documents.id, doc.id));

  const reasonTexts = pairList((l) =>
    reasons
      .filter((x) => x.code !== "RULE_CONTINUE" || route === "auto")
      .map((reason) => reasonText(reason, dom(l), formatters(l), (id) => ctx.ruleName(id, l))),
  );
  await audit(db, {
    workspaceId: ctx.workspaceId,
    ...(opts.humanInLoop ? { actorType: "system" as const, actorId: "routing", actorName: "FlowPilot AI" } : AI_ACTOR),
    action: "document.routed",
    entityType: "document",
    entityId: doc.id,
    documentId: doc.id,
    emailId: doc.emailId,
    params: { route, department, requiredRole, reasons: reasons.map((x) => x.code), reasonTexts, confidence: Math.round(r.routing.confidence * 100) },
  });

  // Tasks: close previous open tasks of this document, open a new one if a human is needed.
  await db
    .update(schema.tasks)
    .set({ status: "done", completedAt: now })
    .where(and(eq(schema.tasks.documentId, doc.id), eq(schema.tasks.status, "open")));
  if (route === "review" || route === "approval") {
    const type = x.docType === "delay_notice" ? "delay" : x.docType === "rfq" ? "quote" : route === "review" ? "review" : "approval";
    const title = pair((l) => {
      const d = dom(l);
      const ref = x.fields.documentNumber?.value ?? x.fields.referenceNumber?.value ?? doc.fileName ?? "";
      return [`${d.taskType[type]}: ${d.docType[x.docType]} ${ref}`.trim(), partyName].filter(Boolean).join(" – ");
    });
    await db.insert(schema.tasks).values({
      id: newId("tsk"),
      workspaceId: ctx.workspaceId,
      documentId: doc.id,
      type,
      title,
      assigneeId: assignee?.id ?? null,
      department,
      status: "open",
      priority: r.routing.priority,
      dueAt,
      createdAt: now,
    });
    await audit(db, {
      workspaceId: ctx.workspaceId,
      ...AI_ACTOR,
      action: "task.created",
      entityType: "task",
      documentId: doc.id,
      emailId: doc.emailId,
      params: { type, department, dueAt, assignee: assignee?.name ?? null },
    });
  }

  // Notifications (in-app only).
  const base = { docType: x.docType, number: x.fields.documentNumber?.value ?? x.fields.referenceNumber?.value ?? null, party: partyName };
  const topIssue = [...r.issues].filter((i) => i.status === "open" && i.severity !== "info").sort((a, b) => (a.severity === "critical" ? -1 : b.severity === "critical" ? 1 : 0))[0];
  const notes: { department: string; kind: string; params: Record<string, unknown> }[] = [];
  if (!opts.humanInLoop) {
    if (route === "auto") notes.push({ department, kind: "auto_processed", params: base });
    if (route === "review")
      notes.push({ department, kind: "review_needed", params: { ...base, topIssue: topIssue ? pair((l) => issueText(topIssue, dom(l), formatters(l), x.docType).title) : null } });
    if (route === "approval") notes.push({ department, kind: "approval_needed", params: base });
    const delay = r.issues.find((i) => i.code === "DELIVERY_DELAY");
    for (const dep of r.routing.notify) {
      if (delay) notes.push({ department: dep, kind: "delay_alert", params: { reference: delay.params.reference, days: delay.params.days, affectedOrders: delay.params.affectedOrders } });
      else {
        const rule = ctx.rules.find((rl) => r.routing.matchedRules.includes(rl.id) && rl.action.type === "notify" && rl.action.department === dep);
        notes.push({ department: dep, kind: "rule_notify", params: { ...base, rule: rule ? rule.name : { de: "Workflow", en: "Workflow" } } });
      }
    }
  }
  for (const n of notes) {
    await db.insert(schema.notifications).values({ id: newId("ntf"), workspaceId: ctx.workspaceId, at: now, department: n.department, documentId: doc.id, kind: n.kind, params: n.params });
    await audit(db, {
      workspaceId: ctx.workspaceId,
      ...AI_ACTOR,
      action: "notification.sent",
      entityType: "notification",
      documentId: doc.id,
      emailId: doc.emailId,
      params: { department: n.department, kind: n.kind, channel: "in_app" },
    });
  }

  return { status, exportRef, summary: summary.summary, nextAction: summary.nextAction };
}

/* ---------- Simulation & upload ---------- */

export async function simulateIncomingEmail(s: Session) {
  s.require("inbox.process");
  const db = await getDb();
  const cursor = s.workspace.simulationCursor;
  if (cursor >= SIMULATION_POOL.length) throw new AppError("simulation_exhausted", 409);
  const corpus = buildCorpus(todayIso());
  const e = corpus[SIMULATION_POOL[cursor]];
  const emailId = await insertEmail(db, s.workspace.id, e, nowIso(), "simulation");
  await db.update(schema.workspaces).set({ simulationCursor: cursor + 1 }).where(eq(schema.workspaces.id, s.workspace.id));
  await audit(db, {
    workspaceId: s.workspace.id,
    actorType: "user",
    actorId: s.user.id,
    actorName: s.user.name,
    action: "simulation.email_injected",
    entityType: "email",
    entityId: emailId,
    emailId,
    params: { subject: e.subject },
  });
  return { emailId, remaining: SIMULATION_POOL.length - cursor - 1 };
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function uploadDocument(s: Session, file: { name: string; type: string; bytes: Uint8Array }) {
  s.require("inbox.process");
  if (file.bytes.length === 0) throw new AppError("upload_empty");
  if (file.bytes.length > MAX_UPLOAD_BYTES) throw new AppError("upload_too_large", 413, { maxMb: MAX_UPLOAD_BYTES / 1024 / 1024 });
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const header = new TextDecoder().decode(file.bytes.slice(0, 5));
  if (!isPdf || header !== "%PDF-") throw new AppError("upload_not_pdf");
  const db = await getDb();
  const now = nowIso();
  const emailId = newId("eml");
  const safeName = file.name.replace(/[^\w.\-äöüÄÖÜß ]+/g, "_").slice(0, 120);
  await db.insert(schema.emails).values({
    id: emailId,
    workspaceId: s.workspace.id,
    source: "upload",
    fromName: s.user.name,
    fromEmail: s.user.email,
    subject: `Upload: ${safeName}`,
    body: "",
    receivedAt: now,
    status: "new",
  });
  const documentId = newId("doc");
  await db.insert(schema.documents).values({
    id: documentId,
    workspaceId: s.workspace.id,
    emailId,
    fileName: safeName,
    mimeType: "application/pdf",
    file: Buffer.from(file.bytes),
    status: "received",
    createdAt: now,
  });
  await audit(db, {
    workspaceId: s.workspace.id,
    actorType: "user",
    actorId: s.user.id,
    actorName: s.user.name,
    action: "upload.received",
    entityType: "document",
    entityId: documentId,
    documentId,
    emailId,
    params: { fileName: safeName, sizeKb: Math.round(file.bytes.length / 1024) },
  });
  return { emailId, documentId };
}

export async function pendingEmailIds(workspaceId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.emails.id })
    .from(schema.emails)
    .where(and(eq(schema.emails.workspaceId, workspaceId), inArray(schema.emails.status, ["new", "error"])))
    .orderBy(asc(schema.emails.receivedAt));
  return rows.map((r) => r.id);
}

export type { ValidationIssue, Extraction };
