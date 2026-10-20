/**
 * Demo workspace lifecycle: create, seed from an industry template, reset, switch template and
 * clean up expired demo workspaces. Every visitor gets an isolated workspace.
 */
import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { addDays, isoWeekMonday, isoWeekOf } from "@/domain/parse";
import { DEFAULT_INDUSTRY, INDUSTRY_TEMPLATES, type IndustryKey } from "@/domain/templates";
import { getDb, schema, type Db } from "@/server/db/client";
import { buildCorpus } from "@/server/demo/corpus";
import { buildMasterData, OWN_COMPANY } from "@/server/demo/master-data";
import { renderPdf } from "@/server/documents/pdf-render";
import { newId, nowIso, todayIso } from "@/server/ids";
import { audit, SYSTEM_ACTOR } from "./audit";
import { cleanupPrivacyData } from "./privacy";
import type { WorkspaceSettings } from "./settings-types";

const DEMO_TTL_HOURS = Number(process.env.DEMO_TTL_HOURS ?? 72);

const DEMO_USERS = [
  { key: "manager", name: "Thomas Wagner", role: "manager", department: "sales", title: { de: "Teamleitung Vertrieb Innendienst", en: "Team lead inside sales" } },
  { key: "clerk", name: "Julia Becker", role: "clerk", department: "sales", title: { de: "Sachbearbeitung Auftragsabwicklung", en: "Order processing clerk" } },
  { key: "purchasing", name: "Sabine Krüger", role: "clerk", department: "purchasing", title: { de: "Einkauf", en: "Purchasing" } },
  { key: "accounting", name: "Markus Lehmann", role: "clerk", department: "accounting", title: { de: "Kreditorenbuchhaltung", en: "Accounts payable" } },
  { key: "logistics", name: "Deniz Yılmaz", role: "clerk", department: "logistics", title: { de: "Disposition & Versand", en: "Dispatch & shipping" } },
  { key: "admin", name: "Andrea Schulz", role: "admin", department: "management", title: { de: "IT & Prozesse (Administratorin)", en: "IT & processes (administrator)" } },
  { key: "viewer", name: "Dr. Stefan Roth", role: "viewer", department: "management", title: { de: "Geschäftsführung (Lesezugriff)", en: "Managing director (read only)" } },
] as const;

const translit = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "");

const DOC_MIX: Record<string, number> = { purchase_order: 0.35, invoice: 0.25, order_confirmation: 0.15, delivery_note: 0.12, rfq: 0.06, delay_notice: 0.07 };

export function defaultSettings(industry: IndustryKey): WorkspaceSettings {
  const tpl = INDUSTRY_TEMPLATES[industry];
  return {
    companyName: OWN_COMPANY.name,
    fourEyes: true,
    retentionDays: 90,
    retentionScope: "files",
    roi: {
      hourlyRate: 48,
      baselineMinutes: { ...tpl.baselineMinutes },
      autoCheckMinutes: 0.5,
      defaultReviewMinutes: 3,
      platformMonthlyCost: 1290,
      implementationCost: 9000,
      confirmedMonthlySavings: 0,
    },
    issueHistory: [
      { partyName: "Nordlicht Fördertechnik GmbH & Co. KG", code: "PRICE_MISMATCH", occurrences: 4, outOf: 6, weeks: 8 },
      { partyName: "Kugellager Beispiel GmbH", code: "QTY_MISMATCH", occurrences: 3, outOf: 5, weeks: 8 },
      { partyName: "Alpenblick Verpackungssysteme AG", code: "MISSING_DELIVERY_DATE", occurrences: 5, outOf: 7, weeks: 8 },
      { partyName: "Stahlhandel Muster KG", code: "DELIVERY_DELAY", occurrences: 2, outOf: 4, weeks: 8 },
    ],
  };
}

export async function createDemoWorkspace(industry: IndustryKey = DEFAULT_INDUSTRY) {
  const db = await getDb();
  await cleanupExpiredWorkspaces(db);
  await cleanupPrivacyData(db);
  const id = newId("ws", 24);
  const now = nowIso();
  await db.insert(schema.workspaces).values({
    id,
    name: `${OWN_COMPANY.name} (Demo)`,
    industry,
    isDemo: true,
    baseDate: todayIso(),
    settings: defaultSettings(industry),
    simulationCursor: 0,
    createdAt: now,
    lastActivityAt: now,
  });
  const userIds = await seedUsers(db, id);
  await seedWorkspaceData(db, id, industry);
  return { workspaceId: id, defaultUserId: userIds.manager };
}

async function seedUsers(db: Db, workspaceId: string) {
  const ids: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const id = newId("usr");
    ids[u.key] = id;
    const [first, ...rest] = u.name.replace("Dr. ", "").split(" ");
    await db.insert(schema.users).values({
      id,
      workspaceId,
      name: u.name,
      email: `${translit(first)}.${translit(rest.join(""))}@muster-antriebstechnik.example`,
      role: u.role,
      department: u.department,
      title: u.title,
      active: true,
    });
  }
  return ids as Record<(typeof DEMO_USERS)[number]["key"], string>;
}

/** Seeds everything except users (kept across resets so the session stays valid). */
async function seedWorkspaceData(db: Db, workspaceId: string, industry: IndustryKey) {
  const tpl = INDUSTRY_TEMPLATES[industry];
  const today = todayIso();
  const now = Date.now();

  await db.insert(schema.masterData).values({ workspaceId, data: buildMasterData(today), updatedAt: nowIso() });

  for (const w of tpl.workflows) {
    await db.insert(schema.workflows).values({
      id: newId("wf"),
      workspaceId,
      key: w.key,
      name: w.name,
      description: w.description,
      docTypes: w.docTypes,
      active: true,
      params: w.params,
      version: 1,
      updatedAt: nowIso(),
      updatedBy: null,
    });
  }
  for (const [i, r] of tpl.rules.entries()) {
    await db.insert(schema.rules).values({
      id: `${r.id}_${newId("", 6).slice(1)}`,
      workspaceId,
      position: i,
      name: r.name,
      enabled: r.enabled,
      docTypes: r.docTypes,
      conditions: r.conditions,
      action: r.action,
      updatedAt: nowIso(),
    });
  }

  const corpus = buildCorpus(today);
  for (const key of tpl.emailKeys) {
    const e = corpus[key];
    if (!e) continue;
    await insertEmail(db, workspaceId, e, new Date(now - e.minutesAgo * 60_000).toISOString(), "demo_mailbox");
  }

  // Synthetic weekly history for the ROI dashboard (clearly labelled as synthetic in the UI).
  const { week, year } = isoWeekOf(today);
  const avgBaseline = Object.entries(DOC_MIX).reduce((s, [t, share]) => s + share * (tpl.baselineMinutes[t as keyof typeof tpl.baselineMinutes] ?? 8), 0);
  for (let i = 8; i >= 1; i--) {
    const weekStart = addDays(isoWeekMonday(year, week), -7 * i);
    const docs = Math.round(270 + ((i * 37) % 60) + (8 - i) * 6);
    const autoRate = 0.3 + (8 - i) * 0.035;
    const automated = Math.round(docs * autoRate);
    const reviewed = docs - automated;
    const hoursFreed = Math.round(((docs * avgBaseline - automated * 0.5 - reviewed * 3) / 60) * 10) / 10;
    const fieldsExtracted = docs * 11;
    await db.insert(schema.metricWeeks).values({
      id: newId("mw"),
      workspaceId,
      weekStart,
      documents: docs,
      automated,
      reviewed,
      hoursFreed,
      fieldsExtracted,
      corrections: Math.round(fieldsExtracted * (0.06 - (8 - i) * 0.004)),
      synthetic: true,
    });
  }

  // Two older open tasks (synthetic) so that overdue work is visible on the exception radar.
  const users = await db.query.users.findMany({ where: eq(schema.users.workspaceId, workspaceId) });
  const byDept = (dep: string) => users.find((u) => u.department === dep && u.role === "clerk")?.id ?? null;
  await db.insert(schema.tasks).values([
    {
      id: newId("tsk"),
      workspaceId,
      documentId: null,
      type: "follow_up",
      title: {
        de: "Kundenrückfrage beantworten: Liefertermin zu Auftrag A-2026-5521 (Beispiel Maschinenbau)",
        en: "Answer customer query: delivery date for order A-2026-5521 (Beispiel Maschinenbau)",
      },
      assigneeId: byDept("sales"),
      department: "sales",
      status: "open",
      priority: "normal",
      dueAt: new Date(now - 20 * 3600_000).toISOString(),
      note: "Synthetische Altaufgabe aus der Vorwoche",
      createdAt: new Date(now - 3 * 86400_000).toISOString(),
    },
    {
      id: newId("tsk"),
      workspaceId,
      documentId: null,
      type: "follow_up",
      title: {
        de: "Skontofrist läuft ab: Rechnung RE-KB-2026-1102 (Kugellager Beispiel)",
        en: "Discount period expiring: invoice RE-KB-2026-1102 (Kugellager Beispiel)",
      },
      assigneeId: byDept("accounting"),
      department: "accounting",
      status: "open",
      priority: "high",
      dueAt: new Date(now - 2 * 3600_000).toISOString(),
      note: "Synthetische Altaufgabe aus der Vorwoche",
      createdAt: new Date(now - 6 * 86400_000).toISOString(),
    },
  ]);

  await audit(db, {
    workspaceId,
    ...SYSTEM_ACTOR,
    action: "workspace.created",
    entityType: "workspace",
    entityId: workspaceId,
    params: { industry, industryLabel: tpl.name },
  });
}

export async function insertEmail(
  db: Db,
  workspaceId: string,
  e: { key?: string; fromName: string; fromEmail: string; subject: string; body: string; attachments: { fileName: string; spec: Parameters<typeof renderPdf>[0] }[] },
  receivedAt: string,
  source: "demo_mailbox" | "simulation",
) {
  const emailId = newId("eml");
  await db.insert(schema.emails).values({
    id: emailId,
    workspaceId,
    source,
    demoKey: e.key ?? null,
    fromName: e.fromName,
    fromEmail: e.fromEmail,
    subject: e.subject,
    body: e.body,
    receivedAt,
    status: "new",
  });
  if (e.attachments.length === 0) {
    await db.insert(schema.documents).values({ id: newId("doc"), workspaceId, emailId, fileName: null, mimeType: "text/plain", file: null, status: "received", createdAt: receivedAt });
  }
  for (const a of e.attachments) {
    const pdf = await renderPdf(a.spec);
    await db.insert(schema.documents).values({
      id: newId("doc"),
      workspaceId,
      emailId,
      fileName: a.fileName,
      mimeType: "application/pdf",
      file: Buffer.from(pdf),
      status: "received",
      createdAt: receivedAt,
    });
  }
  await audit(db, {
    workspaceId,
    actorType: "integration",
    actorId: source,
    actorName: source === "simulation" ? "Demo-Simulation" : "Demo-Postfach",
    action: "email.received",
    entityType: "email",
    entityId: emailId,
    emailId,
    params: { from: `${e.fromName} <${e.fromEmail}>`, subject: e.subject, attachments: e.attachments.length },
    at: receivedAt,
  });
  return emailId;
}

const WORKSPACE_TABLES = [
  schema.emails,
  schema.documents,
  schema.tasks,
  schema.workflows,
  schema.rules,
  schema.auditEvents,
  schema.notifications,
  schema.erpRecords,
  schema.masterData,
  schema.metricWeeks,
] as const;

async function clearWorkspaceData(db: Db, workspaceId: string) {
  for (const table of WORKSPACE_TABLES) {
    await db.delete(table).where(eq(table.workspaceId, workspaceId));
  }
}

export async function resetWorkspace(workspaceId: string, industry?: IndustryKey) {
  const db = await getDb();
  const ws = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, workspaceId) });
  if (!ws) throw new Error("workspace not found");
  const target = industry ?? (ws.industry as IndustryKey);
  await clearWorkspaceData(db, workspaceId);
  await db
    .update(schema.workspaces)
    .set({ industry: target, settings: defaultSettings(target), simulationCursor: 0, baseDate: todayIso(), lastActivityAt: nowIso() })
    .where(eq(schema.workspaces.id, workspaceId));
  await seedWorkspaceData(db, workspaceId, target);
  await audit(db, {
    workspaceId,
    ...SYSTEM_ACTOR,
    action: industry && industry !== ws.industry ? "workspace.industry_changed" : "workspace.reset",
    entityType: "workspace",
    entityId: workspaceId,
    params: { industryLabel: INDUSTRY_TEMPLATES[target].name },
  });
}

export async function cleanupExpiredWorkspaces(db: Db) {
  const cutoff = new Date(Date.now() - DEMO_TTL_HOURS * 3600_000).toISOString();
  const expired = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(and(eq(schema.workspaces.isDemo, true), lt(schema.workspaces.lastActivityAt, cutoff)));
  for (const { id } of expired) await deleteWorkspace(db, id);
  return expired.length;
}

/** Removes a workspace with every row that belongs to it (documents, files, logs, users …). */
export async function deleteWorkspace(db: Db, workspaceId: string) {
  await clearWorkspaceData(db, workspaceId);
  await db.delete(schema.users).where(eq(schema.users.workspaceId, workspaceId));
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));
}

export async function touchWorkspace(db: Db, workspaceId: string) {
  await db.update(schema.workspaces).set({ lastActivityAt: nowIso() }).where(eq(schema.workspaces.id, workspaceId));
}
