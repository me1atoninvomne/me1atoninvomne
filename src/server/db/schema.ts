/**
 * Database schema (SQLite / libSQL via Drizzle).
 *
 * Every business table is scoped by `workspace_id` (tenant). Demo workspaces are isolated per
 * visitor. JSON columns hold structured domain objects (extraction, issues, routing) that are
 * validated by the domain layer.
 */
import { blob, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Extraction, LocalizedText, MasterData, RoutingDecision, Rule, ValidationIssue, WorkflowParams } from "@/domain/types";
import type { RuleFacts } from "@/domain/rules";
import type { WorkspaceSettings } from "@/server/services/settings-types";

const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(true),
  /** Reference date for synthetic data (documents are generated relative to it). */
  baseDate: text("base_date").notNull(),
  settings: json<WorkspaceSettings>("settings").notNull(),
  simulationCursor: integer("simulation_cursor").notNull().default(0),
  createdAt: text("created_at").notNull(),
  lastActivityAt: text("last_activity_at").notNull(),
});

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").$type<"admin" | "manager" | "clerk" | "viewer">().notNull(),
    department: text("department").notNull(),
    title: json<LocalizedText>("title").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("users_ws").on(t.workspaceId)],
);

export const emails = sqliteTable(
  "emails",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    source: text("source").$type<"demo_mailbox" | "upload" | "simulation">().notNull(),
    demoKey: text("demo_key"),
    fromName: text("from_name").notNull(),
    fromEmail: text("from_email").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    receivedAt: text("received_at").notNull(),
    status: text("status").$type<"new" | "processing" | "processed" | "error">().notNull(),
    summary: json<LocalizedText | null>("summary"),
    nextAction: json<LocalizedText | null>("next_action"),
    priority: text("priority").$type<"high" | "normal" | "low">(),
    department: text("department"),
    processedAt: text("processed_at"),
    error: text("error"),
  },
  (t) => [index("emails_ws").on(t.workspaceId, t.receivedAt)],
);

export type DocumentStatus =
  | "received"
  | "auto_processed"
  | "needs_review"
  | "needs_approval"
  | "info_requested"
  | "approved"
  | "rejected"
  | "exported"
  | "ignored"
  | "error";

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    emailId: text("email_id").notNull(),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    file: blob("file", { mode: "buffer" }),
    textContent: text("text_content"),
    docType: text("doc_type"),
    status: text("status").$type<DocumentStatus>().notNull(),
    extraction: json<Extraction | null>("extraction"),
    issues: json<ValidationIssue[] | null>("issues"),
    routing: json<(Omit<RoutingDecision, "matchedRules"> & { matchedRules: string[] }) | null>("routing"),
    facts: json<RuleFacts | null>("facts"),
    route: text("route").$type<"auto" | "review" | "approval" | "ignore">(),
    requiredRole: text("required_role"),
    department: text("department"),
    priority: text("priority").$type<"high" | "normal" | "low">(),
    workflowId: text("workflow_id"),
    partyNumber: text("party_number"),
    partyName: text("party_name"),
    documentNumber: text("document_number"),
    netAmount: real("net_amount"),
    grossAmount: real("gross_amount"),
    assigneeId: text("assignee_id"),
    dueAt: text("due_at"),
    createdAt: text("created_at").notNull(),
    processedAt: text("processed_at"),
    decidedAt: text("decided_at"),
    decidedBy: text("decided_by"),
    reviewSeconds: integer("review_seconds"),
    exportRef: text("export_ref"),
    contentDeletedAt: text("content_deleted_at"),
  },
  (t) => [index("documents_ws").on(t.workspaceId, t.status), index("documents_email").on(t.emailId)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    documentId: text("document_id"),
    type: text("type").$type<"review" | "approval" | "quote" | "delay" | "info_request" | "follow_up">().notNull(),
    title: json<LocalizedText>("title").notNull(),
    assigneeId: text("assignee_id"),
    department: text("department").notNull(),
    status: text("status").$type<"open" | "done" | "cancelled">().notNull(),
    priority: text("priority").$type<"high" | "normal" | "low">().notNull(),
    dueAt: text("due_at"),
    note: text("note"),
    createdAt: text("created_at").notNull(),
    completedAt: text("completed_at"),
  },
  (t) => [index("tasks_ws").on(t.workspaceId, t.status)],
);

export const workflows = sqliteTable("workflows", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  key: text("key").notNull(),
  name: json<LocalizedText>("name").notNull(),
  description: json<LocalizedText>("description").notNull(),
  docTypes: json<string[]>("doc_types").notNull(),
  active: integer("active", { mode: "boolean" }).notNull(),
  params: json<WorkflowParams>("params").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by"),
});

export const rules = sqliteTable("rules", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  position: integer("position").notNull(),
  name: json<LocalizedText>("name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  docTypes: json<Rule["docTypes"]>("doc_types").notNull(),
  conditions: json<Rule["conditions"]>("conditions").notNull(),
  action: json<Rule["action"]>("action").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Append-only. There is no update or delete path in the application code. */
export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: text("workspace_id").notNull(),
    at: text("at").notNull(),
    actorType: text("actor_type").$type<"ai" | "user" | "system" | "integration">().notNull(),
    actorId: text("actor_id"),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    documentId: text("document_id"),
    emailId: text("email_id"),
    params: json<Record<string, unknown>>("params").notNull(),
  },
  (t) => [index("audit_ws").on(t.workspaceId, t.id), index("audit_doc").on(t.documentId)],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    at: text("at").notNull(),
    department: text("department"),
    userId: text("user_id"),
    documentId: text("document_id"),
    kind: text("kind").notNull(),
    params: json<Record<string, unknown>>("params").notNull(),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("notifications_ws").on(t.workspaceId, t.at)],
);

/** Demo ERP sandbox: records "transferred" to the target system. Nothing leaves the workspace. */
export const erpRecords = sqliteTable("erp_records", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  documentId: text("document_id").notNull(),
  connector: text("connector").notNull(),
  kind: text("kind").notNull(),
  externalRef: text("external_ref").notNull(),
  payload: json<Record<string, unknown>>("payload").notNull(),
  status: text("status").$type<"staged">().notNull(),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull(),
});

export const masterData = sqliteTable("master_data", {
  workspaceId: text("workspace_id").primaryKey(),
  data: json<MasterData>("data").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Weekly aggregates. `synthetic` rows are demo history and are always labelled as such. */
export const metricWeeks = sqliteTable("metric_weeks", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  weekStart: text("week_start").notNull(),
  documents: integer("documents").notNull(),
  automated: integer("automated").notNull(),
  reviewed: integer("reviewed").notNull(),
  hoursFreed: real("hours_freed").notNull(),
  corrections: integer("corrections").notNull().default(0),
  fieldsExtracted: integer("fields_extracted").notNull().default(0),
  synthetic: integer("synthetic", { mode: "boolean" }).notNull(),
});

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  employees: text("employees"),
  process: text("process"),
  message: text("message"),
  source: text("source"),
});
