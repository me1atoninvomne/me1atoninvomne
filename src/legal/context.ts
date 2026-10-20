import "server-only";
import { companyView } from "@/config/company";
import type { Lang } from "@/i18n/core";
import { STORAGE_INVENTORY } from "./cookies";
import type { LegalContext } from "./types";

export const LEAD_RETENTION_DAYS = Number(process.env.LEAD_RETENTION_DAYS ?? 180);
export const PRIVACY_REQUEST_RETENTION_DAYS = Number(process.env.PRIVACY_REQUEST_RETENTION_DAYS ?? 3 * 365);
/** Proof of cookie-banner and demo-start decisions (no personal data): validity 12 months + limitation period. */
export const CONSENT_RECORD_RETENTION_DAYS = Number(process.env.CONSENT_RECORD_RETENTION_DAYS ?? 3 * 365);
export const DEMO_TTL_HOURS = Number(process.env.DEMO_TTL_HOURS ?? 72);

export function externalAiEnabled(): boolean {
  return process.env.AI_PROVIDER === "anthropic" && Boolean(process.env.ANTHROPIC_API_KEY);
}

export function legalContext(lang: Lang): LegalContext {
  return {
    lang,
    company: companyView(lang),
    externalAiEnabled: externalAiEnabled(),
    demoTtlHours: DEMO_TTL_HOURS,
    leadRetentionDays: LEAD_RETENTION_DAYS,
    privacyRequestRetentionDays: PRIVACY_REQUEST_RETENTION_DAYS,
    consentRecordRetentionDays: CONSENT_RECORD_RETENTION_DAYS,
    storage: STORAGE_INVENTORY,
  };
}

/** Set LEGAL_TEXTS_REVIEWED=1 once a lawyer has reviewed and adapted the texts. */
export function legalTextsReviewed(): boolean {
  return process.env.LEGAL_TEXTS_REVIEWED === "1";
}
