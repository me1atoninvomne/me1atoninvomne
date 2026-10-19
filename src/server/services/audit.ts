import "server-only";
import { and, desc, eq, like, lt, or, type SQL } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { schema } from "@/server/db/client";
import { nowIso } from "@/server/ids";

export type AuditActorType = "ai" | "user" | "system" | "integration";

export interface AuditInput {
  workspaceId: string;
  actorType: AuditActorType;
  actorId?: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  documentId?: string | null;
  emailId?: string | null;
  params?: Record<string, unknown>;
  at?: string;
}

/** Append-only audit log. Every state change in the application writes an event. */
export async function audit(db: Db, e: AuditInput) {
  await db.insert(schema.auditEvents).values({
    workspaceId: e.workspaceId,
    at: e.at ?? nowIso(),
    actorType: e.actorType,
    actorId: e.actorId ?? null,
    actorName: e.actorName,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId ?? null,
    documentId: e.documentId ?? null,
    emailId: e.emailId ?? null,
    params: e.params ?? {},
  });
}

export const AI_ACTOR = { actorType: "ai" as const, actorId: "flowpilot", actorName: "FlowPilot AI" };
export const SYSTEM_ACTOR = { actorType: "system" as const, actorId: "system", actorName: "System" };

export interface AuditFilter {
  documentId?: string;
  actorType?: AuditActorType;
  search?: string;
  before?: number;
  limit?: number;
}

export async function listAudit(db: Db, workspaceId: string, f: AuditFilter = {}) {
  const where: SQL[] = [eq(schema.auditEvents.workspaceId, workspaceId)];
  if (f.documentId) where.push(eq(schema.auditEvents.documentId, f.documentId));
  if (f.actorType) where.push(eq(schema.auditEvents.actorType, f.actorType));
  if (f.before) where.push(lt(schema.auditEvents.id, f.before));
  if (f.search) {
    const q = `%${f.search.replace(/[%_]/g, "")}%`;
    where.push(or(like(schema.auditEvents.action, q), like(schema.auditEvents.actorName, q), like(schema.auditEvents.params, q))!);
  }
  return db
    .select()
    .from(schema.auditEvents)
    .where(and(...where))
    .orderBy(desc(schema.auditEvents.id))
    .limit(Math.min(f.limit ?? 200, 1000));
}
