/**
 * Parsing helpers for German business documents: numbers, dates, calendar weeks,
 * IBANs and fuzzy company-name matching.
 */

/** Parses "1.234,56", "1234,56", "1 234,56 €", "EUR 12,00", "-3,5" → number. Returns null if not a number. */
export function parseGermanNumber(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).replace(/ /g, " ").trim();
  s = s.replace(/(EUR|€|Euro)/gi, "").replace(/\s+/g, "").trim();
  if (!s) return null;
  // Already canonical ("1234.56")
  if (/^-?\d+(\.\d+)?$/.test(s) && !/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s);
  if (!/^-?[\d.]+(,\d+)?$/.test(s)) return null;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** dd.mm.yyyy or dd.mm.yy → ISO date (YYYY-MM-DD). */
export function parseGermanDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = String(input).match(/(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1) return null;
  return toIsoDate(d);
}

/** "KW 47/2026", "KW47 2026", "Kalenderwoche 47/2026" → ISO date of that week's Monday (ISO-8601 weeks). */
export function parseCalendarWeek(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = String(input).match(/(?:KW|Kalenderwoche)\s?(\d{1,2})\s?[/.\s]\s?(\d{4})/i);
  if (!m) return null;
  const week = Number(m[1]);
  const year = Number(m[2]);
  if (week < 1 || week > 53) return null;
  return isoWeekMonday(year, week);
}

export function isoWeekMonday(year: number, week: number): string {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  const target = new Date(mondayWeek1);
  target.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return toIsoDate(target);
}

export function isoWeekOf(isoDate: string): { year: number; week: number } {
  const d = new Date(isoDate + "T00:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
  const b = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

/** Formats an ISO date as dd.mm.yyyy (used when generating German documents). */
export function formatGermanDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

/** Formats a number in German notation with 2 decimals: 1234.5 → "1.234,50". */
export function formatGermanNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

/* ---------- IBAN ---------- */

export function normalizeIban(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s) ? s : null;
}

/** ISO 13616 mod-97 check. */
export function isValidIban(input: string | null | undefined): boolean {
  const iban = normalizeIban(input);
  if (!iban) return false;
  if (iban.startsWith("DE") && iban.length !== 22) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of code) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export function formatIban(input: string | null | undefined): string {
  const iban = normalizeIban(input);
  if (!iban) return input ?? "";
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

/* ---------- Company name matching ---------- */

const LEGAL_FORMS = /\b(gmbh\s*&\s*co\.?\s*kg|gmbh|ag|kg|ohg|e\.?\s?k\.?|ug|se|co\.?|mbh)\b/g;

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(LEGAL_FORMS, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token-based similarity (Dice coefficient on bigrams of the normalized name), 0..1. */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeCompanyName(a);
  const nb = normalizeCompanyName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const bigrams = (s: string) => {
    const out = new Map<string, number>();
    const t = s.replace(/ /g, "");
    for (let i = 0; i < t.length - 1; i++) {
      const bg = t.slice(i, i + 2);
      out.set(bg, (out.get(bg) ?? 0) + 1);
    }
    return out;
  };
  const A = bigrams(na);
  const B = bigrams(nb);
  let overlap = 0;
  let sizeA = 0;
  let sizeB = 0;
  A.forEach((v) => (sizeA += v));
  B.forEach((v) => (sizeB += v));
  A.forEach((v, k) => (overlap += Math.min(v, B.get(k) ?? 0)));
  return sizeA + sizeB === 0 ? 0 : (2 * overlap) / (sizeA + sizeB);
}
