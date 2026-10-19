/**
 * Configuration owned by managers and admins: workflows (automation policy), no-code rules,
 * workspace settings, user roles and data retention.
 */
import "server-only";
import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { CONDITION_FIELDS, DEPARTMENTS, DOC_TYPES, ROLES, type Role, type Rule } from "@/domain/types";
import { buildSteps, simulatePath } from "@/domain/workflows";
import { analyzeDocument } from "@/server/pipeline/analyze";
import { demoRulesProvider } from "@/server/ai/demo-provider";
import type { Session } from "@/server/auth/session";
import { getDb, schema } from "@/server/db/client";
import { AppError, notFound } from "@/server/errors";
import { newId, nowIso, todayIso } from "@/server/ids";
import { audit } from "./audit";
import { loadProcessContext } from "./processing";
import { RoiAssumptionsSchema } from "./settings-types";

const userActor = (s: Session) => ({ actorType: "user" as const, actorId: s.user.id, actorName: s.user.name });

/* ---------- Workflows ---------- */

export const WorkflowParamsSchema = z.object({
  autoProcess: z.boolean(),
  minConfidence: z.number().min(0.5).max(1),
  maxAutoAmount: z.number().min(0).max(10_000_000).nullable(),
  approvalLimit: z.number().min(0).max(10_000_000).nullable(),
  reviewDepartment: z.enum(DEPARTMENTS),
  notifyDepartment: z.enum(DEPARTMENTS).nullable(),
  slaHours: z.number().int().min(1).max(720),
  targetSystem: z.enum(["demo_erp", "none"]),
});

export const WorkflowUpdateSchema = z.object({ params: WorkflowParamsSchema.partial().optional(), active: z.boolean().optional() });

export async function updateWorkflow(s: Session, workflowId: string, input: z.infer<typeof WorkflowUpdateSchema>) {
  s.require("workflows.edit");
  const db = await getDb();
  const wf = await db.query.workflows.findFirst({ where: and(eq(schema.workflows.id, workflowId), eq(schema.workflows.workspaceId, s.workspace.id)) });
  if (!wf) throw notFound("workflow");
  const next = { ...wf.params, ...(input.params ?? {}) };
  // Financial documents can never be released automatically – the setting is locked.
  if (wf.docTypes.includes("invoice") && next.autoProcess) throw new AppError("financial_auto_locked", 400);
  const changes = (Object.keys(next) as (keyof typeof next)[])
    .filter((k) => JSON.stringify(next[k]) !== JSON.stringify(wf.params[k]))
    .map((k) => `${k}: ${fmtVal(wf.params[k])} → ${fmtVal(next[k])}`);
  const activeChanged = input.active !== undefined && input.active !== wf.active;
  if (changes.length === 0 && !activeChanged) return wf;
  const version = wf.version + (changes.length > 0 ? 1 : 0);
  await db
    .update(schema.workflows)
    .set({ params: next, active: input.active ?? wf.active, version, updatedAt: nowIso(), updatedBy: s.user.name })
    .where(eq(schema.workflows.id, wf.id));
  if (changes.length > 0)
    await audit(db, { workspaceId: s.workspace.id, ...userActor(s), action: "workflow.updated", entityType: "workflow", entityId: wf.id, params: { name: wf.name, version, changes } });
  if (activeChanged)
    await audit(db, { workspaceId: s.workspace.id, ...userActor(s), action: "workflow.toggled", entityType: "workflow", entityId: wf.id, params: { name: wf.name, active: input.active } });
  return { ...wf, params: next, version };
}

const fmtVal = (v: unknown) => (v == null ? "—" : typeof v === "number" && v <= 1 && v > 0 ? `${Math.round(v * 100)} %` : String(v));

/** Dry run: how would the current workflow and rules route an already processed document? */
export async function simulateWorkflow(s: Session, workflowId: string, documentId: string, overrides?: Partial<z.infer<typeof WorkflowParamsSchema>>) {
  const db = await getDb();
  const wf = await db.query.workflows.findFirst({ where: and(eq(schema.workflows.id, workflowId), eq(schema.workflows.workspaceId, s.workspace.id)) });
  const doc = await db.query.documents.findFirst({ where: and(eq(schema.documents.id, documentId), eq(schema.documents.workspaceId, s.workspace.id)) });
  if (!wf || !doc?.extraction) throw notFound("document");
  const ctx = await loadProcessContext(db, s.workspace.id);
  const master = await db.query.masterData.findFirst({ where: eq(schema.masterData.workspaceId, s.workspace.id) });
  const params = { ...wf.params, ...(overrides ?? {}) };
  const result = await analyzeDocument({
    pdf: null,
    bodyText: "",
    fileName: doc.fileName,
    emailSubject: "",
    emailFromName: "",
    emailReceivedAt: doc.createdAt,
    ownCompanyName: s.workspace.settings.companyName,
    master: master!.data,
    knownDocuments: [],
    workflows: [{ id: wf.id, docTypes: wf.docTypes as never, active: true, params }],
    rules: ctx.rules,
    today: todayIso(),
    provider: demoRulesProvider,
    previousIssues: doc.issues ?? [],
    existingExtraction: doc.extraction,
  });
  const def = { key: wf.key, docTypes: wf.docTypes as never, params, steps: buildSteps(params) };
  return {
    route: result.routing.route,
    reasons: result.routing.reasons,
    requiredRole: result.routing.requiredRole,
    path: simulatePath(def, result.routing.route),
    ruleEvaluations: result.routing.ruleEvaluations.map((e) => ({ id: e.rule.id, matched: e.matched, conditions: e.conditions })),
    note: "simulation_only",
  };
}

/* ---------- Rules ---------- */

export const RuleInputSchema = z.object({
  name: z.object({ de: z.string().min(3).max(140), en: z.string().max(140).optional() }),
  enabled: z.boolean(),
  docTypes: z.union([z.literal("all"), z.array(z.enum(DOC_TYPES)).min(1)]),
  conditions: z
    .array(z.object({ field: z.enum(CONDITION_FIELDS), op: z.enum(["is_true", "is_false", "gt", "gte", "lt", "lte"]), value: z.number().nullable().optional() }))
    .max(6),
  action: z.object({
    type: z.enum(["continue", "require_approval", "route_review", "notify", "set_priority"]),
    role: z.enum(ROLES).optional(),
    department: z.enum(DEPARTMENTS).optional(),
    priority: z.enum(["high", "normal", "low"]).optional(),
  }),
});

function validateRule(input: z.infer<typeof RuleInputSchema>) {
  for (const c of input.conditions) {
    const numeric = !["is_true", "is_false"].includes(c.op);
    if (numeric && (c.value == null || !Number.isFinite(c.value))) throw new AppError("rule_value_required", 400);
    const booleanField = ["partyKnown", "allRequiredFields", "noOpenIssues", "hasCriticalIssue"].includes(c.field);
    if (booleanField === numeric) throw new AppError("rule_operator_mismatch", 400);
  }
  const a = input.action;
  if ((a.type === "notify" || a.type === "route_review") && !a.department) throw new AppError("rule_department_required", 400);
  if (a.type === "require_approval" && !a.role) throw new AppError("rule_role_required", 400);
  if (a.type === "set_priority" && !a.priority) throw new AppError("rule_priority_required", 400);
  // "continue" without conditions would bypass nothing (guardrails still apply), but is meaningless – require at least one.
  if (a.type === "continue" && input.conditions.length === 0) throw new AppError("rule_conditions_required", 400);
}

export async function createRule(s: Session, input: z.infer<typeof RuleInputSchema>) {
  s.require("rules.edit");
  validateRule(input);
  const db = await getDb();
  const existing = await db.query.rules.findMany({ where: eq(schema.rules.workspaceId, s.workspace.id) });
  const id = newId("rule");
  const name = { de: input.name.de, en: input.name.en || input.name.de };
  await db.insert(schema.rules).values({
    id,
    workspaceId: s.workspace.id,
    position: existing.length,
    name,
    enabled: input.enabled,
    docTypes: input.docTypes,
    conditions: input.conditions,
    action: input.action,
    updatedAt: nowIso(),
  });
  await audit(db, { workspaceId: s.workspace.id, ...userActor(s), action: "rule.created", entityType: "rule", entityId: id, params: { name } });
  return { id };
}

export async function updateRule(s: Session, ruleId: string, input: Partial<z.infer<typeof RuleInputSchema>>) {
  s.require("rules.edit");
  const db = await getDb();
  const rule = await db.query.rules.findFirst({ where: and(eq(schema.rules.id, ruleId), eq(schema.rules.workspaceId, s.workspace.id)) });
  if (!rule) throw notFound("rule");
  const merged = {
    name: input.name ? { de: input.name.de, en: input.name.en || input.name.de } : rule.name,
    enabled: input.enabled ?? rule.enabled,
    docTypes: input.docTypes ?? rule.docTypes,
    conditions: input.conditions ?? rule.conditions,
    action: input.action ?? rule.action,
  };
  validateRule(merged as z.infer<typeof RuleInputSchema>);
  await db.update(schema.rules).set({ ...merged, updatedAt: nowIso() }).where(eq(schema.rules.id, rule.id));
  const onlyToggle = Object.keys(input).length === 1 && input.enabled !== undefined;
  await audit(db, {
    workspaceId: s.workspace.id,
    ...userActor(s),
    action: onlyToggle ? "rule.toggled" : "rule.updated",
    entityType: "rule",
    entityId: rule.id,
    params: { name: merged.name, enabled: merged.enabled },
  });
}

export async function deleteRule(s: Session, ruleId: string) {
  s.require("rules.edit");
  const db = await getDb();
  const rule = await db.query.rules.findFirst({ where: and(eq(schema.rules.id, ruleId), eq(schema.rules.workspaceId, s.workspace.id)) });
  if (!rule) throw notFound("rule");
  await db.delete(schema.rules).where(eq(schema.rules.id, rule.id));
  await audit(db, { workspaceId: s.workspace.id, ...userActor(s), action: "rule.deleted", entityType: "rule", entityId: rule.id, params: { name: rule.name } });
}

export async function listRules(workspaceId: string): Promise<Rule[]> {
  const db = await getDb();
  const rows = await db.query.rules.findMany({ where: eq(schema.rules.workspaceId, workspaceId), orderBy: asc(schema.rules.position) });
  return rows.map((r) => ({ id: r.id, name: r.name, enabled: r.enabled, docTypes: r.docTypes, conditions: r.conditions, action: r.action }));
}

/* ---------- Settings ---------- */

export const SettingsUpdateSchema = z.object({
  section: z.enum(["general", "roi", "privacy"]),
  companyName: z.string().min(2).max(120).optional(),
  fourEyes: z.boolean().optional(),
  retentionDays: z.number().int().min(7).max(3650).optional(),
  retentionScope: z.enum(["files", "files_and_text"]).optional(),
  roi: RoiAssumptionsSchema.partial().optional(),
});

const SECTION_LABEL = {
  general: { de: "Allgemein & Kontrolle", en: "General & control" },
  roi: { de: "ROI-Annahmen", en: "ROI assumptions" },
  privacy: { de: "Datenschutz & Aufbewahrung", en: "Privacy & retention" },
};

export async function updateSettings(s: Session, input: z.infer<typeof SettingsUpdateSchema>) {
  s.require("settings.edit");
  if (input.section === "privacy") s.require("retention.apply");
  const db = await getDb();
  const current = s.workspace.settings;
  const next = {
    ...current,
    ...(input.companyName ? { companyName: input.companyName } : {}),
    ...(input.fourEyes !== undefined ? { fourEyes: input.fourEyes } : {}),
    ...(input.retentionDays ? { retentionDays: input.retentionDays } : {}),
    ...(input.retentionScope ? { retentionScope: input.retentionScope } : {}),
    roi: { ...current.roi, ...(input.roi ?? {}), baselineMinutes: { ...current.roi.baselineMinutes, ...(input.roi?.baselineMinutes ?? {}) } },
  };
  await db.update(schema.workspaces).set({ settings: next, lastActivityAt: nowIso() }).where(eq(schema.workspaces.id, s.workspace.id));
  await audit(db, { workspaceId: s.workspace.id, ...userActor(s), action: "settings.updated", entityType: "workspace", entityId: s.workspace.id, params: { section: input.section, sectionLabel: SECTION_LABEL[input.section] } });
  return next;
}

export async function changeUserRole(s: Session, userId: string, role: Role) {
  s.require("users.manage");
  const db = await getDb();
  const target = s.users.find((u) => u.id === userId);
  if (!target) throw notFound("user");
  if (target.id === s.user.id && role !== "admin") throw new AppError("cannot_demote_self", 400);
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, target.id));
  await audit(db, { workspaceId: s.workspace.id, ...userActor(s), action: "user.role_changed", entityType: "user", entityId: target.id, params: { name: target.name, from: target.role, to: role } });
}

/** Deletes source files (and optionally text) of finished documents older than the retention period. */
export async function applyRetention(s: Session, opts: { dryRun: boolean; days?: number }) {
  s.require("retention.apply");
  const db = await getDb();
  const days = opts.days ?? s.workspace.settings.retentionDays;
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
  const finalStates = ["approved", "rejected", "exported", "ignored", "auto_processed"] as const;
  const candidates = await db
    .select({ id: schema.documents.id, contentDeletedAt: schema.documents.contentDeletedAt })
    .from(schema.documents)
    .where(and(eq(schema.documents.workspaceId, s.workspace.id), lt(schema.documents.createdAt, cutoff), inArray(schema.documents.status, [...finalStates])));
  const affected = candidates.filter((c) => !c.contentDeletedAt);
  if (!opts.dryRun && affected.length > 0) {
    const scope = s.workspace.settings.retentionScope;
    for (const c of affected) {
      await db
        .update(schema.documents)
        .set({ file: null, contentDeletedAt: nowIso(), ...(scope === "files_and_text" ? { textContent: null } : {}) })
        .where(eq(schema.documents.id, c.id));
    }
  }
  if (!opts.dryRun)
    await audit(db, { workspaceId: s.workspace.id, ...userActor(s), action: "retention.applied", entityType: "workspace", entityId: s.workspace.id, params: { count: affected.length, days } });
  return { count: affected.length, days, dryRun: opts.dryRun };
}

/* ---------- Tasks ---------- */

export async function completeTask(s: Session, taskId: string, status: "done" | "open") {
  s.require("tasks.manage");
  const db = await getDb();
  const task = await db.query.tasks.findFirst({ where: and(eq(schema.tasks.id, taskId), eq(schema.tasks.workspaceId, s.workspace.id)) });
  if (!task) throw notFound("task");
  // Document-bound tasks are completed by the document decision, not manually.
  if (task.documentId) throw new AppError("task_bound_to_document", 409);
  await db.update(schema.tasks).set({ status, completedAt: status === "done" ? nowIso() : null }).where(eq(schema.tasks.id, task.id));
  if (status === "done")
    await audit(db, { workspaceId: s.workspace.id, ...userActor(s), action: "task.completed", entityType: "task", entityId: task.id, params: { title: task.title } });
}
