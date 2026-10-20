/**
 * Complete inventory of everything this application stores in the visitor's browser.
 * The cookie policy, the cookie banner settings and an E2E test all read this list, so the
 * documentation cannot drift from the implementation. There are no third-party cookies.
 */
import type { LocalizedText } from "@/domain/types";

export type ConsentCategory = "necessary" | "comfort";

export interface StorageEntry {
  name: string;
  storage: "cookie" | "localStorage" | "sessionStorage";
  category: ConsentCategory;
  purpose: LocalizedText;
  duration: LocalizedText;
  httpOnly?: boolean;
}

export const CONSENT_COOKIE = "fp_consent";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export const STORAGE_INVENTORY: StorageEntry[] = [
  {
    name: CONSENT_COOKIE,
    storage: "cookie",
    category: "necessary",
    purpose: {
      de: "Speichert Ihre Auswahl im Cookie-Hinweis (Version, Zeitpunkt, Kategorien, zufällige Nachweis-ID), damit wir Sie nicht bei jedem Aufruf erneut fragen.",
      en: "Stores your choice in the cookie notice (version, time, categories, random proof id) so we do not ask again on every visit.",
    },
    duration: { de: "12 Monate", en: "12 months" },
  },
  {
    name: "fp_lang",
    storage: "cookie",
    category: "necessary",
    purpose: { de: "Merkt sich die von Ihnen gewählte Sprache (Deutsch/Englisch).", en: "Remembers the language you selected (German/English)." },
    duration: { de: "12 Monate", en: "12 months" },
  },
  {
    name: "fp_ws",
    storage: "cookie",
    category: "necessary",
    httpOnly: true,
    purpose: {
      de: "Zufällige Kennung Ihres Demo-Arbeitsbereichs. Wird erst gesetzt, wenn Sie die Demo ausdrücklich starten.",
      en: "Random identifier of your demo workspace. Only set when you explicitly start the demo.",
    },
    duration: { de: "7 Tage", en: "7 days" },
  },
  {
    name: "fp_user",
    storage: "cookie",
    category: "necessary",
    httpOnly: true,
    purpose: { de: "Gewählter (fiktiver) Demo-Benutzer, um Rollen und Freigaben zu zeigen.", en: "Selected (fictional) demo user to demonstrate roles and approvals." },
    duration: { de: "7 Tage", en: "7 days" },
  },
  {
    name: "fp-tour-<id>",
    storage: "localStorage",
    category: "comfort",
    purpose: {
      de: "Merkt sich, ob der Demo-Rundgang geöffnet ist und welche Schritte Sie gesehen haben. Ohne Einwilligung nur bis zum Neuladen der Seite.",
      en: "Remembers whether the demo tour is open and which steps you have seen. Without consent only until the page is reloaded.",
    },
    duration: { de: "bis Sie die Website-Daten löschen", en: "until you clear site data" },
  },
  {
    name: "fp-review-start-<id>",
    storage: "sessionStorage",
    category: "comfort",
    purpose: {
      de: "Startzeit der Prüfung eines Dokuments, damit die gemessene Bearbeitungszeit beim Neuladen erhalten bleibt. Ohne Einwilligung nur im Arbeitsspeicher.",
      en: "Start time of a document review so the measured handling time survives a reload. Without consent kept in memory only.",
    },
    duration: { de: "bis zum Schließen des Tabs", en: "until the tab is closed" },
  },
];

/** Prefixes of browser-storage keys that belong to the "comfort" category (removed on withdrawal). */
export const COMFORT_STORAGE_PREFIXES = ["fp-tour-", "fp-review-start-"];

export interface ConsentState {
  v: string;
  id: string;
  at: string;
  comfort: boolean;
}

/** Cookie value format: `<version>~<id>~<iso time>~<0|1 comfort>` (no characters that need encoding issues). */
export function parseConsent(raw: string | undefined | null, version: string): ConsentState | null {
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  const [v, id, at, comfort] = value.split("~");
  if (v !== version || !id || !at || Number.isNaN(Date.parse(at)) || (comfort !== "0" && comfort !== "1")) return null;
  return { v, id, at, comfort: comfort === "1" };
}

export function serializeConsent(c: ConsentState): string {
  return [c.v, c.id, c.at, c.comfort ? "1" : "0"].join("~");
}
