/**
 * Rule-based field extraction for German business documents (the "demo adapter").
 *
 * It works deterministically and offline. It recognises typical label/value pairs
 * ("Bestellnummer: …", "Liefertermin: KW 47/2026"), item tables and totals. Values that cannot
 * be found are returned as `null` – the extractor never guesses.
 */
import { DOC_TYPE_META, fieldsForDocType } from "@/domain/documents";
import { normalizeCompanyName, normalizeIban, parseCalendarWeek, parseGermanDate, parseGermanNumber } from "@/domain/parse";
import type { DocType, ExtractedField, Extraction, FieldKey, LineItem } from "@/domain/types";
import type { TextLayout } from "./text-layout";

export interface ExtractInput {
  layout: TextLayout;
  docType: DocType;
  docTypeConfidence: number;
  signals: string[];
  /** Name of the receiving company – excluded when detecting the sender. */
  ownCompanyName: string;
  ownVatId?: string;
  emailFromName?: string;
}

type Finder = (ctx: Ctx) => Omit<ExtractedField, "key" | "status"> | null;

interface Ctx {
  lines: string[];
  cells: string[];
  docType: DocType;
  input: ExtractInput;
}

const DATE = String.raw`(\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}|(?:KW|Kalenderwoche)\s?\d{1,2}\s?[/.\s]\s?\d{4})`;
const AMOUNT = String.raw`(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})`;
const IDENT = String.raw`([A-Z0-9][A-Z0-9\-\/]{2,})`;

const LABELS = {
  poNumber: String.raw`(?:unsere\s+)?bestell(?:ungs)?[-\s]?(?:nummer|nr\.?)|bestellung\s+nr\.?|PO[-\s]?(?:number|no\.?|nr\.?)`,
  invoiceNumber: String.raw`rechnungs[-\s]?(?:nummer|nr\.?)|rechnung\s+nr\.?|invoice\s+(?:no\.?|number)`,
  abNumber: String.raw`auftragsbest[äa]tigungs?[-\s]?(?:nummer|nr\.?)|AB[-\s]?(?:nummer|nr\.?)`,
  lsNumber: String.raw`lieferschein[-\s]?(?:nummer|nr\.?)`,
  rfqNumber: String.raw`anfrage[-\s]?(?:nummer|nr\.?)|anfragenummer`,
  reference: String.raw`ihre\s+bestell(?:ung|nummer|-?nr\.?)|ihr\s+transportauftrag|ihre\s+referenz|bestellreferenz|ihr\s+auftrag`,
  docDate: String.raw`rechnungsdatum|bestelldatum|belegdatum|datum`,
};

/* ---------- helpers ---------- */

function labelValue(ctx: Ctx, label: string, valuePattern: string): { value: string; source: string } | null {
  const re = new RegExp(String.raw`(?:^|\s|\t)(?:${label})(?![a-zäöüß])\s*[:.]?\s*(?:bei\s+ihnen\s*[:.]?\s*)?${valuePattern}`, "i");
  for (const cell of ctx.cells) {
    const m = cell.match(re);
    if (m) return { value: m[m.length - 1], source: cell };
  }
  // Label on its own line, value on the next line
  const labelOnly = new RegExp(String.raw`^(?:${label})(?![a-zäöüß])\s*:?\s*$`, "i");
  const valueRe = new RegExp(String.raw`^${valuePattern}`, "i");
  for (let i = 0; i < ctx.lines.length - 1; i++) {
    if (labelOnly.test(ctx.lines[i].trim())) {
      const m = ctx.lines[i + 1].trim().match(valueRe);
      if (m) return { value: m[1], source: `${ctx.lines[i].trim()} ${ctx.lines[i + 1].trim()}` };
    }
  }
  return null;
}

function dateValue(raw: string): { iso: string | null; viaWeek: boolean } {
  const week = parseCalendarWeek(raw);
  if (week) return { iso: week, viaWeek: true };
  return { iso: parseGermanDate(raw), viaWeek: false };
}

const ident = (label: string, confidence = 0.97): Finder => (ctx) => {
  const hit = labelValue(ctx, label, IDENT);
  return hit ? { value: hit.value.replace(/[.,;]$/, ""), confidence, source: hit.source } : null;
};

const date = (label: string): Finder => (ctx) => {
  const hit = labelValue(ctx, label, DATE);
  if (!hit) return null;
  const { iso, viaWeek } = dateValue(hit.value);
  if (!iso) return null;
  return { value: iso, confidence: viaWeek ? 0.9 : 0.97, source: hit.source };
};

const amount = (label: string): Finder => (ctx) => {
  const hit = labelValue(ctx, label, String.raw`(?:EUR|€)?\s*${AMOUNT}`);
  if (!hit) return null;
  const v = parseGermanNumber(hit.value);
  return v == null ? null : { value: v.toFixed(2), confidence: 0.97, source: hit.source };
};

const text = (label: string, confidence = 0.92): Finder => (ctx) => {
  const hit = labelValue(ctx, label, String.raw`(.{3,120})`);
  return hit ? { value: hit.value.trim(), confidence, source: hit.source } : null;
};

/* ---------- field finders ---------- */

function senderName(ctx: Ctx): ReturnType<Finder> {
  const own = normalizeCompanyName(ctx.input.ownCompanyName);
  const legal = /\b(GmbH(?:\s*&\s*Co\.?\s*KG)?|AG|KG|OHG|e\.\s?K\.|UG|SE)\b/;
  const { layout } = ctx.input;
  // Letterhead: first line of a PDF, typically in a larger font
  const first = layout.lines[0];
  if (first && first.fontSize > 11 && legal.test(first.text) && normalizeCompanyName(first.text) !== own) {
    return { value: first.text.trim(), confidence: 0.96, source: first.text };
  }
  // E-mail signature / text: last line containing a legal form that is not us
  const candidates = ctx.lines
    .flatMap((l) => l.split(/\t|\|/))
    .map((s) => s.trim())
    .filter((s) => legal.test(s) && s.length < 80 && normalizeCompanyName(s) !== own && !/·/.test(s));
  if (candidates.length > 0) {
    const pick = layout.lines.length > 0 && layout.lines[0].fontSize > 11 ? candidates[0] : candidates[candidates.length - 1];
    const name = pick.replace(/^(einkauf|vertrieb|buchhaltung)\s*[|:–-]\s*/i, "").trim();
    return { value: name, confidence: 0.85, source: pick };
  }
  return null;
}

function partyNumber(ctx: Ctx): ReturnType<Finder> {
  const hit = labelValue(ctx, String.raw`(?:unsere\s+)?kunden[-\s]?(?:nummer|nr\.?)`, String.raw`(K-\d{5})`);
  return hit ? { value: hit.value, confidence: 0.97, source: hit.source } : null;
}

function reference(ctx: Ctx): ReturnType<Finder> {
  const hit = labelValue(ctx, LABELS.reference, IDENT);
  if (hit) return { value: hit.value.replace(/[.,;]$/, ""), confidence: 0.96, source: hit.source };
  for (const line of ctx.lines) {
    const m = line.match(/\b(B-\d{4}-\d{4})\b/);
    if (m) return { value: m[1], confidence: 0.8, source: line };
  }
  return null;
}

function deliveryAddress(ctx: Ctx): ReturnType<Finder> {
  const labelRe = /^(lieferanschrift|lieferadresse|anlieferadresse|versandadresse|warenempf[äa]nger)\s*:?\s*(.*)$/i;
  for (let i = 0; i < ctx.lines.length; i++) {
    const m = ctx.lines[i].trim().match(labelRe);
    if (!m) continue;
    const parts: string[] = [];
    if (m[2]) parts.push(m[2].trim());
    for (let j = i + 1; j < Math.min(ctx.lines.length, i + 6); j++) {
      const l = ctx.lines[j].trim();
      if (!l || /:$/.test(l)) break;
      parts.push(l);
      if (/\b\d{5}\s+\S+/.test(l)) {
        return { value: parts.join(", "), confidence: 0.94, source: [ctx.lines[i], ...ctx.lines.slice(i + 1, j + 1)].join(" / ") };
      }
    }
  }
  return null;
}

function vat(ctx: Ctx): { rate: ReturnType<Finder>; amount: ReturnType<Finder> } {
  const re = new RegExp(String.raw`(?:zzgl\.?\s*)?(\d{1,2}(?:,\d)?)\s*%\s*(?:USt|MwSt|Umsatzsteuer|Mehrwertsteuer)\.?\s*:?\s*(?:EUR|€)?\s*${AMOUNT}`, "i");
  const re2 = new RegExp(String.raw`(?:USt|MwSt|Umsatzsteuer|Mehrwertsteuer)\.?\s*(\d{1,2}(?:,\d)?)\s*%\s*:?\s*(?:EUR|€)?\s*${AMOUNT}`, "i");
  for (const line of ctx.lines) {
    const m = line.match(re) ?? line.match(re2);
    if (m) {
      const rate = parseGermanNumber(m[1]);
      const amt = parseGermanNumber(m[2]);
      return {
        rate: rate != null ? { value: String(rate), confidence: 0.97, source: line } : null,
        amount: amt != null ? { value: amt.toFixed(2), confidence: 0.97, source: line } : null,
      };
    }
  }
  return { rate: null, amount: null };
}

function iban(ctx: Ctx): ReturnType<Finder> {
  const re = /\b([A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?)\b/g;
  const found: { iban: string; line: string; preferred: boolean }[] = [];
  for (const [i, line] of ctx.lines.entries()) {
    for (const m of line.matchAll(re)) {
      const normalized = normalizeIban(m[1]);
      if (!normalized || !/IBAN/i.test(line + (ctx.lines[i - 1] ?? ""))) continue;
      const context = `${ctx.lines[i - 1] ?? ""} ${line}`;
      found.push({ iban: normalized, line, preferred: /neu|ausschlie(ß|ss)lich|bitte (?:überweisen|zahlen)/i.test(context) });
    }
  }
  if (found.length === 0) return null;
  const distinct = [...new Set(found.map((f) => f.iban))];
  const pick = found.find((f) => f.preferred) ?? found[0];
  return { value: pick.iban, confidence: distinct.length > 1 ? 0.88 : 0.97, source: pick.line };
}

function vatId(ctx: Ctx): ReturnType<Finder> {
  const own = ctx.input.ownVatId?.replace(/\s/g, "");
  for (const line of ctx.lines) {
    for (const m of line.matchAll(/\b(DE\s?\d{9})\b/g)) {
      const v = m[1].replace(/\s/g, "");
      if (v !== own) return { value: v, confidence: 0.95, source: line };
    }
  }
  return null;
}

function currency(ctx: Ctx): ReturnType<Finder> {
  const line = ctx.lines.find((l) => /\bEUR\b|€/.test(l));
  return line ? { value: "EUR", confidence: 0.95, source: line } : null;
}

const FINDERS: Partial<Record<FieldKey, (docType: DocType) => Finder | Finder[]>> = {
  documentNumber: (t) =>
    ({
      purchase_order: ident(LABELS.poNumber),
      invoice: ident(LABELS.invoiceNumber),
      order_confirmation: ident(LABELS.abNumber),
      delivery_note: ident(LABELS.lsNumber),
      rfq: ident(LABELS.rfqNumber),
      delay_notice: ident(String.raw`meldungs?[-\s]?nr\.?|vorgangs?[-\s]?nr\.?|sendung`),
      other: ident("nummer"),
    })[t],
  documentDate: () => date(LABELS.docDate),
  partyName: () => senderName,
  partyNumber: () => partyNumber,
  referenceNumber: () => reference,
  deliveryDate: (t) =>
    t === "delay_notice"
      ? date(String.raw`neuer\s+(?:liefer|zustell)termin|voraussichtliche[rn]?\s+(?:liefer|zustell)termin`)
      : t === "order_confirmation"
        ? date(String.raw`best[äa]tigter\s+liefertermin|liefertermin|lieferdatum|voraussichtliche[rn]?\s+liefertermin`)
        : date(String.raw`gew[üu]nschter\s+liefertermin|wunschliefertermin|wunschtermin|liefertermin|lieferdatum|anliefertermin`),
  originalDeliveryDate: () => date(String.raw`urspr[üu]nglicher\s+(?:liefer|zustell)termin|bisheriger\s+(?:liefer|zustell)?termin|best[äa]tigter\s+termin`),
  deliveryAddress: () => deliveryAddress,
  paymentTerms: () => text(String.raw`zahlungsbedingung(?:en)?|zahlungsziel|zahlungskondition(?:en)?`),
  netTotal: () => amount(String.raw`nettobetrag|summe\s+netto|gesamt\s+netto|nettosumme|netto|warenwert`),
  grossTotal: () => amount(String.raw`gesamtbetrag|rechnungsbetrag|bruttobetrag|summe\s+brutto|endbetrag|zahlbetrag`),
  iban: () => iban,
  vatId: () => vatId,
  currency: () => currency,
  dueDate: (t) =>
    t === "rfq"
      ? date(String.raw`angebotsabgabe\s+bis|angebot\s+bis|angebotsfrist|r[üu]ckmeldung\s+bis`)
      : date(String.raw`zahlbar\s+bis|f[äa]llig\s+am|f[äa]lligkeit(?:sdatum)?|zahlungsfrist`),
  contactPerson: () => text(String.raw`ansprechpartner(?:in)?|ihr\s+kontakt|sachbearbeiter(?:in)?|besteller(?:in)?`, 0.9),
  delayReason: () => text(String.raw`grund|ursache`, 0.9),
};

/* ---------- line items ---------- */

const UNIT = String.raw`(Stk\.?|St\.?|Stück|m|Meter|kg|Set|Sets|VE|Pal\.?|Paletten?|Rolle[n]?)`;

function parseLineItems(ctx: Ctx): LineItem[] {
  const headerIdx = ctx.lines.findIndex((l) => /\bpos\b/i.test(l) && /(menge|anzahl)/i.test(l));
  if (headerIdx >= 0) {
    const items: LineItem[] = [];
    const header = ctx.lines[headerIdx].split("\t").map((h) => h.trim().toLowerCase());
    const col = (re: RegExp) => header.findIndex((h) => re.test(h));
    const cPos = col(/^pos/);
    const cArt = col(/artikel|art\.?-?nr|material/);
    const cDesc = col(/bezeichnung|beschreibung|text/);
    const cQty = col(/menge|anzahl/);
    const cPrice = col(/einzelpreis|preis\/|e-preis|ep\b/);
    const cTotal = col(/gesamt|betrag|summe/);
    for (let i = headerIdx + 1; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];
      if (/^(nettobetrag|summe|gesamt|zzgl|zwischensumme|lieferanschrift|hinweis|zahlungsbedingungen|termine)/i.test(line.trim())) break;
      const cells = line.split("\t").map((c) => c.trim());
      if (!/^\d{1,4}$/.test(cells[0] ?? "")) {
        if (items.length > 0) break;
        continue;
      }
      const get = (c: number) => (c >= 0 && c < cells.length ? cells[c] : null);
      const qtyCell = get(cQty) ?? "";
      const qm = qtyCell.match(new RegExp(String.raw`^([\d.,]+)\s*${UNIT}?`, "i"));
      const quantity = qm ? parseGermanNumber(qm[1]) : null;
      const unit = qm?.[2] ?? (cQty + 1 < cells.length && new RegExp(`^${UNIT}$`, "i").test(cells[cQty + 1] ?? "") ? cells[cQty + 1] : null);
      const aligned = cells.length === header.length;
      const unitPrice = aligned && cPrice >= 0 ? parseGermanNumber(get(cPrice)) : null;
      const total = aligned && cTotal >= 0 ? parseGermanNumber(get(cTotal)) : null;
      let confidence = aligned ? 0.96 : 0.82;
      if (quantity == null) confidence = Math.min(confidence, 0.6);
      items.push({
        pos: cells[cPos >= 0 ? cPos : 0],
        articleNo: get(cArt),
        description: get(cDesc),
        quantity,
        unit: unit ?? null,
        unitPrice,
        total,
        confidence,
        source: line,
      });
    }
    if (items.length > 0) return items;
  }
  return parseFreeTextItems(ctx);
}

/** "40 Stück Flanschlager FL-30 (AT-7302)" – typical for orders written directly in an e-mail. */
function parseFreeTextItems(ctx: Ctx): LineItem[] {
  const re = new RegExp(String.raw`^(\d+(?:[.,]\d+)?)\s*${UNIT}\s+(.+?)(?:\s*\(([A-Z]{2}-\d{4})\))?\s*$`, "i");
  const items: LineItem[] = [];
  for (const line of ctx.lines) {
    const m = line.trim().match(re);
    if (!m) continue;
    items.push({
      pos: String(items.length + 1),
      articleNo: m[4] ?? null,
      description: m[3].trim(),
      quantity: parseGermanNumber(m[1]),
      unit: m[2],
      unitPrice: null,
      total: null,
      confidence: m[4] ? 0.78 : 0.62,
      source: line.trim(),
    });
  }
  return items;
}

/* ---------- main ---------- */

export function extractWithRules(input: ExtractInput): Extraction {
  const lines = input.layout.lines.map((l) => l.text);
  // Individual columns first, so that a field's source points to the smallest matching cell.
  const cells = lines.flatMap((l) => (l.includes("\t") ? [...l.split("\t"), l] : [l])).map((c) => c.trim()).filter(Boolean);
  const ctx: Ctx = { lines, cells, docType: input.docType, input };
  const fields: Extraction["fields"] = {};

  if (!input.layout.hasText || input.docType === "other") {
    return {
      docType: input.docType,
      docTypeConfidence: input.docTypeConfidence,
      fields,
      lineItems: [],
      textAvailable: input.layout.hasText,
      provider: "demo-rules",
      signals: input.signals,
    };
  }

  const wanted = fieldsForDocType(input.docType);
  const vatHit = wanted.includes("vatRate") ? vat(ctx) : { rate: null, amount: null };

  for (const key of wanted) {
    let hit: ReturnType<Finder> = null;
    if (key === "vatRate") hit = vatHit.rate;
    else if (key === "vatAmount") hit = vatHit.amount;
    else {
      const finder = FINDERS[key]?.(input.docType);
      const list = Array.isArray(finder) ? finder : finder ? [finder] : [];
      for (const f of list) {
        hit = f(ctx);
        if (hit) break;
      }
    }
    fields[key] = hit
      ? { key, value: hit.value, confidence: hit.confidence, source: hit.source ?? null, status: "extracted" }
      : { key, value: null, confidence: 0, source: null, status: "missing" };
  }

  const lineItems = DOC_TYPE_META[input.docType].hasLineItems ? parseLineItems(ctx) : [];
  return {
    docType: input.docType,
    docTypeConfidence: input.docTypeConfidence,
    fields,
    lineItems,
    textAvailable: true,
    provider: "demo-rules",
    signals: input.signals,
  };
}
