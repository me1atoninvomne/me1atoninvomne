/**
 * Keyword- and layout-based document classification for German business documents.
 * The title (largest font on the first page) carries the most weight, followed by number labels
 * and typical phrases. The e-mail subject is used as a weak additional signal.
 */
import type { DocType } from "@/domain/types";
import type { TextLayout } from "./text-layout";

interface Signal {
  type: Exclude<DocType, "other">;
  title: RegExp;
  labels: RegExp[];
  phrases: RegExp[];
}

const SIGNALS: Signal[] = [
  {
    type: "purchase_order",
    title: /^(bestellung|auftrag|purchase order|bestellschein)\b/i,
    labels: [/bestell(?:ungs)?[-\s]?(?:nummer|nr\.?)/i, /unsere bestellnummer/i, /\bPO[-\s]?(?:no|nr)\b/i],
    phrases: [/wir bestellen/i, /bitte liefern sie/i, /bestellen (?:wir|hiermit)/i, /nachbestellung/i, /zum bekannten preis/i],
  },
  {
    type: "invoice",
    title: /^(rechnung|invoice|gutschrift|rechnungskopie)\b/i,
    labels: [/rechnungs[-\s]?(?:nummer|nr\.?)/i, /rechnungsdatum/i, /zahlbar bis/i, /f[äa]llig am/i],
    phrases: [/\bUSt\b|\bMwSt\b|umsatzsteuer/i, /gesamtbetrag|rechnungsbetrag/i, /bankverbindung|\bIBAN\b/i],
  },
  {
    type: "order_confirmation",
    title: /^(auftragsbest[äa]tigung|order confirmation|bestellbest[äa]tigung)\b/i,
    labels: [/\bAB[-\s]?(?:nr\.?|nummer)/i, /auftragsbest[äa]tigungs?(?:nummer|-nr)/i],
    phrases: [/best[äa]tigen (?:wir|ihnen)/i, /wir best[äa]tigen/i, /auftragsbest[äa]tigung/i],
  },
  {
    type: "delivery_note",
    title: /^(lieferschein|delivery note|packliste)\b/i,
    labels: [/lieferschein[-\s]?(?:nummer|nr\.?)/i, /packst[üu]cke/i],
    phrases: [/anlieferung/i, /lieferschein/i, /wareneingang/i],
  },
  {
    type: "rfq",
    title: /^(anfrage|angebotsanfrage|request for quotation|preisanfrage)\b/i,
    labels: [/anfrage[-\s]?(?:nummer|nr\.?)/i, /angebotsabgabe bis/i, /angebotsfrist/i],
    phrases: [/bitten (?:wir )?um (?:ihr|ein) angebot/i, /angebot/i],
  },
  {
    type: "delay_notice",
    title: /^(mitteilung (?:liefer|zustell)verz|lieferverzug|zustellverz|terminverschiebung|lieferterminverschiebung)/i,
    labels: [/neuer (?:liefer|zustell)termin/i, /urspr[üu]nglicher (?:liefer|zustell)termin/i],
    phrases: [/verz[öo]ger/i, /verschiebt sich/i, /nicht halten/i, /lieferverzug/i],
  },
];

const NOISE = [/newsletter/i, /abmelden/i, /einladung/i, /fr[üu]hbucher/i, /webinar/i, /gewinnspiel/i];

export interface Classification {
  docType: DocType;
  confidence: number;
  signals: string[];
}

export function classifyDocument(layout: TextLayout, subject = ""): Classification {
  if (!layout.hasText) {
    return { docType: guessFromSubject(subject) ?? "other", confidence: 0.35, signals: ["no_text_layer", ...(subject ? ["subject_only"] : [])] };
  }
  const titleLine = findTitle(layout);
  const fullText = layout.lines.map((l) => l.text).join("\n");
  const scores = new Map<DocType, number>();
  const signals: string[] = [];
  for (const s of SIGNALS) {
    let score = 0;
    if (titleLine && s.title.test(titleLine)) {
      score += 6;
      signals.push(`title:${s.type}`);
    }
    for (const re of s.labels) if (re.test(fullText)) score += 2.5;
    for (const re of s.phrases) if (re.test(fullText)) score += 1;
    if (subject && s.title.test(subject.replace(/^(WG|AW|FW|RE):\s*/i, ""))) score += 1.5;
    scores.set(s.type, score);
  }
  const noise = NOISE.filter((re) => re.test(fullText) || re.test(subject)).length;
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [topType, top] = ranked[0];
  const second = ranked[1]?.[1] ?? 0;

  if (top < 3 || (noise >= 2 && top < 6)) {
    signals.push(`noise:${noise}`);
    return { docType: "other", confidence: noise >= 2 ? 0.93 : 0.6, signals };
  }
  const margin = top - second;
  const confidence = Math.min(0.99, Math.max(0.5, 0.62 + margin * 0.05 + (signals.length > 0 ? 0.1 : 0)));
  signals.push(`score:${topType}=${top.toFixed(1)}`, `margin=${margin.toFixed(1)}`);
  return { docType: topType, confidence: Math.round(confidence * 100) / 100, signals };
}

/** The title is the line with the largest font that is not the letterhead (first line). */
export function findTitle(layout: TextLayout): string | null {
  const firstPage = layout.lines.filter((l) => l.page === 1);
  if (firstPage.length === 0) return null;
  const candidates = firstPage.slice(1);
  if (candidates.length === 0) return null;
  const maxSize = Math.max(...candidates.map((l) => l.fontSize));
  if (maxSize <= 10.5) return null; // plain text (e-mail body) has no title
  return candidates.find((l) => l.fontSize === maxSize)?.text ?? null;
}

function guessFromSubject(subject: string): DocType | null {
  const s = subject.toLowerCase();
  if (/lieferschein|wareneingang/.test(s)) return "delivery_note";
  if (/rechnung/.test(s)) return "invoice";
  if (/auftragsbest/.test(s)) return "order_confirmation";
  if (/bestellung/.test(s)) return "purchase_order";
  return null;
}
