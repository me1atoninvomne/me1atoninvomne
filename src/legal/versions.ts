/**
 * Versions of the legal documents and consent texts. A consent is only valid for the version it
 * was given for – changing a version here asks every visitor again (cookie banner) and is stored
 * with each consent record as proof (Art. 7(1) GDPR).
 */
export const LEGAL_VERSIONS = {
  privacy: "2026-10-20",
  terms: "2026-10-20",
  refund: "2026-10-20",
  cookies: "2026-10-20",
  /** Wording of the consent checkboxes in forms and of the cookie banner. */
  consent: "2026-10-20",
} as const;

export const MIN_AGE = 18;
