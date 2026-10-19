/**
 * Human-in-the-loop: corrections, decisions on findings, approval, rejection, queries and
 * hand-over. All guardrails are enforced server-side – the UI only reflects them.
 */
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { FIELD_KIND, SENSITIVE_FIELDS } from "@/domain/documents";
import { isValidIban, normalizeIban } from "@/domain/parse";
import { can } from "@/domain/permissions";
import { roleAtLeast } from "@/domain/routing";
import { FIELD_KEYS, type Extraction, type FieldKey, type LineItem, type Role, type ValidationIssue } from "@/domain/types";
import { formatters } from "@/i18n/core";
import { dom, fieldLabel, issueText } from "@/i18n/domain";
import type { Session } from "@/server/auth/session";
import { getDb, schema } from "@/server/db/client";
import { AppError, forbidden, notFound } from "@/server/errors";
import { newId, nowIso, todayIso } from "@/server/ids";
import { demoErpConnector, STAGE_KIND_LABEL, stageKindFor } from "@/server/integrations/demo-erp";
import { analyzeDocument } from "@/server/pipeline/analyze";
import { demoRulesProvider } from "@/server/ai/demo-provider";
import { audit } from "./audit";
import { applyRouting, loadProcessContext } from "./processing";
import { touchWorkspace } from "./workspace";

const EDITABLE = ["needs_review", "needs_approval", "info_requested"] as const;
const pair = <T>(fn: (l: "de" | "en") => T) => ({ de: fn("de"), en: fn("en") });

async function loadDoc(s: Session, documentId: string) {
  const db = await getDb();
  const doc = await db.query.documents.findFirst({ where: and(eq(schema.documents.id, documentId), eq(schema.documents.workspaceId, s.workspace.id)) });
  if (!doc) throw notFound("document");
  return { db, doc };
}

const userActor = (s: Session) => ({ actorType: "user" as const, actorId: s.user.id, actorName: s.user.name });

/* ---------- Field corrections ---------- */

export const UpdateSchema = z.object({
  fields: z.partialRecord(z.enum(FIELD_KEYS), z.string().max(300).nullable()).optional(),
  confirm: z.array(z.enum(FIELD_KEYS)).optional(),
  lineItems: z
    .array(
      z.object({
        index: z.number().int().min(0).max(500),
        field: z.enum(["articleNo", "description", "quantity", "unit", "unitPrice", "total"]),
        value: z.string().max(200).nullable(),
      }),
    )
    .optional(),
});

function normalizeFieldValue(key: FieldKey, raw: string | null): string | null {
  if (raw == null || raw.trim() === "") return null;
  const v = raw.trim();
  switch (FIELD_KIND[key]) {
    case "date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new AppError("invalid_value", 400, { field: key });
      return v;
    case "money":
    case "percent":
    case "number": {
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) throw new AppError("invalid_value", 400, { field: key });
      return FIELD_KIND[key] === "money" ? n.toFixed(2) : String(n);
    }
    case "iban": {
      const iban = normalizeIban(v);
      if (!iban || !isValidIban(iban)) throw new AppError("invalid_iban", 400, { field: key });
      return iban;
    }
    default:
      return v;
  }
}

export async function updateDocument(s: Session, documentId: string, input: z.infer<typeof UpdateSchema>) {
  s.require("documents.edit");
  const { db, doc } = await loadDoc(s, documentId);
  if (!EDITABLE.includes(doc.status as (typeof EDITABLE)[number]) || !doc.extraction) throw new AppError("not_editable", 409);
  const x: Extraction = structuredClone(doc.extraction);
  const docType = x.docType;
  const base = { workspaceId: s.workspace.id, ...userActor(s), entityType: "document", entityId: doc.id, documentId: doc.id, emailId: doc.emailId };
  let changes = 0;

  for (const [key, raw] of Object.entries(input.fields ?? {}) as [FieldKey, string | null][]) {
    const value = normalizeFieldValue(key, raw);
    const prev = x.fields[key];
    if ((prev?.value ?? null) === value) continue;
    x.fields[key] = {
      key,
      value,
      confidence: value == null ? 0 : 1,
      source: prev?.source ?? null,
      status: value == null ? "missing" : "corrected",
      originalValue: prev?.originalValue !== undefined ? prev.originalValue : prev?.value ?? null,
    };
    changes++;
    await audit(db, { ...base, action: "field.corrected", params: { field: key, label: pair((l) => fieldLabel(dom(l), key, docType)), from: prev?.value ?? "—", to: value ?? "—" } });
  }
  for (const key of input.confirm ?? []) {
    const f = x.fields[key];
    if (!f || f.value == null || f.status !== "extracted") continue;
    x.fields[key] = { ...f, status: "confirmed", confidence: 1 };
    changes++;
    await audit(db, { ...base, action: "field.confirmed", params: { field: key, label: pair((l) => fieldLabel(dom(l), key, docType)), value: f.value } });
  }
  for (const c of input.lineItems ?? []) {
    const li = x.lineItems[c.index];
    if (!li) throw new AppError("invalid_value", 400, { field: `line ${c.index}` });
    const numeric = c.field === "quantity" || c.field === "unitPrice" || c.field === "total";
    let value: string | number | null = c.value == null || c.value.trim() === "" ? null : c.value.trim();
    if (numeric && value != null) {
      const n = Number(String(value).replace(",", "."));
      if (!Number.isFinite(n) || n < 0) throw new AppError("invalid_value", 400, { field: c.field });
      value = n;
    }
    const prev = li[c.field];
    if (prev === value) continue;
    (li as unknown as Record<string, unknown>)[c.field] = value;
    li.corrected = true;
    li.confidence = 1;
    changes++;
    await audit(db, {
      ...base,
      action: "lineitem.corrected",
      params: { pos: li.pos, field: c.field, label: pair((l) => dom(l).lineItem[c.field as keyof LineItem & keyof ReturnType<typeof dom>["lineItem"]]), from: prev ?? "—", to: value ?? "—" },
    });
  }
  if (changes === 0) return { changed: 0 };
  await revalidate(s, doc.id, x, doc.issues ?? []);
  return { changed: changes };
}

/** Re-runs validation and routing on the corrected extraction, keeping human decisions. */
async function revalidate(s: Session, documentId: string, extraction: Extraction, previousIssues: ValidationIssue[]) {
  const db = await getDb();
  const doc = await db.query.documents.findFirst({ where: eq(schema.documents.id, documentId) });
  if (!doc) throw notFound("document");
  const ctx = await loadProcessContext(db, s.workspace.id);
  const master = await db.query.masterData.findFirst({ where: eq(schema.masterData.workspaceId, s.workspace.id) });
  const email = await db.query.emails.findFirst({ where: eq(schema.emails.id, doc.emailId) });
  const others = await db.query.documents.findMany({ where: and(eq(schema.documents.workspaceId, s.workspace.id)) });
  const result = await analyzeDocument({
    pdf: null,
    bodyText: "",
    fileName: doc.fileName,
    emailSubject: email?.subject ?? "",
    emailFromName: email?.fromName ?? "",
    emailReceivedAt: email?.receivedAt ?? nowIso(),
    ownCompanyName: s.workspace.settings.companyName,
    master: master!.data,
    knownDocuments: others
      .filter((o) => o.id !== doc.id && o.docType && !["received", "rejected", "ignored"].includes(o.status))
      .map((o) => ({ id: o.id, docType: o.docType as Extraction["docType"], partyNumber: o.partyNumber, documentNumber: o.documentNumber })),
    workflows: ctx.workflows,
    rules: ctx.rules,
    today: todayIso(),
    provider: demoRulesProvider,
    previousIssues,
    existingExtraction: extraction,
  });
  await applyRouting(ctx, s, doc, result, { humanInLoop: true });
  await audit(db, {
    workspaceId: s.workspace.id,
    actorType: "system",
    actorId: "validation",
    actorName: "FlowPilot AI",
    action: "document.revalidated",
    entityType: "document",
    entityId: doc.id,
    documentId: doc.id,
    emailId: doc.emailId,
    params: { open: result.issues.filter((i) => i.status === "open" && i.blocking).length },
  });
  await touchWorkspace(db, s.workspace.id);
  return result;
}

/* ---------- Findings ---------- */

export const IssueDecisionSchema = z.object({
  action: z.enum(["accept", "resolve", "reopen"]),
  note: z.string().max(500).optional(),
});

export async function decideIssue(s: Session, documentId: string, issueId: string, input: z.infer<typeof IssueDecisionSchema>) {
  s.require("documents.edit");
  const { db, doc } = await loadDoc(s, documentId);
  if (!EDITABLE.includes(doc.status as (typeof EDITABLE)[number]) || !doc.extraction || !doc.issues) throw new AppError("not_editable", 409);
  const issues = structuredClone(doc.issues);
  const issue = issues.find((i) => i.id === issueId);
  if (!issue) throw notFound("issue");
  if (issue.severity === "critical" && input.action === "accept") s.require("documents.accept_critical");
  const note = (input.note ?? "").trim();
  if (input.action === "accept" && note.length < 5) throw new AppError("note_required", 400);
  issue.status = input.action === "accept" ? "accepted" : input.action === "resolve" ? "resolved" : "open";
  issue.resolution = input.action === "reopen" ? null : { by: s.user.name, at: nowIso(), note };
  const docType = doc.extraction.docType;
  await audit(db, {
    workspaceId: s.workspace.id,
    ...userActor(s),
    action: input.action === "accept" ? "issue.accepted" : input.action === "resolve" ? "issue.resolved" : "issue.reopened",
    entityType: "document",
    entityId: doc.id,
    documentId: doc.id,
    emailId: doc.emailId,
    params: { code: issue.code, severity: issue.severity, note, title: pair((l) => issueText(issue, dom(l), formatters(l), docType).title) },
  });
  await revalidate(s, doc.id, doc.extraction, issues);
}

/* ---------- Decisions ---------- */

export const DecisionSchema = z.object({
  decision: z.enum(["approve", "reject", "request_info", "handover"]),
  note: z.string().max(1000).optional(),
  assigneeId: z.string().max(64).optional(),
  reviewSeconds: z.number().int().min(0).max(36000).optional(),
});

export interface ApprovalCheck {
  allowed: boolean;
  reasons: { code: string; params?: Record<string, string | number> }[];
}

/** Explains whether the current user may approve – used by the UI and enforced on approve. */
export async function approvalCheck(s: Session, doc: typeof schema.documents.$inferSelect): Promise<ApprovalCheck> {
  const reasons: ApprovalCheck["reasons"] = [];
  if (!EDITABLE.includes(doc.status as (typeof EDITABLE)[number])) reasons.push({ code: "status" });
  const role = s.user.role as Role;
  if (!can(role, "documents.approve")) reasons.push({ code: "permission" });
  const openBlocking = (doc.issues ?? []).filter((i) => i.status === "open" && i.blocking);
  if (openBlocking.length > 0) reasons.push({ code: "open_blocking_issues", params: { count: openBlocking.length } });
  const required = (doc.requiredRole as Role | null) ?? "clerk";
  if (!roleAtLeast(role, required) || (required === "manager" && !can(role, "documents.approve_over_limit"))) {
    reasons.push({ code: "role_required", params: { role: required } });
  }
  if (doc.docType === "invoice" && !can(role, "documents.approve_financial")) reasons.push({ code: "financial_permission" });
  if (doc.docType === "invoice" && s.workspace.settings.fourEyes) {
    const db = await getDb();
    const corrections = await db
      .select({ params: schema.auditEvents.params })
      .from(schema.auditEvents)
      .where(and(eq(schema.auditEvents.documentId, doc.id), eq(schema.auditEvents.actorId, s.user.id), inArray(schema.auditEvents.action, ["field.corrected"])));
    if (corrections.some((c) => SENSITIVE_FIELDS.includes(c.params.field as FieldKey))) reasons.push({ code: "four_eyes" });
    const acceptedCritical = (doc.issues ?? []).some((i) => i.status === "accepted" && i.severity === "critical" && i.resolution?.by === s.user.name);
    if (acceptedCritical) reasons.push({ code: "four_eyes_critical" });
  }
  return { allowed: reasons.length === 0, reasons };
}

export async function decide(s: Session, documentId: string, input: z.infer<typeof DecisionSchema>) {
  const { db, doc } = await loadDoc(s, documentId);
  if (!doc.extraction) throw new AppError("not_editable", 409);
  const x = doc.extraction;
  const now = nowIso();
  const base = { workspaceId: s.workspace.id, ...userActor(s), entityType: "document", entityId: doc.id, documentId: doc.id, emailId: doc.emailId };
  const reviewSeconds = input.reviewSeconds != null ? Math.min(input.reviewSeconds, 3600) : null;
  const note = input.note?.trim() || null;

  switch (input.decision) {
    case "approve": {
      const check = await approvalCheck(s, doc);
      if (!check.allowed) {
        await audit(db, { ...base, action: "document.approval_denied", params: { reason: check.reasons.map((r) => r.code).join(", ") } });
        const first = check.reasons[0];
        if (first.code === "permission" || first.code === "role_required" || first.code === "financial_permission") throw forbidden(first.code);
        throw new AppError(first.code, 409, first.params ?? {});
      }
      await db
        .update(schema.documents)
        .set({ status: "approved", decidedAt: now, decidedBy: s.user.name, reviewSeconds: (doc.reviewSeconds ?? 0) + (reviewSeconds ?? 0) || null })
        .where(eq(schema.documents.id, doc.id));
      await closeTasks(doc.id, "done");
      await audit(db, { ...base, action: "document.approved", params: { note, reviewSeconds } });
      await notify(s, doc.department ?? "sales", doc.id, "approved", { docType: x.docType, number: x.fields.documentNumber?.value ?? null, by: s.user.name });

      const workflow = doc.workflowId ? await db.query.workflows.findFirst({ where: eq(schema.workflows.id, doc.workflowId) }) : null;
      const kind = stageKindFor(x.docType);
      if (workflow?.params.targetSystem === "demo_erp" && kind) {
        const staged = await demoErpConnector.stage(db, {
          workspaceId: s.workspace.id,
          documentId: doc.id,
          fileName: doc.fileName,
          partyNumber: doc.partyNumber,
          extraction: x,
          createdBy: s.user.name,
          mode: "approved",
        });
        await db.update(schema.documents).set({ status: "exported", exportRef: staged.externalRef }).where(eq(schema.documents.id, doc.id));
        await audit(db, {
          ...base,
          actorType: "integration",
          actorId: demoErpConnector.id,
          actorName: demoErpConnector.label.de,
          action: "erp.staged",
          params: { connectorLabel: demoErpConnector.label, kindLabel: STAGE_KIND_LABEL[staged.kind], externalRef: staged.externalRef, mode: "approved", approvedBy: s.user.name },
        });
        await notify(s, doc.department ?? "sales", doc.id, "erp_staged", { externalRef: staged.externalRef });
        await touchWorkspace(db, s.workspace.id);
        return { status: "exported" as const, exportRef: staged.externalRef };
      }
      await touchWorkspace(db, s.workspace.id);
      return { status: "approved" as const, exportRef: null };
    }
    case "reject": {
      s.require("documents.reject");
      if (!EDITABLE.includes(doc.status as (typeof EDITABLE)[number])) throw new AppError("not_editable", 409);
      if (!note || note.length < 5) throw new AppError("note_required", 400);
      await db
        .update(schema.documents)
        .set({ status: "rejected", decidedAt: now, decidedBy: s.user.name, reviewSeconds: (doc.reviewSeconds ?? 0) + (reviewSeconds ?? 0) || null })
        .where(eq(schema.documents.id, doc.id));
      await closeTasks(doc.id, "cancelled");
      await audit(db, { ...base, action: "document.rejected", params: { note, reviewSeconds } });
      return { status: "rejected" as const, exportRef: null };
    }
    case "request_info": {
      s.require("documents.edit");
      if (!EDITABLE.includes(doc.status as (typeof EDITABLE)[number])) throw new AppError("not_editable", 409);
      const email = await db.query.emails.findFirst({ where: eq(schema.emails.id, doc.emailId) });
      const draft = buildQueryDraft(doc.issues ?? [], x, s.user.name, s.workspace.settings.companyName, note);
      await db
        .update(schema.documents)
        .set({ status: "info_requested", reviewSeconds: (doc.reviewSeconds ?? 0) + (reviewSeconds ?? 0) || null })
        .where(eq(schema.documents.id, doc.id));
      await closeTasks(doc.id, "done");
      await db.insert(schema.tasks).values({
        id: newId("tsk"),
        workspaceId: s.workspace.id,
        documentId: doc.id,
        type: "info_request",
        title: pair((l) => `${dom(l).taskType.info_request}: ${dom(l).docType[x.docType]} ${x.fields.documentNumber?.value ?? ""} – ${doc.partyName ?? ""}`),
        assigneeId: s.user.id,
        department: doc.department ?? "sales",
        status: "open",
        priority: doc.priority ?? "normal",
        dueAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
        note: draft.body,
        createdAt: now,
      });
      await audit(db, { ...base, action: "document.info_requested", params: { to: email?.source === "upload" ? "—" : email?.fromEmail ?? "—", subject: draft.subject, draft: draft.body } });
      return { status: "info_requested" as const, exportRef: null, draft: { ...draft, to: email?.source === "upload" ? null : email?.fromEmail ?? null } };
    }
    case "handover": {
      s.require("documents.handover");
      const target = s.users.find((u) => u.id === input.assigneeId && u.active);
      if (!target) throw new AppError("invalid_assignee", 400);
      if (!can(target.role as Role, "documents.edit")) throw new AppError("assignee_cannot_edit", 400);
      await db.update(schema.documents).set({ assigneeId: target.id }).where(eq(schema.documents.id, doc.id));
      await db
        .update(schema.tasks)
        .set({ assigneeId: target.id, department: target.department })
        .where(and(eq(schema.tasks.documentId, doc.id), eq(schema.tasks.status, "open")));
      await audit(db, { ...base, action: "document.handed_over", params: { toId: target.id, toName: target.name, note } });
      await db.insert(schema.notifications).values({
        id: newId("ntf"),
        workspaceId: s.workspace.id,
        at: now,
        department: target.department,
        userId: target.id,
        documentId: doc.id,
        kind: "handed_over",
        params: { by: s.user.name, docType: x.docType, number: x.fields.documentNumber?.value ?? null },
      });
      return { status: doc.status, exportRef: null };
    }
  }
}

async function closeTasks(documentId: string, status: "done" | "cancelled") {
  const db = await getDb();
  await db
    .update(schema.tasks)
    .set({ status, completedAt: nowIso() })
    .where(and(eq(schema.tasks.documentId, documentId), eq(schema.tasks.status, "open")));
}

async function notify(s: Session, department: string, documentId: string, kind: string, params: Record<string, unknown>) {
  const db = await getDb();
  await db.insert(schema.notifications).values({ id: newId("ntf"), workspaceId: s.workspace.id, at: nowIso(), department, documentId, kind, params });
}

/** Draft reply to the sender. It is never sent automatically. Bank-detail findings are excluded on purpose. */
export function buildQueryDraft(issues: ValidationIssue[], x: Extraction, userName: string, company: string, note: string | null) {
  const d = dom("de");
  const f = formatters("de");
  const docLabel = d.docType[x.docType];
  const number = x.fields.documentNumber?.value ?? "";
  const points: string[] = [];
  for (const i of issues.filter((i) => i.status === "open" && i.severity !== "info")) {
    const p = i.params;
    switch (i.code) {
      case "MISSING_DELIVERY_DATE":
        points.push("den gewünschten Liefertermin");
        break;
      case "MISSING_REQUIRED_FIELD":
        points.push(`folgende Angabe: ${fieldLabel(d, p.field as FieldKey, x.docType)}`);
        break;
      case "PRICE_MISMATCH":
        points.push(`eine Bestätigung des Preises für Position ${p.pos} (${p.articleNo}): angegeben sind ${f.money(Number(p.documentPrice))}, vereinbart sind ${f.money(Number(p.expectedPrice))}`);
        break;
      case "QTY_MISMATCH":
        points.push(`einen Liefertermin für die Restmenge zu Position ${p.pos} (${f.number(Number(p.ordered) - Number(p.document))} Einheiten)`);
        break;
      case "DATE_SHIFT":
        points.push(`ob eine Lieferung vor dem ${f.date(String(p.confirmed))} möglich ist`);
        break;
      case "SUM_MISMATCH":
        points.push(`eine korrigierte Fassung – die Summe der Positionen (${f.money(Number(p.computed))}) weicht vom ausgewiesenen Betrag (${f.money(Number(p.stated))}) ab`);
        break;
      case "UNKNOWN_PARTY":
        points.push("Ihre vollständigen Firmendaten (Rechnungsanschrift, USt-IdNr., Ansprechpartner) zur Anlage im System");
        break;
      case "IBAN_CHANGED":
      case "IBAN_INVALID":
        break; // never clarify bank details by replying to the same e-mail
      default:
        points.push(issueText(i, d, f, x.docType).recommendation);
    }
  }
  const subject = `Rückfrage zu Ihrer ${docLabel}${number ? ` ${number}` : ""}`;
  const body = [
    "Sehr geehrte Damen und Herren,",
    "",
    `vielen Dank für Ihre ${docLabel}${number ? ` ${number}` : ""}. Für die weitere Bearbeitung benötigen wir noch:`,
    "",
    ...(points.length ? points.map((p) => `• ${p}`) : ["• (bitte ergänzen)"]),
    ...(note ? ["", note] : []),
    "",
    "Vielen Dank und freundliche Grüße",
    userName,
    company,
  ].join("\n");
  return { subject, body, excludedBankFinding: issues.some((i) => i.code === "IBAN_CHANGED" && i.status === "open") };
}
