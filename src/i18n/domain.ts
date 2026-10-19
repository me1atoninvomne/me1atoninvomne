/**
 * Domain vocabulary in German (primary) and English. Texts for validation findings explain
 * what happened, why it matters and what to do – they are shown in review, exception radar,
 * e-mail summaries and the audit log.
 */
import type { Department, DocType, FieldKey, IssueCode, Role, RouteReason, ValidationIssue } from "@/domain/types";
import type { DocumentStatus } from "@/server/db/schema";
import { defineDict, fmt, type Formatters, type Lang } from "./core";

type P = Record<string, string | number | null | undefined>;

export interface IssueText {
  title: string;
  why: string;
  recommendation: string;
  action: string;
}

const de = {
  docType: {
    purchase_order: "Bestellung",
    invoice: "Rechnung",
    order_confirmation: "Auftragsbestätigung",
    delivery_note: "Lieferschein",
    rfq: "Anfrage",
    delay_notice: "Lieferverzug",
    other: "Sonstiges",
  } satisfies Record<DocType, string>,
  docTypePlural: {
    purchase_order: "Bestellungen",
    invoice: "Rechnungen",
    order_confirmation: "Auftragsbestätigungen",
    delivery_note: "Lieferscheine",
    rfq: "Anfragen",
    delay_notice: "Verzugsmeldungen",
    other: "Sonstige",
  } satisfies Record<DocType, string>,
  field: {
    documentNumber: "Belegnummer",
    documentDate: "Belegdatum",
    partyName: "Absender (Firma)",
    partyNumber: "Kundennummer",
    referenceNumber: "Bezug (Ihre Bestellung)",
    deliveryDate: "Liefertermin",
    originalDeliveryDate: "Ursprünglicher Termin",
    deliveryAddress: "Lieferanschrift",
    paymentTerms: "Zahlungsbedingungen",
    netTotal: "Nettobetrag",
    vatRate: "USt-Satz",
    vatAmount: "USt-Betrag",
    grossTotal: "Bruttobetrag",
    currency: "Währung",
    iban: "IBAN",
    vatId: "USt-IdNr.",
    dueDate: "Fällig / Frist",
    contactPerson: "Ansprechpartner",
    delayReason: "Grund",
  } satisfies Record<FieldKey, string>,
  fieldByType: {
    documentNumber: {
      purchase_order: "Bestellnummer",
      invoice: "Rechnungsnummer",
      order_confirmation: "AB-Nummer",
      delivery_note: "Lieferschein-Nr.",
      rfq: "Anfragenummer",
      delay_notice: "Vorgangs-/Sendungsnr.",
    },
    dueDate: { invoice: "Fällig am", rfq: "Angebot bis" },
    deliveryDate: { purchase_order: "Wunschliefertermin", order_confirmation: "Bestätigter Termin", delay_notice: "Neuer Termin", rfq: "Gewünschter Termin" },
    partyName: { purchase_order: "Kunde", rfq: "Kunde", invoice: "Lieferant", order_confirmation: "Lieferant", delivery_note: "Lieferant", delay_notice: "Lieferant / Spediteur" },
  } as Partial<Record<FieldKey, Partial<Record<DocType, string>>>>,
  lineItem: { pos: "Pos.", articleNo: "Artikel-Nr.", description: "Bezeichnung", quantity: "Menge", unit: "Einheit", unitPrice: "Einzelpreis", total: "Gesamt" },
  status: {
    received: "Eingegangen",
    auto_processed: "Automatisch verarbeitet",
    needs_review: "Prüfung erforderlich",
    needs_approval: "Freigabe erforderlich",
    info_requested: "Rückfrage offen",
    approved: "Freigegeben",
    rejected: "Abgelehnt",
    exported: "An ERP übergeben",
    ignored: "Keine Aktion",
    error: "Fehler",
  } satisfies Record<DocumentStatus, string>,
  emailStatus: { new: "Neu", processing: "In Verarbeitung", processed: "Verarbeitet", error: "Fehler" },
  route: { auto: "Automatisch", review: "Prüfung", approval: "Freigabe", ignore: "Ignoriert" },
  department: {
    sales: "Vertrieb / Innendienst",
    purchasing: "Einkauf",
    accounting: "Buchhaltung",
    logistics: "Logistik / Disposition",
    production: "Produktionsplanung",
    management: "Geschäftsleitung",
  } satisfies Record<Department, string>,
  role: { admin: "Administrator", manager: "Teamleitung", clerk: "Sachbearbeitung", viewer: "Nur Lesen" } satisfies Record<Role, string>,
  roleDescription: {
    admin: "Alle Rechte inkl. Benutzer, Integrationen, Datenaufbewahrung und Zurücksetzen.",
    manager: "Freigaben über Limit, kritische Abweichungen akzeptieren, Workflows und Regeln ändern.",
    clerk: "Dokumente prüfen, korrigieren, im Rahmen der Limits freigeben, Rückfragen stellen.",
    viewer: "Lesezugriff auf Posteingang, Auswertungen und Protokoll.",
  } satisfies Record<Role, string>,
  priority: { high: "Hoch", normal: "Normal", low: "Niedrig" },
  severity: { critical: "Kritisch", warning: "Warnung", info: "Hinweis" },
  issueStatus: { open: "Offen", resolved: "Behoben", accepted: "Akzeptiert" },
  taskType: {
    review: "Prüfen",
    approval: "Freigeben",
    quote: "Angebot erstellen",
    delay: "Verzug bewerten",
    info_request: "Rückfrage",
    follow_up: "Nachfassen",
  },
  taskStatus: { open: "Offen", done: "Erledigt", cancelled: "Abgebrochen" },
  priceSource: { agreed: "Vereinbarter Preis (Rahmenvertrag)", list: "Listenpreis", order: "Preis laut Ihrer Bestellung" },
  unknown: "nicht erkannt",
  issue: {
    MISSING_REQUIRED_FIELD: (p: P) => ({
      title: `Pflichtangabe fehlt: ${p.fieldLabel}`,
      why: `Ohne „${p.fieldLabel}“ lässt sich der Vorgang nicht vollständig erfassen. FlowPilot setzt keinen Wert ein, der nicht im Dokument steht.`,
      recommendation: "Angabe beim Absender erfragen oder aus einer verlässlichen Quelle ergänzen.",
      action: `${p.fieldLabel} ergänzen`,
    }),
    MISSING_DELIVERY_DATE: () => ({
      title: "Liefertermin fehlt",
      why: "Ohne Liefertermin ist weder eine Terminzusage noch eine Produktions- oder Versandplanung möglich. Späte Rückfragen verzögern die Auftragsbestätigung.",
      recommendation: "Wunschtermin beim Kunden erfragen – FlowPilot bereitet die Rückfrage vor.",
      action: "Liefertermin erfragen",
    }),
    LOW_CONFIDENCE: (p: P) => ({
      title: `Unsichere Erkennung: ${p.fieldLabel} (${p.confidence} %)`,
      why: "Der Wert wurde gefunden, aber nicht eindeutig gelesen. Eine kurze Sichtprüfung verhindert Folgefehler.",
      recommendation: "Wert mit dem Originaldokument vergleichen und bestätigen oder korrigieren.",
      action: "Wert gegenprüfen",
    }),
    UNKNOWN_PARTY: (p: P) =>
      p.role === "supplier"
        ? {
            title: `Unbekannter Lieferant: ${p.name}`,
            why: "Der Absender ist nicht im Lieferantenstamm. Rechnungen unbekannter Absender sind ein typisches Einfallstor für Betrugsversuche.",
            recommendation: "Lieferant über bekannte Kontaktdaten verifizieren, bevor die Rechnung bearbeitet wird.",
            action: "Lieferant verifizieren",
          }
        : {
            title: `Unbekannter Kunde: ${p.name}`,
            why: "Der Absender ist nicht im Kundenstamm. Ohne Kundennummer, Bonitätsprüfung und Konditionen sollte kein Auftrag angelegt werden.",
            recommendation: "Neukunde anlegen und Bonität prüfen oder den Absender einem bestehenden Kunden zuordnen.",
            action: "Neukunde prüfen",
          },
    PRICE_MISMATCH: (p: P) => ({
      title: `Preisabweichung Pos. ${p.pos} (${p.articleNo}): ${p.diffPct} %`,
      why: `Im Dokument: ${p.documentPrice} je Einheit. ${p.priceSourceLabel}: ${p.expectedPrice}. Auswirkung auf den Gesamtwert: ${p.impact}.`,
      recommendation: "Preis mit dem Geschäftspartner klären. Abweichung nur mit Begründung akzeptieren, sonst korrigieren.",
      action: "Preis klären",
    }),
    UNKNOWN_ARTICLE: (p: P) => ({
      title: `Artikel nicht zugeordnet: Pos. ${p.pos} ${p.articleNo}`,
      why: `„${p.description}“ ist nicht im Artikelstamm bzw. nicht in der Bestellung enthalten. Preis und Verfügbarkeit können nicht automatisch geprüft werden.`,
      recommendation: "Artikel zuordnen oder als Sonderanfertigung kennzeichnen.",
      action: "Artikel zuordnen",
    }),
    DUPLICATE_ORDER: (p: P) => ({
      title: `Mögliche Doppelbestellung: ${p.documentNumber}`,
      why:
        p.source === "erp"
          ? `Diese Bestellnummer ist bereits als Auftrag ${p.existing} vom ${p.existingDate} im ERP erfasst. Eine zweite Erfassung führt zu doppelter Lieferung und Rechnung.`
          : "Diese Bestellnummer wurde in diesem Posteingang bereits verarbeitet.",
      recommendation: "Mit dem bestehenden Auftrag abgleichen. Nur bei echter Zusatzbestellung neu anlegen.",
      action: "Duplikat prüfen",
    }),
    DUPLICATE_INVOICE: (p: P) => ({
      title: `Rechnung bereits erfasst: ${p.documentNumber}`,
      why:
        p.source === "erp"
          ? `Eine Rechnung mit dieser Nummer vom selben Lieferanten wurde am ${p.existingDate} bereits gebucht. Eine erneute Zahlung wäre eine Doppelzahlung.`
          : "Diese Rechnung wurde in diesem Posteingang bereits verarbeitet.",
      recommendation: "Nicht zur Zahlung freigeben. Als Kopie ablegen oder beim Lieferanten nachfragen.",
      action: "Nicht zahlen – Duplikat",
    }),
    QTY_MISMATCH: (p: P) => ({
      title: `Mengenabweichung Pos. ${p.pos}: ${p.document} statt ${p.ordered}`,
      why: `Bestellt wurden ${p.ordered} Einheiten (${p.reference}), im Dokument stehen ${p.document}. Fehlmengen gefährden Produktion und Termine, Mehrmengen führen zu Überzahlung.`,
      recommendation: "Abweichung mit dem Lieferanten klären und die Restmenge terminieren.",
      action: "Menge klären",
    }),
    DATE_SHIFT: (p: P) => ({
      title: `Späterer Liefertermin: +${p.days} Tage`,
      why: `Angefragt war der ${p.requested}, bestätigt wird der ${p.confirmed}. Abhängige Kundenaufträge und die Produktionsplanung müssen das berücksichtigen.`,
      recommendation: "Termin akzeptieren und die Planung informieren oder beim Lieferanten nachverhandeln.",
      action: "Termin bewerten",
    }),
    SUM_MISMATCH: (p: P) =>
      p.kind === "line"
        ? {
            title: `Rechenfehler in Pos. ${p.pos}`,
            why: `Menge × Einzelpreis ergibt ${p.computed}, ausgewiesen sind ${p.stated}.`,
            recommendation: "Beim Absender klären, welcher Betrag gilt.",
            action: "Betrag klären",
          }
        : {
            title: `Summe stimmt nicht: Positionen ${p.computed}, Dokument ${p.stated}`,
            why: `Die Positionen ergeben ${p.computed}, ausgewiesen sind ${p.stated} (Differenz ${p.diff}). Typische Ursache: Zahlendreher oder fehlende Position.`,
            recommendation: "Korrigiertes Dokument anfordern und nicht mit abweichendem Betrag weiterverarbeiten.",
            action: "Korrektur anfordern",
          },
    VAT_MISMATCH: (p: P) =>
      p.kind === "gross"
        ? {
            title: "Bruttobetrag ≠ Netto + USt",
            why: `Netto + USt ergeben ${p.expected}, ausgewiesen sind ${p.stated}.`,
            recommendation: "Korrigierte Rechnung anfordern.",
            action: "Korrektur anfordern",
          }
        : {
            title: "Umsatzsteuer passt nicht zum Nettobetrag",
            why: `${p.rate} % auf ${p.net} ergeben ${p.expected}, ausgewiesen sind ${p.stated}. Eine fehlerhafte Steuer gefährdet den Vorsteuerabzug.`,
            recommendation: "Korrigierte Rechnung anfordern.",
            action: "Korrektur anfordern",
          },
    IBAN_CHANGED: (p: P) => ({
      title: "Bankverbindung weicht von den Stammdaten ab",
      why: `Die Rechnung nennt die IBAN ${p.documentIban}, hinterlegt ist ${p.masterIban}. Geänderte Bankdaten per E-Mail sind ein häufiges Muster bei Rechnungsbetrug.`,
      recommendation: `Vor jeder Zahlung telefonisch über die bekannte Nummer ${p.phone} verifizieren – nicht über Kontaktdaten aus dieser E-Mail. Stammdaten erst nach Bestätigung ändern.`,
      action: "Rückruf über bekannte Nummer",
    }),
    IBAN_INVALID: (p: P) => ({
      title: "Ungültige IBAN",
      why: `Die Prüfziffer der IBAN ${p.iban} ist ungültig. Eine Überweisung würde fehlschlagen.`,
      recommendation: "Korrekte Bankverbindung über bekannte Kontaktdaten erfragen.",
      action: "Bankdaten klären",
    }),
    REFERENCE_NOT_FOUND: (p: P) => ({
      title: `Bezug nicht gefunden: ${p.reference}`,
      why: `Das Dokument verweist auf ${p.reference}. Diese Bestellung ist im ERP nicht bekannt – Menge und Preis können nicht abgeglichen werden.`,
      recommendation: "Richtige Bestellnummer ermitteln und zuordnen.",
      action: "Bezug zuordnen",
    }),
    DELIVERY_DELAY: (p: P) =>
      Number(p.affectedCount) > 0
        ? {
            title: `Lieferverzug ${p.days} Tage zu ${p.reference}`,
            why: `Neuer Termin ${p.newDate} statt ${p.original}. Gefährdet: ${p.affectedCount} Kundenauftrag (${p.affectedOrders}, ${p.customers}) – der Wunschtermin liegt vor dem neuen Liefertermin.`,
            recommendation: "Kunden proaktiv informieren, Alternativlieferant prüfen oder Produktion umplanen.",
            action: "Kunden informieren / umplanen",
          }
        : {
            title: `Lieferverzug ${p.days} Tage zu ${p.reference}`,
            why: `Neuer Termin ${p.newDate} statt ${p.original}. Kein offener Kundenauftrag ist direkt gefährdet.`,
            recommendation: "Termin im ERP aktualisieren und die Planung informieren.",
            action: "Termin aktualisieren",
          },
    NO_TEXT_LAYER: () => ({
      title: "Kein lesbarer Text (Scan)",
      why: "Das PDF enthält nur ein Bild. Ohne Texterkennung (OCR) lassen sich keine Daten lesen – FlowPilot rät keine Werte.",
      recommendation: "Dokument manuell erfassen oder einen OCR-Dienst anbinden (in der Demo nicht aktiv).",
      action: "Manuell erfassen",
    }),
    DEADLINE_SOON: (p: P) => ({
      title: Number(p.days) <= 0 ? `Angebotsfrist ${p.date} – heute oder überschritten` : `Angebotsfrist ${p.date} (in ${p.days} Tagen)`,
      why: "Nach Fristablauf wird ein Angebot meist nicht mehr berücksichtigt.",
      recommendation: "Angebot priorisiert erstellen.",
      action: "Angebot priorisieren",
    }),
    DATE_IN_PAST: (p: P) => ({
      title: `Termin liegt in der Vergangenheit: ${p.date}`,
      why: "Der angegebene Termin ist bereits verstrichen – vermutlich ein Tipp- oder Übernahmefehler.",
      recommendation: "Korrekten Termin beim Absender erfragen.",
      action: "Termin klären",
    }),
  } satisfies Record<IssueCode, (p: P) => IssueText>,
  reason: {
    GUARDRAIL_CRITICAL_ISSUE: (p: P) => `${p.count} kritische Abweichung(en) – automatische Verarbeitung ist gesperrt.`,
    GUARDRAIL_MISSING_FIELDS: (p: P) => `${p.count} Pflichtangabe(n) fehlen.`,
    GUARDRAIL_LOW_CONFIDENCE: (p: P) => `Erkennungssicherheit ${p.confidence} % liegt unter der Schwelle von ${p.threshold} %.`,
    GUARDRAIL_UNKNOWN_PARTY: () => "Geschäftspartner ist nicht in den Stammdaten.",
    GUARDRAIL_NO_TEXT: () => "Kein maschinenlesbarer Text vorhanden.",
    GUARDRAIL_FINANCIAL: () => "Finanzrelevantes Dokument – die Freigabe erfolgt immer durch einen Menschen.",
    GUARDRAIL_OPEN_WARNINGS: (p: P) => `${p.count} offene Abweichung(en) müssen geklärt werden.`,
    POLICY_AUTO_DISABLED: () => "Automatische Verarbeitung ist für diesen Prozess nicht freigegeben.",
    POLICY_AMOUNT_ABOVE_AUTO_LIMIT: (p: P) => `Betrag ${p.amount} liegt über der Grenze für automatische Verarbeitung (${p.limit}).`,
    POLICY_APPROVAL_LIMIT: (p: P) => `Betrag ${p.amount} liegt über dem Freigabelimit (${p.limit}) – Freigabe durch die Teamleitung.`,
    RULE_REQUIRE_APPROVAL: (p: P) => `Regel „${p.ruleName}“ verlangt eine Freigabe durch ${p.roleLabel}.`,
    RULE_REVIEW: (p: P) => `Regel „${p.ruleName}“ verlangt eine Prüfung.`,
    RULE_CONTINUE: (p: P) => `Regel „${p.ruleName}“ erfüllt.`,
    NO_CONTINUE_RULE: () => "Keine Regel für die automatische Weitergabe hat gegriffen.",
    NOT_BUSINESS_DOCUMENT: () => "Kein Geschäftsdokument – keine Aktion erforderlich.",
    ALL_CHECKS_PASSED: () => "Alle Prüfungen bestanden – automatische Verarbeitung im Rahmen der freigegebenen Regeln.",
    HUMAN_CORRECTED: () => "Alle Prüfungen bestanden. Weil das Dokument manuell bearbeitet wurde, ist eine Bestätigung erforderlich.",
  } satisfies Record<RouteReason["code"], (p: P) => string>,
  condition: {
    field: {
      partyKnown: "Geschäftspartner ist bekannt",
      allRequiredFields: "Alle Pflichtangaben vorhanden",
      noOpenIssues: "Keine offenen Abweichungen",
      hasCriticalIssue: "Kritische Abweichung vorhanden",
      netAmount: "Nettobetrag (€)",
      minConfidence: "Erkennungssicherheit (%)",
      delayDays: "Verzug (Tage)",
      deliveryLeadDays: "Tage bis Wunschtermin",
      priceDeviationPct: "Preisabweichung (%)",
    },
    op: { is_true: "ist erfüllt", is_false: "ist nicht erfüllt", gt: "größer als", gte: "mindestens", lt: "kleiner als", lte: "höchstens" },
    if: "Wenn",
    and: "und",
    then: "dann",
    always: "Immer",
  },
  action: {
    continue: "automatisch an den nächsten Schritt übergeben",
    require_approval: "Freigabe verlangen durch",
    route_review: "zur Prüfung geben an",
    notify: "benachrichtigen:",
    set_priority: "Priorität setzen:",
  },
  step: {
    trigger: { title: "Neue E-Mail", text: "Postfach oder Upload liefert E-Mail und Anhänge." },
    classify: { title: "Dokument klassifizieren", text: "Dokumenttyp anhand von Titel, Feldern und Formulierungen erkennen." },
    extract: { title: "Daten extrahieren", text: "Belegfelder und Positionen lesen – unbekannte Werte bleiben leer." },
    match: { title: "Stammdaten abgleichen", text: "Kunde bzw. Lieferant, Artikel und Bestellung im ERP finden." },
    validate: { title: "Validieren", text: "Preise, Mengen, Summen, Duplikate, Bankdaten und Termine prüfen." },
    rules: { title: "Regeln anwenden", text: "Ihre No-Code-Regeln auswerten: Freigaben, Benachrichtigungen, Prioritäten." },
    gate: { title: "Sicherheit & Freigaben prüfen", text: "Konfidenz, Betragsgrenzen und Schutzregeln entscheiden über den Weg." },
    auto: { title: "Automatisch verarbeiten", text: "Nur wenn alles passt und der Prozess dafür freigegeben ist." },
    review: { title: "Prüfung durch Mitarbeitende", text: "Abweichungen klären, korrigieren, freigeben oder ablehnen." },
    transfer: { title: "An ERP übergeben", text: "Als Entwurf in die Demo-ERP-Sandbox – keine Buchung, keine Zahlung." },
    notify: { title: "Benachrichtigen", text: "Zuständige Abteilung erhält eine In-App-Benachrichtigung." },
  },
};

const en: typeof de = {
  docType: {
    purchase_order: "Purchase order",
    invoice: "Invoice",
    order_confirmation: "Order confirmation",
    delivery_note: "Delivery note",
    rfq: "Request for quotation",
    delay_notice: "Delivery delay",
    other: "Other",
  },
  docTypePlural: {
    purchase_order: "Purchase orders",
    invoice: "Invoices",
    order_confirmation: "Order confirmations",
    delivery_note: "Delivery notes",
    rfq: "RFQs",
    delay_notice: "Delay notices",
    other: "Other",
  },
  field: {
    documentNumber: "Document number",
    documentDate: "Document date",
    partyName: "Sender (company)",
    partyNumber: "Customer number",
    referenceNumber: "Reference (your order)",
    deliveryDate: "Delivery date",
    originalDeliveryDate: "Original date",
    deliveryAddress: "Delivery address",
    paymentTerms: "Payment terms",
    netTotal: "Net amount",
    vatRate: "VAT rate",
    vatAmount: "VAT amount",
    grossTotal: "Gross amount",
    currency: "Currency",
    iban: "IBAN",
    vatId: "VAT ID",
    dueDate: "Due / deadline",
    contactPerson: "Contact person",
    delayReason: "Reason",
  },
  fieldByType: {
    documentNumber: {
      purchase_order: "PO number",
      invoice: "Invoice number",
      order_confirmation: "Confirmation no.",
      delivery_note: "Delivery note no.",
      rfq: "RFQ number",
      delay_notice: "Case / shipment no.",
    },
    dueDate: { invoice: "Due date", rfq: "Quote due" },
    deliveryDate: { purchase_order: "Requested date", order_confirmation: "Confirmed date", delay_notice: "New date", rfq: "Requested date" },
    partyName: { purchase_order: "Customer", rfq: "Customer", invoice: "Supplier", order_confirmation: "Supplier", delivery_note: "Supplier", delay_notice: "Supplier / carrier" },
  },
  lineItem: { pos: "Pos.", articleNo: "Article no.", description: "Description", quantity: "Qty", unit: "Unit", unitPrice: "Unit price", total: "Total" },
  status: {
    received: "Received",
    auto_processed: "Processed automatically",
    needs_review: "Review required",
    needs_approval: "Approval required",
    info_requested: "Query pending",
    approved: "Approved",
    rejected: "Rejected",
    exported: "Transferred to ERP",
    ignored: "No action",
    error: "Error",
  },
  emailStatus: { new: "New", processing: "Processing", processed: "Processed", error: "Error" },
  route: { auto: "Automatic", review: "Review", approval: "Approval", ignore: "Ignored" },
  department: {
    sales: "Sales / inside sales",
    purchasing: "Purchasing",
    accounting: "Accounting",
    logistics: "Logistics / dispatch",
    production: "Production planning",
    management: "Management",
  },
  role: { admin: "Administrator", manager: "Team lead", clerk: "Clerk", viewer: "Read only" },
  roleDescription: {
    admin: "All permissions incl. users, integrations, data retention and reset.",
    manager: "Approvals above limit, accept critical findings, change workflows and rules.",
    clerk: "Review, correct and approve documents within limits, send queries.",
    viewer: "Read access to inbox, analytics and audit log.",
  },
  priority: { high: "High", normal: "Normal", low: "Low" },
  severity: { critical: "Critical", warning: "Warning", info: "Note" },
  issueStatus: { open: "Open", resolved: "Resolved", accepted: "Accepted" },
  taskType: {
    review: "Review",
    approval: "Approve",
    quote: "Prepare quote",
    delay: "Assess delay",
    info_request: "Query",
    follow_up: "Follow up",
  },
  taskStatus: { open: "Open", done: "Done", cancelled: "Cancelled" },
  priceSource: { agreed: "Agreed price (framework contract)", list: "List price", order: "Price in your purchase order" },
  unknown: "not recognised",
  issue: {
    MISSING_REQUIRED_FIELD: (p) => ({
      title: `Required field missing: ${p.fieldLabel}`,
      why: `Without "${p.fieldLabel}" the case cannot be captured completely. FlowPilot never fills in a value that is not in the document.`,
      recommendation: "Ask the sender or complete it from a reliable source.",
      action: `Complete ${p.fieldLabel}`,
    }),
    MISSING_DELIVERY_DATE: () => ({
      title: "Delivery date missing",
      why: "Without a delivery date there is no date commitment and no production or shipping plan. Late queries delay the order confirmation.",
      recommendation: "Ask the customer for the requested date – FlowPilot prepares the query.",
      action: "Ask for delivery date",
    }),
    LOW_CONFIDENCE: (p) => ({
      title: `Uncertain recognition: ${p.fieldLabel} (${p.confidence}%)`,
      why: "The value was found but not read unambiguously. A quick visual check prevents follow-up errors.",
      recommendation: "Compare with the original document and confirm or correct.",
      action: "Double-check value",
    }),
    UNKNOWN_PARTY: (p) =>
      p.role === "supplier"
        ? {
            title: `Unknown supplier: ${p.name}`,
            why: "The sender is not in the supplier master. Invoices from unknown senders are a typical entry point for fraud.",
            recommendation: "Verify the supplier via known contact details before processing the invoice.",
            action: "Verify supplier",
          }
        : {
            title: `Unknown customer: ${p.name}`,
            why: "The sender is not in the customer master. Without customer number, credit check and terms no order should be created.",
            recommendation: "Create the new customer and check credit, or map the sender to an existing customer.",
            action: "Check new customer",
          },
    PRICE_MISMATCH: (p) => ({
      title: `Price deviation pos. ${p.pos} (${p.articleNo}): ${p.diffPct}%`,
      why: `Document: ${p.documentPrice} per unit. ${p.priceSourceLabel}: ${p.expectedPrice}. Impact on total value: ${p.impact}.`,
      recommendation: "Clarify the price with the business partner. Only accept the deviation with a reason, otherwise correct it.",
      action: "Clarify price",
    }),
    UNKNOWN_ARTICLE: (p) => ({
      title: `Article not matched: pos. ${p.pos} ${p.articleNo}`,
      why: `"${p.description}" is not in the article master or the purchase order. Price and availability cannot be checked automatically.`,
      recommendation: "Map the article or mark it as a custom item.",
      action: "Map article",
    }),
    DUPLICATE_ORDER: (p) => ({
      title: `Possible duplicate order: ${p.documentNumber}`,
      why:
        p.source === "erp"
          ? `This PO number already exists as order ${p.existing} from ${p.existingDate} in the ERP. Entering it twice leads to double delivery and invoicing.`
          : "This PO number has already been processed in this inbox.",
      recommendation: "Compare with the existing order. Only create a new one for a genuine additional order.",
      action: "Check duplicate",
    }),
    DUPLICATE_INVOICE: (p) => ({
      title: `Invoice already recorded: ${p.documentNumber}`,
      why:
        p.source === "erp"
          ? `An invoice with this number from the same supplier was booked on ${p.existingDate}. Paying again would be a double payment.`
          : "This invoice has already been processed in this inbox.",
      recommendation: "Do not approve for payment. File as a copy or ask the supplier.",
      action: "Do not pay – duplicate",
    }),
    QTY_MISMATCH: (p) => ({
      title: `Quantity deviation pos. ${p.pos}: ${p.document} instead of ${p.ordered}`,
      why: `${p.ordered} units were ordered (${p.reference}), the document states ${p.document}. Shortfalls put production and dates at risk, excess quantities lead to overpayment.`,
      recommendation: "Clarify with the supplier and schedule the remaining quantity.",
      action: "Clarify quantity",
    }),
    DATE_SHIFT: (p) => ({
      title: `Later delivery date: +${p.days} days`,
      why: `Requested was ${p.requested}, confirmed is ${p.confirmed}. Dependent customer orders and production planning must take this into account.`,
      recommendation: "Accept the date and inform planning, or renegotiate with the supplier.",
      action: "Assess date",
    }),
    SUM_MISMATCH: (p) =>
      p.kind === "line"
        ? {
            title: `Calculation error in pos. ${p.pos}`,
            why: `Quantity × unit price gives ${p.computed}, the document states ${p.stated}.`,
            recommendation: "Clarify with the sender which amount applies.",
            action: "Clarify amount",
          }
        : {
            title: `Total does not match: lines ${p.computed}, document ${p.stated}`,
            why: `The line items add up to ${p.computed}, the document states ${p.stated} (difference ${p.diff}). Typical cause: transposed digits or a missing line.`,
            recommendation: "Request a corrected document; do not process with a deviating amount.",
            action: "Request correction",
          },
    VAT_MISMATCH: (p) =>
      p.kind === "gross"
        ? {
            title: "Gross ≠ net + VAT",
            why: `Net + VAT gives ${p.expected}, the document states ${p.stated}.`,
            recommendation: "Request a corrected invoice.",
            action: "Request correction",
          }
        : {
            title: "VAT does not match the net amount",
            why: `${p.rate}% of ${p.net} is ${p.expected}, the document states ${p.stated}. Incorrect VAT jeopardises input tax deduction.`,
            recommendation: "Request a corrected invoice.",
            action: "Request correction",
          },
    IBAN_CHANGED: (p) => ({
      title: "Bank details differ from master data",
      why: `The invoice states IBAN ${p.documentIban}, the master data has ${p.masterIban}. Changed bank details by e-mail are a common invoice-fraud pattern.`,
      recommendation: `Before any payment, verify by phone using the known number ${p.phone} – not contact details from this e-mail. Change master data only after confirmation.`,
      action: "Call back on known number",
    }),
    IBAN_INVALID: (p) => ({
      title: "Invalid IBAN",
      why: `The check digits of IBAN ${p.iban} are invalid. A transfer would fail.`,
      recommendation: "Obtain correct bank details via known contact details.",
      action: "Clarify bank details",
    }),
    REFERENCE_NOT_FOUND: (p) => ({
      title: `Reference not found: ${p.reference}`,
      why: `The document refers to ${p.reference}. This purchase order is unknown in the ERP – quantity and price cannot be matched.`,
      recommendation: "Determine and assign the correct purchase order.",
      action: "Assign reference",
    }),
    DELIVERY_DELAY: (p) =>
      Number(p.affectedCount) > 0
        ? {
            title: `Delivery delay of ${p.days} days for ${p.reference}`,
            why: `New date ${p.newDate} instead of ${p.original}. At risk: ${p.affectedCount} customer order (${p.affectedOrders}, ${p.customers}) – its requested date is before the new delivery date.`,
            recommendation: "Inform the customer proactively, check an alternative supplier or reschedule production.",
            action: "Inform customer / reschedule",
          }
        : {
            title: `Delivery delay of ${p.days} days for ${p.reference}`,
            why: `New date ${p.newDate} instead of ${p.original}. No open customer order is directly at risk.`,
            recommendation: "Update the date in the ERP and inform planning.",
            action: "Update date",
          },
    NO_TEXT_LAYER: () => ({
      title: "No readable text (scan)",
      why: "The PDF only contains an image. Without OCR no data can be read – FlowPilot does not guess values.",
      recommendation: "Capture manually or connect an OCR service (not active in the demo).",
      action: "Capture manually",
    }),
    DEADLINE_SOON: (p) => ({
      title: Number(p.days) <= 0 ? `Quote deadline ${p.date} – today or passed` : `Quote deadline ${p.date} (in ${p.days} days)`,
      why: "After the deadline a quote is usually no longer considered.",
      recommendation: "Prioritise preparing the quote.",
      action: "Prioritise quote",
    }),
    DATE_IN_PAST: (p) => ({
      title: `Date is in the past: ${p.date}`,
      why: "The stated date has already passed – probably a typing or transfer error.",
      recommendation: "Ask the sender for the correct date.",
      action: "Clarify date",
    }),
  },
  reason: {
    GUARDRAIL_CRITICAL_ISSUE: (p) => `${p.count} critical finding(s) – automatic processing is blocked.`,
    GUARDRAIL_MISSING_FIELDS: (p) => `${p.count} required field(s) missing.`,
    GUARDRAIL_LOW_CONFIDENCE: (p) => `Recognition confidence ${p.confidence}% is below the threshold of ${p.threshold}%.`,
    GUARDRAIL_UNKNOWN_PARTY: () => "Business partner is not in the master data.",
    GUARDRAIL_NO_TEXT: () => "No machine-readable text available.",
    GUARDRAIL_FINANCIAL: () => "Financially relevant document – approval is always made by a person.",
    GUARDRAIL_OPEN_WARNINGS: (p) => `${p.count} open deviation(s) need to be clarified.`,
    POLICY_AUTO_DISABLED: () => "Automatic processing is not enabled for this process.",
    POLICY_AMOUNT_ABOVE_AUTO_LIMIT: (p) => `Amount ${p.amount} is above the automatic processing limit (${p.limit}).`,
    POLICY_APPROVAL_LIMIT: (p) => `Amount ${p.amount} is above the approval limit (${p.limit}) – approval by team lead.`,
    RULE_REQUIRE_APPROVAL: (p) => `Rule "${p.ruleName}" requires approval by ${p.roleLabel}.`,
    RULE_REVIEW: (p) => `Rule "${p.ruleName}" requires a review.`,
    RULE_CONTINUE: (p) => `Rule "${p.ruleName}" satisfied.`,
    NO_CONTINUE_RULE: () => "No rule for automatic hand-over matched.",
    NOT_BUSINESS_DOCUMENT: () => "Not a business document – no action required.",
    ALL_CHECKS_PASSED: () => "All checks passed – automatic processing within the approved rules.",
    HUMAN_CORRECTED: () => "All checks passed. Because the document was edited manually, a confirmation is required.",
  },
  condition: {
    field: {
      partyKnown: "Business partner is known",
      allRequiredFields: "All required fields present",
      noOpenIssues: "No open deviations",
      hasCriticalIssue: "Critical finding present",
      netAmount: "Net amount (€)",
      minConfidence: "Recognition confidence (%)",
      delayDays: "Delay (days)",
      deliveryLeadDays: "Days until requested date",
      priceDeviationPct: "Price deviation (%)",
    },
    op: { is_true: "is true", is_false: "is false", gt: "greater than", gte: "at least", lt: "less than", lte: "at most" },
    if: "If",
    and: "and",
    then: "then",
    always: "Always",
  },
  action: {
    continue: "hand over to the next step automatically",
    require_approval: "require approval by",
    route_review: "send for review to",
    notify: "notify:",
    set_priority: "set priority:",
  },
  step: {
    trigger: { title: "New e-mail", text: "Mailbox or upload delivers the e-mail and attachments." },
    classify: { title: "Classify document", text: "Recognise the document type from title, fields and wording." },
    extract: { title: "Extract data", text: "Read header fields and line items – unknown values stay empty." },
    match: { title: "Match master data", text: "Find customer or supplier, articles and purchase order in the ERP." },
    validate: { title: "Validate", text: "Check prices, quantities, totals, duplicates, bank details and dates." },
    rules: { title: "Apply rules", text: "Evaluate your no-code rules: approvals, notifications, priorities." },
    gate: { title: "Check safety & approvals", text: "Confidence, amount limits and guardrails decide the path." },
    auto: { title: "Process automatically", text: "Only if everything fits and the process is enabled for it." },
    review: { title: "Review by staff", text: "Clarify, correct, approve or reject deviations." },
    transfer: { title: "Transfer to ERP", text: "As a draft into the demo ERP sandbox – no booking, no payment." },
    notify: { title: "Notify", text: "The responsible department receives an in-app notification." },
  },
};

export const domainDict = defineDict({ de, en });
export type DomainDict = typeof de;

export function dom(lang: Lang): DomainDict {
  return domainDict[lang] as DomainDict;
}

export function fieldLabel(d: DomainDict, key: FieldKey, docType?: DocType | null): string {
  return (docType && d.fieldByType[key]?.[docType]) || d.field[key];
}

/** Formats issue params (money, dates) for display and returns localized texts. */
export function issueText(issue: Pick<ValidationIssue, "code" | "params">, d: DomainDict, f: Formatters, docType?: DocType | null): IssueText {
  const p = issue.params;
  const money = (k: string) => (p[k] == null ? null : f.money(Number(p[k])));
  const date = (k: string) => (p[k] == null ? null : f.date(String(p[k])));
  const prepared: P = { ...p };
  for (const k of ["documentPrice", "expectedPrice", "impact", "computed", "stated", "diff", "net", "expected", "amount"]) {
    if (p[k] != null && typeof p[k] === "number") prepared[k] = money(k);
  }
  for (const k of ["existingDate", "requested", "confirmed", "original", "newDate", "date"]) if (p[k] != null) prepared[k] = date(k);
  if (p.diffPct != null) prepared.diffPct = f.number(Number(p.diffPct), 1);
  if (p.ordered != null) prepared.ordered = f.number(Number(p.ordered));
  if (p.document != null) prepared.document = f.number(Number(p.document));
  if (p.field) prepared.fieldLabel = fieldLabel(d, p.field as FieldKey, docType);
  if (p.priceSource) prepared.priceSourceLabel = d.priceSource[p.priceSource as keyof DomainDict["priceSource"]];
  if (p.documentIban) prepared.documentIban = String(p.documentIban).replace(/(.{4})/g, "$1 ").trim();
  if (p.masterIban) prepared.masterIban = String(p.masterIban).replace(/(.{4})/g, "$1 ").trim();
  return d.issue[issue.code](prepared);
}

export function reasonText(
  reason: RouteReason,
  d: DomainDict,
  f: Formatters,
  ruleName: (id: string) => string,
): string {
  const p: P = { ...(reason.params ?? {}) };
  if (typeof p.amount === "number") p.amount = f.money(p.amount);
  if (typeof p.limit === "number") p.limit = f.money(p.limit, { decimals: 0 });
  if (p.rule) p.ruleName = ruleName(String(p.rule));
  if (p.role) p.roleLabel = d.role[p.role as Role];
  return d.reason[reason.code](p);
}

export { fmt };
