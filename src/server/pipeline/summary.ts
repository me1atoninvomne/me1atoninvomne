/**
 * Summaries and next actions for the inbox. They are composed from the validated structured
 * data – not generated freely – so they cannot contain facts that are not in the document.
 */
import { documentNetAmount } from "@/domain/documents";
import type { Extraction, LocalizedText, RoutingDecision, ValidationIssue } from "@/domain/types";
import { formatters, type Lang } from "@/i18n/core";
import { dom, issueText } from "@/i18n/domain";

export interface SummaryInput {
  extraction: Extraction;
  issues: ValidationIssue[];
  routing: Pick<RoutingDecision, "route" | "requiredRole" | "department">;
  partyName: string | null;
  autoTransferred: boolean;
}

function build(lang: Lang, i: SummaryInput): { summary: string; nextAction: string } {
  const d = dom(lang);
  const f = formatters(lang);
  const x = i.extraction;
  const v = (k: keyof Extraction["fields"]) => x.fields[k]?.value ?? null;
  const unknown = d.unknown;
  const party = i.partyName ?? v("partyName") ?? unknown;
  const no = v("documentNumber") ?? unknown;
  const ref = v("referenceNumber") ?? unknown;
  const net = documentNetAmount(x.fields, x.lineItems);
  const items = x.lineItems.length;
  const date = (k: keyof Extraction["fields"]) => (v(k) ? f.date(v(k)) : unknown);
  const de = lang === "de";

  let summary: string;
  if (!x.textAvailable) {
    summary = de
      ? "Scan ohne Textebene – der Inhalt konnte nicht gelesen werden. Manuelle Erfassung oder OCR erforderlich."
      : "Scan without text layer – the content could not be read. Manual capture or OCR required.";
  } else {
    switch (x.docType) {
      case "purchase_order":
        summary = de
          ? `Bestellung ${no} von ${party}: ${items} Position(en), ${net != null ? f.money(net) + " netto" : "Betrag " + unknown}, Liefertermin ${date("deliveryDate")}.`
          : `Purchase order ${no} from ${party}: ${items} line(s), ${net != null ? f.money(net) + " net" : "amount " + unknown}, delivery date ${date("deliveryDate")}.`;
        break;
      case "invoice":
        summary = de
          ? `Rechnung ${no} von ${party} über ${v("grossTotal") ? f.money(Number(v("grossTotal"))) : unknown} brutto zu Bestellung ${ref}, fällig ${date("dueDate")}.`
          : `Invoice ${no} from ${party} for ${v("grossTotal") ? f.money(Number(v("grossTotal"))) : unknown} gross on order ${ref}, due ${date("dueDate")}.`;
        break;
      case "order_confirmation":
        summary = de
          ? `Auftragsbestätigung ${no} von ${party} zu Ihrer Bestellung ${ref}: ${items} Position(en), Liefertermin ${date("deliveryDate")}.`
          : `Order confirmation ${no} from ${party} for your order ${ref}: ${items} line(s), delivery date ${date("deliveryDate")}.`;
        break;
      case "delivery_note":
        summary = de
          ? `Lieferschein ${no} von ${party} zu Bestellung ${ref} mit ${items} Position(en).`
          : `Delivery note ${no} from ${party} for order ${ref} with ${items} line(s).`;
        break;
      case "rfq":
        summary = de
          ? `Anfrage ${no} von ${party} über ${items} Position(en). Angebot bis ${date("dueDate")}.`
          : `RFQ ${no} from ${party} for ${items} line(s). Quote due ${date("dueDate")}.`;
        break;
      case "delay_notice": {
        const delay = i.issues.find((issue) => issue.code === "DELIVERY_DELAY");
        const days = delay ? Number(delay.params.days) : null;
        summary = de
          ? `${party} meldet Verzug zu Bestellung ${ref}: neuer Termin ${date("deliveryDate")} statt ${date("originalDeliveryDate")}${days ? ` (+${days} Tage)` : ""}.`
          : `${party} reports a delay for order ${ref}: new date ${date("deliveryDate")} instead of ${date("originalDeliveryDate")}${days ? ` (+${days} days)` : ""}.`;
        break;
      }
      default:
        summary = de
          ? "Kein Geschäftsdokument erkannt (z. B. Newsletter oder Werbung)."
          : "No business document recognised (e.g. newsletter or advertising).";
    }
  }

  const relevant = i.issues.filter((issue) => issue.status === "open" && issue.code !== "LOW_CONFIDENCE");
  if (relevant.length > 0) {
    const titles = relevant.slice(0, 2).map((issue) => issueText(issue, d, f, x.docType).title);
    summary += de ? ` Auffällig: ${titles.join("; ")}.` : ` Flagged: ${titles.join("; ")}.`;
  }

  let nextAction: string;
  const top = [...relevant].sort((a, b) => rank(a) - rank(b))[0];
  if (i.routing.route === "ignore") nextAction = de ? "Keine Aktion – archiviert." : "No action – archived.";
  else if (i.routing.route === "auto") {
    nextAction = i.autoTransferred
      ? x.docType === "purchase_order"
        ? de
          ? "Als Auftragsentwurf an das Demo-ERP übergeben – keine Aktion nötig."
          : "Transferred to the demo ERP as a draft order – no action needed."
        : x.docType === "order_confirmation"
          ? de
            ? "Bestätigten Termin im Demo-ERP hinterlegt – keine Aktion nötig."
            : "Confirmed date stored in the demo ERP – no action needed."
          : de
            ? "Wareneingang im Demo-ERP vorbereitet – keine Aktion nötig."
            : "Goods receipt prepared in the demo ERP – no action needed."
      : de
        ? "Automatisch verarbeitet – keine Aktion nötig."
        : "Processed automatically – no action needed.";
  } else if (top) {
    nextAction = issueText(top, d, f, x.docType).action;
  } else if (x.docType === "invoice") {
    nextAction = de ? "Rechnung prüfen und zur Zahlung freigeben." : "Check the invoice and approve for payment.";
  } else if (x.docType === "rfq") {
    nextAction = de ? `Angebot erstellen bis ${date("dueDate")}.` : `Prepare quote by ${date("dueDate")}.`;
  } else {
    nextAction = de ? "Daten bestätigen und übergeben." : "Confirm data and transfer.";
  }
  return { summary, nextAction };
}

const rank = (i: ValidationIssue) => (i.severity === "critical" ? 0 : i.severity === "warning" ? 1 : 2);

export function buildSummary(i: SummaryInput): { summary: LocalizedText; nextAction: LocalizedText } {
  const de = build("de", i);
  const en = build("en", i);
  return { summary: { de: de.summary, en: en.summary }, nextAction: { de: de.nextAction, en: en.nextAction } };
}
