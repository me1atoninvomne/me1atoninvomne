/**
 * Minimal, typed i18n. German is the primary language; English is a full alternative.
 * Dictionaries live next to the features that use them and are defined with `defineDict`,
 * which enforces that both languages have the same shape.
 */
import type { LocalizedText } from "@/domain/types";

export const LANGS = ["de", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "de";
export const LANG_COOKIE = "fp_lang";

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => R
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

export function defineDict<T extends object>(dict: { de: T; en: Widen<T> }): { de: T; en: Widen<T> } {
  return dict;
}

export function isLang(v: unknown): v is Lang {
  return v === "de" || v === "en";
}

/** Replaces `{name}` placeholders. */
export function fmt(template: string, params: Record<string, string | number | null | undefined> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v == null ? "—" : String(v);
  });
}

export function loc(text: LocalizedText | null | undefined, lang: Lang): string {
  if (!text) return "";
  return text[lang] || text.de;
}

/* ---------- Formatting (German business conventions; EUR in both languages) ---------- */

export interface Formatters {
  lang: Lang;
  money: (n: number | null | undefined, opts?: { decimals?: number }) => string;
  number: (n: number | null | undefined, decimals?: number) => string;
  percent: (n: number | null | undefined, decimals?: number) => string;
  date: (iso: string | null | undefined) => string;
  dateTime: (iso: string | null | undefined) => string;
  time: (iso: string | null | undefined) => string;
  relative: (iso: string | null | undefined, now?: Date) => string;
  hours: (n: number | null | undefined) => string;
}

const LOCALE: Record<Lang, string> = { de: "de-DE", en: "en-GB" };

export function formatters(lang: Lang): Formatters {
  const locale = LOCALE[lang];
  const dash = "—";
  // Date-only values are calendar dates (UTC midnight); timestamps are shown in German time.
  const toDate = (iso: string) => (iso.length === 10 ? new Date(iso + "T00:00:00Z") : new Date(iso));
  const TZ = "Europe/Berlin";
  return {
    lang,
    money: (n, opts) =>
      n == null || Number.isNaN(n)
        ? dash
        : new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: opts?.decimals ?? 2,
            maximumFractionDigits: opts?.decimals ?? 2,
          }).format(n),
    number: (n, decimals = 0) =>
      n == null || Number.isNaN(n)
        ? dash
        : new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n),
    percent: (n, decimals = 0) =>
      n == null || Number.isNaN(n)
        ? dash
        : new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n),
    date: (iso) =>
      iso
        ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: iso.length === 10 ? "UTC" : TZ }).format(
            toDate(iso),
          )
        : dash,
    dateTime: (iso) =>
      iso
        ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(
            toDate(iso),
          )
        : dash,
    time: (iso) => (iso ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(toDate(iso)) : dash),
    relative: (iso, now = new Date()) => {
      if (!iso) return dash;
      const diff = (toDate(iso).getTime() - now.getTime()) / 1000;
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      const abs = Math.abs(diff);
      if (abs < 60) return rtf.format(Math.round(diff), "second");
      if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
      if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
      return rtf.format(Math.round(diff / 86400), "day");
    },
    hours: (n) =>
      n == null || Number.isNaN(n)
        ? dash
        : `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)} ${lang === "de" ? "Std." : "h"}`,
  };
}
