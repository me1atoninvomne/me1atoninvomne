/**
 * Structured legal documents. Texts are written per language as functions of a `LegalContext`,
 * so operator details, retention periods and the storage inventory are always taken from the
 * running configuration instead of being copied into prose.
 *
 * Inline markup inside strings: `**bold**`, `[label](/path)` and `[[placeholder]]` (rendered as a
 * highlighted "detail missing" marker – used for operator data that is not configured).
 */
import type { Lang } from "@/i18n/core";
import type { StorageEntry } from "./cookies";

export type LegalBlock =
  | string
  | { list: string[] }
  | { table: { head: string[]; rows: string[][]; /** First column in monospace (e.g. cookie names). */ mono?: boolean } }
  | { note: string };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  title: string;
  intro?: string;
  sections: LegalSection[];
}

export interface LegalCompany {
  name: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  address: string;
  representative: string;
  register: string;
  vatId: string;
  email: string;
  phone: string;
  privacyEmail: string;
  dpo: string;
  hosting: string;
  supervisoryAuthority: string;
  contentResponsible: string;
  configured: boolean;
}

export interface LegalContext {
  lang: Lang;
  company: LegalCompany;
  /** True only when AI_PROVIDER=anthropic and an API key is configured on the server. */
  externalAiEnabled: boolean;
  demoTtlHours: number;
  leadRetentionDays: number;
  privacyRequestRetentionDays: number;
  consentRecordRetentionDays: number;
  storage: StorageEntry[];
}

export type LegalDocFactory = (ctx: LegalContext) => LegalDoc;
