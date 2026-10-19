import type { DocType, LocalizedText, Rule, WorkflowParams } from "./types";

export const INDUSTRY_KEYS = ["manufacturing", "wholesale", "logistics", "purchasing", "order_processing"] as const;
export type IndustryKey = (typeof INDUSTRY_KEYS)[number];

export interface WorkflowTemplate {
  key: string;
  name: LocalizedText;
  description: LocalizedText;
  docTypes: DocType[];
  params: WorkflowParams;
}

export interface IndustryTemplate {
  key: IndustryKey;
  name: LocalizedText;
  audience: LocalizedText;
  /** The concrete process this template automates, step by step. */
  process: LocalizedText[];
  focus: LocalizedText;
  workflows: WorkflowTemplate[];
  rules: Rule[];
  /** Assumed manual handling minutes per document type (editable, shown as assumption). */
  baselineMinutes: Record<Exclude<DocType, "other">, number>;
  /** Synthetic demo e-mails loaded for this template (keys of the demo corpus). */
  emailKeys: string[];
}

/* ---------- Workflow building blocks ---------- */

const wfOrders = (o: Partial<WorkflowParams> = {}): WorkflowTemplate => ({
  key: "orders",
  name: { de: "Auftragseingang Kundenbestellungen", en: "Customer order intake" },
  description: {
    de: "Bestellungen aus dem Postfach erkennen, gegen Kundenstamm und Rahmenpreise prüfen und als Auftragsentwurf ins ERP übergeben.",
    en: "Detect purchase orders in the mailbox, check them against customer master data and agreed prices, and hand them to the ERP as a draft order.",
  },
  docTypes: ["purchase_order"],
  params: {
    autoProcess: true,
    minConfidence: 0.9,
    maxAutoAmount: 25000,
    approvalLimit: 50000,
    reviewDepartment: "sales",
    notifyDepartment: null,
    slaHours: 4,
    targetSystem: "demo_erp",
    ...o,
  },
});

const wfRfq = (o: Partial<WorkflowParams> = {}): WorkflowTemplate => ({
  key: "rfq",
  name: { de: "Anfragen & Angebote", en: "Requests for quotation" },
  description: {
    de: "Anfragen erfassen, Positionen mit dem Artikelstamm abgleichen und eine Angebotsaufgabe mit Frist für den Vertrieb anlegen.",
    en: "Capture RFQs, match items with the article master and create a quotation task with deadline for sales.",
  },
  docTypes: ["rfq"],
  params: {
    autoProcess: false,
    minConfidence: 0.9,
    maxAutoAmount: null,
    approvalLimit: null,
    reviewDepartment: "sales",
    notifyDepartment: null,
    slaHours: 24,
    targetSystem: "none",
    ...o,
  },
});

const wfConfirmations = (o: Partial<WorkflowParams> = {}): WorkflowTemplate => ({
  key: "confirmations",
  name: { de: "Auftragsbestätigungen von Lieferanten", en: "Supplier order confirmations" },
  description: {
    de: "Auftragsbestätigungen mit der eigenen Bestellung abgleichen: Menge, Preis und Liefertermin. Identische Bestätigungen werden automatisch verbucht.",
    en: "Compare supplier confirmations with our purchase order: quantity, price and delivery date. Identical confirmations are booked automatically.",
  },
  docTypes: ["order_confirmation"],
  params: {
    autoProcess: true,
    minConfidence: 0.9,
    maxAutoAmount: null,
    approvalLimit: null,
    reviewDepartment: "purchasing",
    notifyDepartment: null,
    slaHours: 8,
    targetSystem: "demo_erp",
    ...o,
  },
});

const wfInvoices = (o: Partial<WorkflowParams> = {}): WorkflowTemplate => ({
  key: "invoices",
  name: { de: "Eingangsrechnungen prüfen", en: "Incoming invoice check" },
  description: {
    de: "Rechnungen gegen Bestellung, Lieferantenstamm und bereits gebuchte Belege prüfen. Zahlungsfreigaben erfolgen immer durch berechtigte Mitarbeitende.",
    en: "Check invoices against purchase order, supplier master and already booked documents. Payment approvals are always made by authorised staff.",
  },
  docTypes: ["invoice"],
  params: {
    autoProcess: false,
    minConfidence: 0.9,
    maxAutoAmount: null,
    approvalLimit: 10000,
    reviewDepartment: "accounting",
    notifyDepartment: null,
    slaHours: 48,
    targetSystem: "demo_erp",
    ...o,
  },
});

const wfDelays = (o: Partial<WorkflowParams> = {}): WorkflowTemplate => ({
  key: "delays",
  name: { de: "Lieferverzug & Terminänderungen", en: "Delivery delays & date changes" },
  description: {
    de: "Verzugsmeldungen der betroffenen Bestellung zuordnen, abhängige Kundenaufträge ermitteln und die Verantwortlichen informieren.",
    en: "Link delay notifications to the affected purchase order, identify dependent customer orders and inform the people responsible.",
  },
  docTypes: ["delay_notice"],
  params: {
    autoProcess: false,
    minConfidence: 0.85,
    maxAutoAmount: null,
    approvalLimit: null,
    reviewDepartment: "purchasing",
    notifyDepartment: "production",
    slaHours: 4,
    targetSystem: "none",
    ...o,
  },
});

const wfDeliveryNotes = (o: Partial<WorkflowParams> = {}): WorkflowTemplate => ({
  key: "delivery_notes",
  name: { de: "Wareneingang & Lieferscheine", en: "Goods receipt & delivery notes" },
  description: {
    de: "Lieferscheine der Bestellung zuordnen, Mengen abgleichen und den Wareneingang im ERP vorbereiten.",
    en: "Link delivery notes to the purchase order, compare quantities and prepare the goods receipt in the ERP.",
  },
  docTypes: ["delivery_note"],
  params: {
    autoProcess: true,
    minConfidence: 0.9,
    maxAutoAmount: null,
    approvalLimit: null,
    reviewDepartment: "logistics",
    notifyDepartment: null,
    slaHours: 8,
    targetSystem: "demo_erp",
    ...o,
  },
});

/* ---------- Rule building blocks ---------- */

const ruleContinue = (docTypes: DocType[]): Rule => ({
  id: "r-continue",
  name: {
    de: "Bekannter Partner, vollständig, ohne Abweichung → automatisch weiter",
    en: "Known partner, complete, no deviations → continue automatically",
  },
  enabled: true,
  docTypes,
  conditions: [
    { field: "partyKnown", op: "is_true" },
    { field: "allRequiredFields", op: "is_true" },
    { field: "noOpenIssues", op: "is_true" },
  ],
  action: { type: "continue" },
});

const ruleAmountApproval = (limit: number, docTypes: DocType[] = ["purchase_order"]): Rule => ({
  id: `r-amount-${limit}`,
  name: {
    de: `Auftragswert über ${limit.toLocaleString("de-DE")} € → Freigabe durch Teamleitung`,
    en: `Order value above €${limit.toLocaleString("en-GB")} → approval by team lead`,
  },
  enabled: true,
  docTypes,
  conditions: [{ field: "netAmount", op: "gt", value: limit }],
  action: { type: "require_approval", role: "manager" },
});

const ruleNewCustomer: Rule = {
  id: "r-new-customer",
  name: { de: "Neukunde → Buchhaltung für Bonitätsprüfung informieren", en: "New customer → inform accounting for credit check" },
  enabled: true,
  docTypes: ["purchase_order"],
  conditions: [{ field: "partyKnown", op: "is_false" }],
  action: { type: "notify", department: "accounting" },
};

const rulePriceDeviation = (pct: number, role: "manager" = "manager"): Rule => ({
  id: `r-price-${pct}`,
  name: {
    de: `Preisabweichung über ${pct} % → Freigabe durch Teamleitung`,
    en: `Price deviation above ${pct}% → approval by team lead`,
  },
  enabled: true,
  docTypes: ["purchase_order", "order_confirmation", "invoice"],
  conditions: [{ field: "priceDeviationPct", op: "gt", value: pct }],
  action: { type: "require_approval", role },
});

const ruleShortLead: Rule = {
  id: "r-short-lead",
  name: {
    de: "Wunschtermin in weniger als 10 Tagen → Produktionsplanung informieren",
    en: "Requested date within 10 days → inform production planning",
  },
  enabled: true,
  docTypes: ["purchase_order"],
  conditions: [{ field: "deliveryLeadDays", op: "lt", value: 10 }],
  action: { type: "notify", department: "production" },
};

const ruleDelayPriority = (days: number, department: "sales" | "production" | "logistics"): Rule => ({
  id: `r-delay-${days}-${department}`,
  name: {
    de: `Verzug über ${days} Tage → ${department === "sales" ? "Vertrieb/Kundenservice" : department === "production" ? "Produktionsplanung" : "Disposition"} informieren, Priorität hoch`,
    en: `Delay above ${days} days → inform ${department === "sales" ? "sales/customer service" : department === "production" ? "production planning" : "dispatch"}, high priority`,
  },
  enabled: true,
  docTypes: ["delay_notice"],
  conditions: [{ field: "delayDays", op: "gt", value: days }],
  action: { type: "notify", department },
});

const ruleDelayHigh: Rule = {
  id: "r-delay-priority",
  name: { de: "Jeder Lieferverzug → Priorität hoch", en: "Every delivery delay → high priority" },
  enabled: true,
  docTypes: ["delay_notice"],
  conditions: [{ field: "delayDays", op: "gt", value: 0 }],
  action: { type: "set_priority", priority: "high" },
};

const ruleInvoiceFourEyes = (limit: number): Rule => ({
  id: `r-invoice-${limit}`,
  name: {
    de: `Rechnung über ${limit.toLocaleString("de-DE")} € netto → Freigabe durch Teamleitung`,
    en: `Invoice above €${limit.toLocaleString("en-GB")} net → approval by team lead`,
  },
  enabled: true,
  docTypes: ["invoice"],
  conditions: [{ field: "netAmount", op: "gt", value: limit }],
  action: { type: "require_approval", role: "manager" },
});

const ruleFreightReview: Rule = {
  id: "r-freight-review",
  name: {
    de: "Rechnung weicht mehr als 3 % vom Tarif ab → Prüfung durch Disposition",
    en: "Invoice deviates more than 3% from tariff → review by dispatch",
  },
  enabled: true,
  docTypes: ["invoice"],
  conditions: [{ field: "priceDeviationPct", op: "gt", value: 3 }],
  action: { type: "route_review", department: "logistics" },
};

/* ---------- Templates ---------- */

export const INDUSTRY_TEMPLATES: Record<IndustryKey, IndustryTemplate> = {
  manufacturing: {
    key: "manufacturing",
    name: { de: "Produktion", en: "Manufacturing" },
    audience: { de: "Fertigungsbetriebe mit Kundenaufträgen und Materialversorgung", en: "Manufacturers with customer orders and material supply" },
    focus: {
      de: "Kundenaufträge schnell bestätigen und Materialengpässe früh erkennen.",
      en: "Confirm customer orders quickly and spot material shortages early.",
    },
    process: [
      { de: "Kundenbestellung trifft per E-Mail ein", en: "Customer order arrives by e-mail" },
      { de: "Positionen gegen Artikelstamm und Rahmenpreise prüfen", en: "Check items against article master and agreed prices" },
      { de: "Kurzfristige Wunschtermine an die Produktionsplanung melden", en: "Report short-notice requested dates to production planning" },
      { de: "Auftragsbestätigungen der Lieferanten mit eigener Bestellung abgleichen", en: "Compare supplier confirmations with our purchase order" },
      { de: "Lieferverzug: betroffene Kundenaufträge ermitteln und Planung informieren", en: "Delays: identify affected customer orders and inform planning" },
    ],
    workflows: [
      wfOrders({ maxAutoAmount: 15000, approvalLimit: 40000, notifyDepartment: null }),
      wfConfirmations(),
      wfDelays({ notifyDepartment: "production" }),
      wfInvoices(),
      wfRfq(),
      wfDeliveryNotes(),
    ],
    rules: [
      ruleContinue(["purchase_order", "order_confirmation", "delivery_note"]),
      ruleShortLead,
      ruleDelayHigh,
      ruleDelayPriority(5, "sales"),
      ruleAmountApproval(40000),
      ruleInvoiceFourEyes(10000),
    ],
    baselineMinutes: { purchase_order: 12, invoice: 8, order_confirmation: 6, delivery_note: 4, rfq: 20, delay_notice: 12 },
    emailKeys: ["po_price_mismatch", "po_clean", "ab_qty_mismatch", "delay_critical", "po_freetext", "ab_match", "inv_iban_changed", "rfq_deadline", "ln_scan", "newsletter"],
  },
  wholesale: {
    key: "wholesale",
    name: { de: "Großhandel", en: "Wholesale" },
    audience: { de: "Großhändler mit hohem Bestellvolumen und vielen Positionen", en: "Wholesalers with high order volume and many line items" },
    focus: {
      de: "Viele Standardbestellungen automatisch erfassen, Preisabweichungen konsequent abfangen.",
      en: "Capture many standard orders automatically, catch price deviations consistently.",
    },
    process: [
      { de: "Bestellungen bekannter Kunden mit Rahmenpreisen automatisch als ERP-Entwurf anlegen", en: "Create orders from known customers at agreed prices as ERP drafts automatically" },
      { de: "Preisabweichungen über 5 % zur Freigabe an die Teamleitung", en: "Price deviations above 5% go to the team lead for approval" },
      { de: "Neukunden an die Buchhaltung zur Bonitätsprüfung melden", en: "Report new customers to accounting for a credit check" },
      { de: "Doppelte Bestellungen erkennen, bevor sie zweimal geliefert werden", en: "Detect duplicate orders before they are delivered twice" },
      { de: "Anfragen mit Frist an den Vertrieb übergeben", en: "Hand RFQs with deadline to sales" },
    ],
    workflows: [wfOrders({ maxAutoAmount: 25000, approvalLimit: 50000 }), wfRfq({ slaHours: 12 }), wfInvoices(), wfDeliveryNotes(), wfConfirmations(), wfDelays({ notifyDepartment: "sales" })],
    rules: [
      ruleContinue(["purchase_order", "order_confirmation", "delivery_note"]),
      rulePriceDeviation(5),
      ruleNewCustomer,
      ruleAmountApproval(50000),
      ruleInvoiceFourEyes(10000),
      ruleDelayHigh,
    ],
    baselineMinutes: { purchase_order: 9, invoice: 7, order_confirmation: 5, delivery_note: 4, rfq: 15, delay_notice: 8 },
    emailKeys: ["po_price_mismatch", "po_clean", "po_duplicate", "po_unknown_customer", "po_freetext", "rfq_deadline", "inv_clean", "inv_duplicate", "ln_clean", "newsletter"],
  },
  logistics: {
    key: "logistics",
    name: { de: "Logistik", en: "Logistics" },
    audience: { de: "Logistikdienstleister und Versandabteilungen", en: "Logistics providers and shipping departments" },
    focus: {
      de: "Zustellverzug sofort sichtbar machen, Frachtrechnungen gegen Tarif prüfen.",
      en: "Make delivery delays visible immediately, check freight invoices against tariffs.",
    },
    process: [
      { de: "Lieferscheine und Abliefernachweise der Sendung zuordnen", en: "Link delivery notes and proofs of delivery to the shipment" },
      { de: "Verzugsmeldungen von Spediteuren erfassen und Kundenservice informieren", en: "Capture carrier delay notices and inform customer service" },
      { de: "Frachtrechnungen gegen vereinbarte Tarife prüfen", en: "Check freight invoices against agreed tariffs" },
      { de: "Scans ohne Textebene zur manuellen Erfassung markieren", en: "Flag scans without a text layer for manual capture" },
    ],
    workflows: [
      wfDeliveryNotes(),
      wfDelays({ reviewDepartment: "logistics", notifyDepartment: "sales", slaHours: 2 }),
      wfInvoices({ approvalLimit: 5000, reviewDepartment: "logistics" }),
      wfOrders({ maxAutoAmount: 10000 }),
      wfConfirmations({ reviewDepartment: "logistics" }),
      wfRfq(),
    ],
    rules: [
      ruleContinue(["delivery_note", "purchase_order", "order_confirmation"]),
      ruleDelayHigh,
      ruleDelayPriority(2, "sales"),
      ruleFreightReview,
      ruleInvoiceFourEyes(5000),
    ],
    baselineMinutes: { purchase_order: 10, invoice: 9, order_confirmation: 5, delivery_note: 5, rfq: 15, delay_notice: 10 },
    emailKeys: ["carrier_delay", "freight_invoice", "ln_clean", "ln_scan", "delay_critical", "po_clean", "inv_sum_mismatch", "inv_iban_changed", "newsletter"],
  },
  purchasing: {
    key: "purchasing",
    name: { de: "Einkauf", en: "Purchasing" },
    audience: { de: "Einkaufsabteilungen mit vielen Lieferanten", en: "Purchasing departments with many suppliers" },
    focus: {
      de: "Auftragsbestätigungen, Lieferscheine und Rechnungen lückenlos mit der Bestellung abgleichen.",
      en: "Match confirmations, delivery notes and invoices with the purchase order without gaps.",
    },
    process: [
      { de: "Auftragsbestätigung gegen Bestellung: Menge, Preis, Termin", en: "Order confirmation vs. purchase order: quantity, price, date" },
      { de: "Identische Bestätigungen automatisch im ERP verbuchen", en: "Book identical confirmations in the ERP automatically" },
      { de: "Rechnung gegen Bestellung und Lieferschein prüfen", en: "Check invoice against purchase order and delivery note" },
      { de: "Geänderte Bankverbindungen als Betrugsrisiko markieren", en: "Flag changed bank details as fraud risk" },
      { de: "Doppelte Rechnungen vor der Zahlung abfangen", en: "Catch duplicate invoices before payment" },
    ],
    workflows: [
      wfConfirmations(),
      wfInvoices({ approvalLimit: 10000 }),
      wfDeliveryNotes({ reviewDepartment: "purchasing" }),
      wfDelays({ notifyDepartment: "production" }),
      wfOrders(),
      wfRfq(),
    ],
    rules: [
      ruleContinue(["order_confirmation", "delivery_note", "purchase_order"]),
      rulePriceDeviation(2),
      ruleInvoiceFourEyes(10000),
      ruleDelayHigh,
      ruleDelayPriority(3, "production"),
    ],
    baselineMinutes: { purchase_order: 8, invoice: 9, order_confirmation: 7, delivery_note: 5, rfq: 12, delay_notice: 10 },
    emailKeys: ["ab_qty_mismatch", "ab_match", "inv_iban_changed", "inv_sum_mismatch", "inv_duplicate", "inv_clean", "delay_critical", "ln_clean", "ln_scan", "newsletter"],
  },
  order_processing: {
    key: "order_processing",
    name: { de: "Auftragsabwicklung", en: "Order processing" },
    audience: { de: "Innendienst und Auftragsabwicklung", en: "Inside sales and order processing teams" },
    focus: {
      de: "Vom Posteingang zum ERP-Auftrag – ohne Abtippen, mit klaren Rückfragen.",
      en: "From inbox to ERP order – no retyping, with clear follow-up questions.",
    },
    process: [
      { de: "Bestellungen aus PDF und E-Mail-Text erkennen", en: "Recognise orders from PDFs and e-mail text" },
      { de: "Fehlende Angaben (z. B. Liefertermin) als Rückfrage vorbereiten", en: "Prepare follow-up questions for missing details (e.g. delivery date)" },
      { de: "Doppelte Bestellungen und unbekannte Kunden abfangen", en: "Catch duplicate orders and unknown customers" },
      { de: "Saubere Bestellungen als Auftragsentwurf ins ERP übergeben", en: "Hand clean orders to the ERP as draft orders" },
      { de: "Anfragen mit Frist für das Angebot bereitstellen", en: "Provide RFQs with deadline for quotation" },
    ],
    workflows: [wfOrders({ maxAutoAmount: 20000, approvalLimit: 40000 }), wfRfq(), wfInvoices(), wfConfirmations(), wfDelays({ notifyDepartment: "sales" }), wfDeliveryNotes()],
    rules: [
      ruleContinue(["purchase_order", "order_confirmation", "delivery_note"]),
      ruleAmountApproval(40000),
      ruleNewCustomer,
      rulePriceDeviation(5),
      ruleDelayHigh,
      ruleInvoiceFourEyes(10000),
    ],
    baselineMinutes: { purchase_order: 11, invoice: 7, order_confirmation: 5, delivery_note: 4, rfq: 18, delay_notice: 8 },
    emailKeys: ["po_price_mismatch", "po_clean", "po_duplicate", "po_unknown_customer", "po_freetext", "rfq_deadline", "delay_critical", "inv_iban_changed", "inv_clean", "newsletter"],
  },
};

export const DEFAULT_INDUSTRY: IndustryKey = "manufacturing";
