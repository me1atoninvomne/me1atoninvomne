/**
 * Human readable texts for audit events and notifications. Events store an action code plus
 * parameters; the text is rendered in the viewer's language.
 */
import type { DocType } from "@/domain/types";
import { defineDict, type Formatters, type Lang } from "./core";
import { dom, type DomainDict } from "./domain";

type P = Record<string, unknown>;
type R = (p: P, d: DomainDict, f: Formatters) => string;

const s = (v: unknown) => (v == null || v === "" ? "—" : String(v));
const dt = (d: DomainDict, v: unknown) => (v ? d.docType[v as DocType] ?? s(v) : "—");
const list = (v: unknown) => (Array.isArray(v) ? v.join(", ") : s(v));

const de: Record<string, R> = {
  "workspace.created": (p) => `Demo-Arbeitsbereich angelegt (Branchenvorlage: ${s(p.industryLabel)}). Alle Daten sind synthetisch.`,
  "workspace.reset": () => "Demo auf den Ausgangszustand zurückgesetzt.",
  "workspace.industry_changed": (p) => `Branchenvorlage gewechselt zu ${s(p.industryLabel)}.`,
  "email.received": (p) => `E-Mail eingegangen von ${s(p.from)}: „${s(p.subject)}“${Number(p.attachments) ? ` (${p.attachments} Anhang)` : ""}.`,
  "email.processed": (p) => `E-Mail verarbeitet: ${s(p.documents)} Dokument(e) in ${s(p.durationMs)} ms.`,
  "email.failed": (p) => `Verarbeitung fehlgeschlagen: ${s(p.error)}`,
  "document.text_extracted": (p) =>
    p.hasText
      ? `Text gelesen (${p.source === "pdf" ? "PDF-Textebene" : "E-Mail-Text"}): ${s(p.lines)} Zeilen, ${s(p.pages)} Seite(n).`
      : "Keine Textebene gefunden – das Dokument ist ein reiner Scan.",
  "document.classified": (p, d, f) => `Als ${dt(d, p.docType)} erkannt (Sicherheit ${f.percent(Number(p.confidence))}) durch ${s(p.providerLabel ?? p.provider)}.`,
  "document.extracted": (p) =>
    `${s(p.fieldsFound)} Felder und ${s(p.lineItems)} Positionen extrahiert.${Array.isArray(p.missingLabels) && p.missingLabels.length ? ` Nicht gefunden: ${list(p.missingLabels)}.` : ""}`,
  "document.matched": (p) => (p.matched ? `Stammdaten-Treffer: ${s(p.name)} (${s(p.matched)}).` : "Kein Treffer in den Stammdaten."),
  "document.validated": (p) =>
    Array.isArray(p.titles) && p.titles.length ? `${p.titles.length} Prüfhinweis(e): ${list(p.titles)}.` : "Alle Prüfungen ohne Befund.",
  "rules.evaluated": (p) =>
    Array.isArray(p.matchedNames) && p.matchedNames.length ? `Regeln ausgewertet – zutreffend: ${list(p.matchedNames)}.` : `Regeln ausgewertet (${s(p.evaluated)}) – keine trifft zu.`,
  "document.routed": (p, d) => {
    const route = d.route[p.route as keyof DomainDict["route"]] ?? s(p.route);
    const why = Array.isArray(p.reasonTexts) && p.reasonTexts.length ? ` Begründung: ${list(p.reasonTexts)}` : "";
    return `Entscheidung: ${route} → ${d.department[p.department as keyof DomainDict["department"]] ?? s(p.department)}.${why}`;
  },
  "task.created": (p, d) => `Aufgabe angelegt: ${d.taskType[p.type as keyof DomainDict["taskType"]] ?? s(p.type)} für ${d.department[p.department as keyof DomainDict["department"]] ?? s(p.department)}.`,
  "task.completed": (p) => `Aufgabe erledigt: ${s(p.title)}.`,
  "notification.sent": (p, d) => `In-App-Benachrichtigung an ${d.department[p.department as keyof DomainDict["department"]] ?? s(p.department)}.`,
  "erp.staged": (p) => `An ${s(p.connectorLabel)} übergeben: ${s(p.kindLabel)} ${s(p.externalRef)} (Entwurf, keine Buchung).`,
  "erp.blocked": (p) => `Übergabe blockiert: ${s(p.reason)}`,
  "field.corrected": (p) => `Feld „${s(p.label)}“ korrigiert: ${s(p.from)} → ${s(p.to)}.`,
  "lineitem.corrected": (p) => `Position ${s(p.pos)}, ${s(p.label)} korrigiert: ${s(p.from)} → ${s(p.to)}.`,
  "field.confirmed": (p) => `Feld „${s(p.label)}“ geprüft und bestätigt: ${s(p.value)}.`,
  "issue.reopened": (p) => `Abweichung wieder geöffnet: „${s(p.title)}“.`,
  "document.revalidated": (p) => `Nach Korrektur neu geprüft: ${s(p.open)} offene Abweichung(en).`,
  "issue.accepted": (p) => `Abweichung akzeptiert: „${s(p.title)}“. Begründung: ${s(p.note)}`,
  "issue.resolved": (p) => `Abweichung als behoben markiert: „${s(p.title)}“.`,
  "document.approved": (p) => `Freigegeben${p.note ? `: ${s(p.note)}` : "."}${p.reviewSeconds ? ` Bearbeitungszeit ${Math.round(Number(p.reviewSeconds) / 6) / 10} Min.` : ""}`,
  "document.rejected": (p) => `Abgelehnt: ${s(p.note)}`,
  "document.info_requested": (p) => `Rückfrage vorbereitet an ${s(p.to)} (Entwurf – im Demo-Modus nicht versendet).`,
  "document.handed_over": (p) => `Übergeben an ${s(p.toName)}${p.note ? `: ${s(p.note)}` : "."}`,
  "document.approval_denied": (p) => `Freigabe verweigert: ${s(p.reason)}`,
  "workflow.updated": (p) => `Workflow „${s(p.name)}“ geändert (Version ${s(p.version)}): ${list(p.changes)}.`,
  "workflow.toggled": (p) => `Workflow „${s(p.name)}“ ${p.active ? "aktiviert" : "deaktiviert"}.`,
  "rule.created": (p) => `Regel angelegt: „${s(p.name)}“.`,
  "rule.updated": (p) => `Regel geändert: „${s(p.name)}“.`,
  "rule.deleted": (p) => `Regel gelöscht: „${s(p.name)}“.`,
  "rule.toggled": (p) => `Regel „${s(p.name)}“ ${p.enabled ? "aktiviert" : "deaktiviert"}.`,
  "settings.updated": (p) => `Einstellungen geändert: ${s(p.sectionLabel ?? p.section)}.`,
  "retention.applied": (p) => `Aufbewahrungsregel angewendet: ${s(p.count)} Dokument(e) älter als ${s(p.days)} Tage bereinigt.`,
  "user.role_changed": (p, d) => `Rolle von ${s(p.name)} geändert: ${d.role[p.from as keyof DomainDict["role"]]} → ${d.role[p.to as keyof DomainDict["role"]]}.`,
  "session.user_switched": (p) => `Angemeldet als ${s(p.name)} (Demo-Benutzerwechsel).`,
  "upload.received": (p) => `Datei hochgeladen: ${s(p.fileName)} (${s(p.sizeKb)} KB).`,
  "simulation.email_injected": (p) => `Demo-E-Mail eingespielt: „${s(p.subject)}“.`,
  "export.csv": (p) => `CSV-Export erstellt: ${s(p.kind)}.`,
};

const en: Record<string, R> = {
  "workspace.created": (p) => `Demo workspace created (industry template: ${s(p.industryLabel)}). All data is synthetic.`,
  "workspace.reset": () => "Demo reset to its initial state.",
  "workspace.industry_changed": (p) => `Industry template changed to ${s(p.industryLabel)}.`,
  "email.received": (p) => `E-mail received from ${s(p.from)}: "${s(p.subject)}"${Number(p.attachments) ? ` (${p.attachments} attachment)` : ""}.`,
  "email.processed": (p) => `E-mail processed: ${s(p.documents)} document(s) in ${s(p.durationMs)} ms.`,
  "email.failed": (p) => `Processing failed: ${s(p.error)}`,
  "document.text_extracted": (p) =>
    p.hasText
      ? `Text read (${p.source === "pdf" ? "PDF text layer" : "e-mail text"}): ${s(p.lines)} lines, ${s(p.pages)} page(s).`
      : "No text layer found – the document is an image-only scan.",
  "document.classified": (p, d, f) => `Recognised as ${dt(d, p.docType)} (confidence ${f.percent(Number(p.confidence))}) by ${s(p.providerLabel ?? p.provider)}.`,
  "document.extracted": (p) =>
    `${s(p.fieldsFound)} fields and ${s(p.lineItems)} line items extracted.${Array.isArray(p.missingLabels) && p.missingLabels.length ? ` Not found: ${list(p.missingLabels)}.` : ""}`,
  "document.matched": (p) => (p.matched ? `Master data match: ${s(p.name)} (${s(p.matched)}).` : "No match in master data."),
  "document.validated": (p) => (Array.isArray(p.titles) && p.titles.length ? `${p.titles.length} finding(s): ${list(p.titles)}.` : "All checks passed without findings."),
  "rules.evaluated": (p) =>
    Array.isArray(p.matchedNames) && p.matchedNames.length ? `Rules evaluated – matching: ${list(p.matchedNames)}.` : `Rules evaluated (${s(p.evaluated)}) – none matched.`,
  "document.routed": (p, d) => {
    const route = d.route[p.route as keyof DomainDict["route"]] ?? s(p.route);
    const why = Array.isArray(p.reasonTexts) && p.reasonTexts.length ? ` Reason: ${list(p.reasonTexts)}` : "";
    return `Decision: ${route} → ${d.department[p.department as keyof DomainDict["department"]] ?? s(p.department)}.${why}`;
  },
  "task.created": (p, d) => `Task created: ${d.taskType[p.type as keyof DomainDict["taskType"]] ?? s(p.type)} for ${d.department[p.department as keyof DomainDict["department"]] ?? s(p.department)}.`,
  "task.completed": (p) => `Task completed: ${s(p.title)}.`,
  "notification.sent": (p, d) => `In-app notification to ${d.department[p.department as keyof DomainDict["department"]] ?? s(p.department)}.`,
  "erp.staged": (p) => `Transferred to ${s(p.connectorLabel)}: ${s(p.kindLabel)} ${s(p.externalRef)} (draft, no posting).`,
  "erp.blocked": (p) => `Transfer blocked: ${s(p.reason)}`,
  "field.corrected": (p) => `Field "${s(p.label)}" corrected: ${s(p.from)} → ${s(p.to)}.`,
  "lineitem.corrected": (p) => `Line ${s(p.pos)}, ${s(p.label)} corrected: ${s(p.from)} → ${s(p.to)}.`,
  "field.confirmed": (p) => `Field "${s(p.label)}" checked and confirmed: ${s(p.value)}.`,
  "issue.reopened": (p) => `Deviation reopened: "${s(p.title)}".`,
  "document.revalidated": (p) => `Re-checked after correction: ${s(p.open)} open deviation(s).`,
  "issue.accepted": (p) => `Deviation accepted: "${s(p.title)}". Reason: ${s(p.note)}`,
  "issue.resolved": (p) => `Deviation marked as resolved: "${s(p.title)}".`,
  "document.approved": (p) => `Approved${p.note ? `: ${s(p.note)}` : "."}${p.reviewSeconds ? ` Handling time ${Math.round(Number(p.reviewSeconds) / 6) / 10} min.` : ""}`,
  "document.rejected": (p) => `Rejected: ${s(p.note)}`,
  "document.info_requested": (p) => `Query prepared for ${s(p.to)} (draft – not sent in demo mode).`,
  "document.handed_over": (p) => `Handed over to ${s(p.toName)}${p.note ? `: ${s(p.note)}` : "."}`,
  "document.approval_denied": (p) => `Approval denied: ${s(p.reason)}`,
  "workflow.updated": (p) => `Workflow "${s(p.name)}" changed (version ${s(p.version)}): ${list(p.changes)}.`,
  "workflow.toggled": (p) => `Workflow "${s(p.name)}" ${p.active ? "activated" : "deactivated"}.`,
  "rule.created": (p) => `Rule created: "${s(p.name)}".`,
  "rule.updated": (p) => `Rule changed: "${s(p.name)}".`,
  "rule.deleted": (p) => `Rule deleted: "${s(p.name)}".`,
  "rule.toggled": (p) => `Rule "${s(p.name)}" ${p.enabled ? "enabled" : "disabled"}.`,
  "settings.updated": (p) => `Settings changed: ${s(p.sectionLabel ?? p.section)}.`,
  "retention.applied": (p) => `Retention rule applied: ${s(p.count)} document(s) older than ${s(p.days)} days cleaned up.`,
  "user.role_changed": (p, d) => `Role of ${s(p.name)} changed: ${d.role[p.from as keyof DomainDict["role"]]} → ${d.role[p.to as keyof DomainDict["role"]]}.`,
  "session.user_switched": (p) => `Signed in as ${s(p.name)} (demo user switch).`,
  "upload.received": (p) => `File uploaded: ${s(p.fileName)} (${s(p.sizeKb)} KB).`,
  "simulation.email_injected": (p) => `Demo e-mail injected: "${s(p.subject)}".`,
  "export.csv": (p) => `CSV export created: ${s(p.kind)}.`,
};

export const auditDict = defineDict({ de, en });

/** Params may hold `{ de, en }` pairs (e.g. issue titles rendered at write time); pick the viewer's language. */
function localizeParams(params: P, lang: Lang): P {
  const out: P = {};
  for (const [k, v] of Object.entries(params)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && "de" in v && "en" in v ? (v as Record<Lang, unknown>)[lang] : v;
  }
  return out;
}

export function auditText(action: string, params: P, lang: Lang, f: Formatters): string {
  const r = auditDict[lang][action];
  return r ? r(localizeParams(params, lang), dom(lang), f) : action;
}

/* ---------- Notifications ---------- */

type N = (p: Record<string, unknown>, d: DomainDict, f: Formatters) => string;

const nde: Record<string, N> = {
  auto_processed: (p, d) => `${d.docType[p.docType as DocType]} ${s(p.number)} von ${s(p.party)} automatisch verarbeitet.`,
  review_needed: (p, d) => `${d.docType[p.docType as DocType]} ${s(p.number)} von ${s(p.party)} braucht eine Prüfung: ${s(p.topIssue)}`,
  approval_needed: (p, d) => `${d.docType[p.docType as DocType]} ${s(p.number)} von ${s(p.party)} wartet auf Freigabe.`,
  delay_alert: (p) => `Lieferverzug ${p.days} Tage zu ${p.reference}${p.affectedOrders ? ` – gefährdet: ${p.affectedOrders}` : ""}.`,
  rule_notify: (p, d) => `Regel „${p.rule}“: ${d.docType[p.docType as DocType]} ${s(p.number)} von ${s(p.party)}.`,
  approved: (p, d) => `${d.docType[p.docType as DocType]} ${s(p.number)} wurde von ${p.by} freigegeben.`,
  erp_staged: (p) => `Im Demo-ERP angelegt: ${p.externalRef}.`,
  handed_over: (p, d) => `${p.by} hat Ihnen ${d.docType[p.docType as DocType]} ${s(p.number)} übergeben.`,
};
const nen: Record<string, N> = {
  auto_processed: (p, d) => `${d.docType[p.docType as DocType]} ${s(p.number)} from ${s(p.party)} processed automatically.`,
  review_needed: (p, d) => `${d.docType[p.docType as DocType]} ${s(p.number)} from ${s(p.party)} needs a review: ${s(p.topIssue)}`,
  approval_needed: (p, d) => `${d.docType[p.docType as DocType]} ${s(p.number)} from ${s(p.party)} awaits approval.`,
  delay_alert: (p) => `Delivery delay of ${p.days} days for ${p.reference}${p.affectedOrders ? ` – at risk: ${p.affectedOrders}` : ""}.`,
  rule_notify: (p, d) => `Rule "${p.rule}": ${d.docType[p.docType as DocType]} ${s(p.number)} from ${s(p.party)}.`,
  approved: (p, d) => `${d.docType[p.docType as DocType]} ${s(p.number)} was approved by ${p.by}.`,
  erp_staged: (p) => `Created in demo ERP: ${p.externalRef}.`,
  handed_over: (p, d) => `${p.by} handed ${d.docType[p.docType as DocType]} ${s(p.number)} over to you.`,
};
export const notificationDict = defineDict({ de: nde, en: nen });

export function notificationText(kind: string, params: Record<string, unknown>, lang: Lang, f: Formatters): string {
  const r = notificationDict[lang][kind];
  return r ? r(localizeParams(params, lang), dom(lang), f) : kind;
}
