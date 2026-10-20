/**
 * Consent records, contact requests and data-subject rights.
 *
 * - Every consent decision is stored with the exact wording and version shown (proof, Art. 7(1)).
 * - Contact requests get a personal secret link; only its SHA-256 hash is stored.
 * - Withdrawal and deletion via that link take effect immediately; requests without the link are
 *   recorded with the one-month deadline (Art. 12(3)) for the operator.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray, lt } from "drizzle-orm";
import type { Lang } from "@/i18n/core";
import { legalDict } from "@/i18n/ui/legal";
import { CONSENT_RECORD_RETENTION_DAYS, LEAD_RETENTION_DAYS, PRIVACY_REQUEST_RETENTION_DAYS } from "@/legal/context";
import { LEGAL_VERSIONS } from "@/legal/versions";
import { getDb, schema, type Db } from "@/server/db/client";
import { newId, nowIso } from "@/server/ids";


export type ConsentPurpose = "comfort_storage" | "age_b2b" | "processing" | "marketing_email" | "phone_callback";
export type ConsentSource = "banner" | "contact_form" | "demo_start" | "privacy_center" | "unsubscribe" | "privacy_request";

export const PRIVACY_REQUEST_TYPES = ["access", "rectification", "erasure", "restriction", "portability", "objection", "withdraw"] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

/** The wording that was shown for a purpose – stored verbatim with each record. */
export function consentText(purpose: ConsentPurpose, lang: Lang, source?: ConsentSource): string {
  const c = legalDict[lang].consents;
  const b = legalDict[lang].banner;
  switch (purpose) {
    case "comfort_storage":
      return `${b.title}: ${b.text} | ${b.comfortTitle}: ${b.comfortText}`;
    case "age_b2b":
      return source === "demo_start" ? c.demoAge : c.b2bContact;
    case "processing":
      return c.processing;
    case "marketing_email":
      return c.marketingEmail;
    case "phone_callback":
      return c.phoneCallback;
  }
}

export async function recordConsent(
  db: Db,
  r: { subjectType: "cookie" | "lead" | "demo"; subjectId: string; purpose: ConsentPurpose; granted: boolean; lang: Lang; source: ConsentSource; text?: string },
) {
  await db.insert(schema.consentRecords).values({
    id: newId("cr"),
    subjectType: r.subjectType,
    subjectId: r.subjectId,
    createdAt: nowIso(),
    purpose: r.purpose,
    granted: r.granted,
    version: LEGAL_VERSIONS.consent,
    text: r.text ?? consentText(r.purpose, r.lang, r.source),
    lang: r.lang,
    source: r.source,
  });
}

/* ---------- Contact requests ---------- */

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export interface LeadInput {
  name: string;
  company: string;
  email: string;
  phone?: string;
  employees?: string;
  process?: string;
  message?: string;
  marketingEmail: boolean;
  phoneCallback: boolean;
}

/** Stores a contact request with its consents and returns the personal access token (shown once). */
export async function createLead(input: LeadInput, lang: Lang) {
  const db = await getDb();
  await cleanupPrivacyData(db);
  const id = newId("lead");
  const token = randomBytes(24).toString("base64url");
  const phoneCallback = input.phoneCallback && Boolean(input.phone);
  await db.insert(schema.leads).values({
    id,
    createdAt: nowIso(),
    name: input.name,
    company: input.company,
    email: input.email.toLowerCase(),
    phone: input.phone ?? null,
    employees: input.employees ?? null,
    process: input.process ?? null,
    message: input.message ?? null,
    source: "website",
    consentVersion: LEGAL_VERSIONS.consent,
    b2bConfirmed: true,
    marketingEmail: input.marketingEmail,
    phoneCallback,
    accessToken: hashToken(token),
  });
  const decisions: [ConsentPurpose, boolean][] = [
    ["age_b2b", true],
    ["processing", true],
    ["marketing_email", input.marketingEmail],
    ["phone_callback", phoneCallback],
  ];
  for (const [purpose, granted] of decisions) {
    await recordConsent(db, { subjectType: "lead", subjectId: id, purpose, granted, lang, source: "contact_form" });
  }
  return { id, token };
}

async function leadByToken(db: Db, token: string) {
  if (!token || token.length < 20 || token.length > 100) return null;
  return (await db.query.leads.findFirst({ where: eq(schema.leads.accessToken, hashToken(token)) })) ?? null;
}

/** Everything stored about a contact request (Art. 15 access / Art. 20 portability). */
export async function exportLead(token: string) {
  const db = await getDb();
  const lead = await leadByToken(db, token);
  if (!lead) return null;
  const consents = await db.query.consentRecords.findMany({
    where: and(eq(schema.consentRecords.subjectType, "lead"), eq(schema.consentRecords.subjectId, lead.id)),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  const { accessToken: _hidden, ...data } = lead;
  return {
    lead: data,
    consents: consents.map(({ purpose, granted, createdAt, version, text, lang, source }) => ({ purpose, granted, createdAt, version, text, lang, source })),
  };
}

export async function withdrawLeadConsent(token: string, purpose: "marketing_email" | "phone_callback", lang: Lang, source: ConsentSource) {
  const db = await getDb();
  const lead = await leadByToken(db, token);
  if (!lead) return false;
  // Idempotent: a repeated click (or a mail client's one-click POST) records nothing new.
  if (!(purpose === "marketing_email" ? lead.marketingEmail : lead.phoneCallback)) return true;
  if (purpose === "marketing_email") {
    await db.update(schema.leads).set({ marketingEmail: false, unsubscribedAt: nowIso() }).where(eq(schema.leads.id, lead.id));
  } else {
    await db.update(schema.leads).set({ phoneCallback: false }).where(eq(schema.leads.id, lead.id));
  }
  await recordConsent(db, { subjectType: "lead", subjectId: lead.id, purpose, granted: false, lang, source });
  return true;
}

/** Withdraws marketing consent for every request with this address. Same answer whether or not one exists. */
export async function unsubscribeEmail(email: string, lang: Lang) {
  const db = await getDb();
  const leads = await db.query.leads.findMany({ where: and(eq(schema.leads.email, email.trim().toLowerCase()), eq(schema.leads.marketingEmail, true)) });
  for (const lead of leads) {
    await db.update(schema.leads).set({ marketingEmail: false, unsubscribedAt: nowIso() }).where(eq(schema.leads.id, lead.id));
    await recordConsent(db, { subjectType: "lead", subjectId: lead.id, purpose: "marketing_email", granted: false, lang, source: "unsubscribe" });
  }
  return leads.length;
}

/** Masked address for the unsubscribe confirmation (never reveals the full address to the link holder). */
export async function unsubscribePreview(token: string) {
  const db = await getDb();
  const lead = await leadByToken(db, token);
  if (!lead) return null;
  const [local, domain] = lead.email.split("@");
  return { email: `${local.slice(0, 2)}${"•".repeat(Math.max(1, local.length - 2))}@${domain}`, subscribed: lead.marketingEmail };
}

/** Erasure via the personal link (Art. 17) – the lead and its consent records are removed. */
export async function deleteLead(token: string) {
  const db = await getDb();
  const lead = await leadByToken(db, token);
  if (!lead) return false;
  await db.delete(schema.consentRecords).where(and(eq(schema.consentRecords.subjectType, "lead"), eq(schema.consentRecords.subjectId, lead.id)));
  await db.delete(schema.leads).where(eq(schema.leads.id, lead.id));
  return true;
}

/* ---------- Data-subject requests ---------- */

export function addOneMonth(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}

export async function createPrivacyRequest(input: { type: PrivacyRequestType; name: string; email: string; message?: string }, lang: Lang) {
  const db = await getDb();
  await cleanupPrivacyData(db);
  const createdAt = nowIso();
  const id = newId("dsr", 8);
  let result: string | null = null;
  // A withdrawal or objection to marketing can be honoured right away without identity checks –
  // it only ever stops processing. Everything else waits for the operator to verify the requester.
  if (input.type === "withdraw" || input.type === "objection") {
    const n = await unsubscribeEmail(input.email, lang);
    result = `marketing_email withdrawn for ${n} request(s)`;
  }
  await db.insert(schema.privacyRequests).values({
    id,
    createdAt,
    type: input.type,
    name: input.name,
    email: input.email.trim().toLowerCase(),
    message: input.message ?? null,
    status: "open",
    dueAt: addOneMonth(createdAt),
    result,
  });
  return { id, dueAt: addOneMonth(createdAt) };
}

/* ---------- Retention ---------- */

/**
 * Deletes contact requests, completed privacy requests and anonymous consent records (cookie
 * banner, demo start) after their retention periods. Runs on new contact/privacy requests and on
 * every demo start.
 */
export async function cleanupPrivacyData(db: Db) {
  const leadCutoff = new Date(Date.now() - LEAD_RETENTION_DAYS * 86_400_000).toISOString();
  const old = await db.select({ id: schema.leads.id }).from(schema.leads).where(lt(schema.leads.createdAt, leadCutoff));
  for (const { id } of old) {
    await db.delete(schema.consentRecords).where(and(eq(schema.consentRecords.subjectType, "lead"), eq(schema.consentRecords.subjectId, id)));
    await db.delete(schema.leads).where(eq(schema.leads.id, id));
  }
  const requestCutoff = new Date(Date.now() - PRIVACY_REQUEST_RETENTION_DAYS * 86_400_000).toISOString();
  await db.delete(schema.privacyRequests).where(and(eq(schema.privacyRequests.status, "completed"), lt(schema.privacyRequests.completedAt, requestCutoff)));
  const consentCutoff = new Date(Date.now() - CONSENT_RECORD_RETENTION_DAYS * 86_400_000).toISOString();
  await db
    .delete(schema.consentRecords)
    .where(and(inArray(schema.consentRecords.subjectType, ["cookie", "demo"]), lt(schema.consentRecords.createdAt, consentCutoff)));
}
