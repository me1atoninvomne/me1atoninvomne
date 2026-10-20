/**
 * Operator details for the imprint, privacy policy and terms.
 *
 * They come exclusively from environment variables – nothing is invented. Every value that is
 * not configured is rendered as a clearly visible placeholder, so a missing detail can never be
 * mistaken for a real one. `/api/health` reports whether the legal details are complete.
 */
import "server-only";
import type { Lang } from "@/i18n/core";

export const COMPANY_FIELDS = [
  "name",
  "street",
  "zip",
  "city",
  "country",
  "representative",
  "register",
  "vatId",
  "email",
  "phone",
  "privacyEmail",
  "dpo",
  "hosting",
  "supervisoryAuthority",
  "contentResponsible",
] as const;
export type CompanyField = (typeof COMPANY_FIELDS)[number];

export const COMPANY_ENV: Record<CompanyField, string> = {
  name: "COMPANY_NAME",
  street: "COMPANY_STREET",
  zip: "COMPANY_ZIP",
  city: "COMPANY_CITY",
  country: "COMPANY_COUNTRY",
  representative: "COMPANY_REPRESENTATIVE",
  register: "COMPANY_REGISTER",
  vatId: "COMPANY_VAT_ID",
  email: "COMPANY_EMAIL",
  phone: "COMPANY_PHONE",
  privacyEmail: "PRIVACY_EMAIL",
  dpo: "DPO_CONTACT",
  hosting: "HOSTING_PROVIDER",
  supervisoryAuthority: "SUPERVISORY_AUTHORITY",
  contentResponsible: "CONTENT_RESPONSIBLE",
};

/** Fields an imprint (§ 5 DDG) and privacy policy (Art. 13 GDPR) cannot do without. */
export const REQUIRED_COMPANY_FIELDS: CompanyField[] = ["name", "street", "zip", "city", "representative", "email", "privacyEmail", "hosting"];

const LABEL: Record<CompanyField, Record<Lang, string>> = {
  name: { de: "Firmenname und Rechtsform", en: "Company name and legal form" },
  street: { de: "Straße und Hausnummer", en: "Street and number" },
  zip: { de: "PLZ", en: "Postcode" },
  city: { de: "Ort", en: "City" },
  country: { de: "Land", en: "Country" },
  representative: { de: "Vertretungsberechtigte Person(en)", en: "Authorised representative(s)" },
  register: { de: "Registergericht und Registernummer", en: "Register court and number" },
  vatId: { de: "USt-IdNr.", en: "VAT ID" },
  email: { de: "E-Mail-Adresse", en: "E-mail address" },
  phone: { de: "Telefonnummer", en: "Phone number" },
  privacyEmail: { de: "Kontakt für Datenschutzanfragen", en: "Contact for privacy requests" },
  dpo: { de: "Datenschutzbeauftragte/r", en: "Data protection officer" },
  hosting: { de: "Hosting-Anbieter und Serverstandort", en: "Hosting provider and server location" },
  supervisoryAuthority: { de: "Zuständige Datenschutz-Aufsichtsbehörde", en: "Competent supervisory authority" },
  contentResponsible: { de: "Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)", en: "Responsible for content (§ 18(2) MStV)" },
};

export function companyFieldLabel(field: CompanyField, lang: Lang): string {
  return LABEL[field][lang];
}

/** Raw configured values (null = not configured). */
export function companyConfig(): Record<CompanyField, string | null> {
  const out = {} as Record<CompanyField, string | null>;
  for (const f of COMPANY_FIELDS) {
    const v = process.env[COMPANY_ENV[f]]?.trim();
    out[f] = v ? v : null;
  }
  return out;
}

export function missingCompanyFields(): CompanyField[] {
  const c = companyConfig();
  return REQUIRED_COMPANY_FIELDS.filter((f) => !c[f]);
}

/**
 * Values ready for legal texts: configured values as-is, missing ones as `[[…]]` markers that the
 * legal renderer shows as highlighted placeholders.
 */
export function companyView(lang: Lang): Record<CompanyField, string> & { address: string; configured: boolean } {
  const c = companyConfig();
  const view = {} as Record<CompanyField, string>;
  for (const f of COMPANY_FIELDS) {
    view[f] = c[f] ?? `[[${LABEL[f][lang]} · ${COMPANY_ENV[f]}]]`;
  }
  const address = [view.street, `${view.zip} ${view.city}`, c.country].filter(Boolean).join(", ");
  return { ...view, address, configured: missingCompanyFields().length === 0 };
}
