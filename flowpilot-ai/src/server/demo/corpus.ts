/**
 * Synthetic demo e-mails with PDF attachments. Every scenario is constructed to demonstrate a
 * specific part of the pipeline (auto-processing, price deviation, duplicate, fraud signal …).
 * All content is fictional.
 */
import { addDays, formatGermanDate as g, formatGermanNumber as n, formatIban, isoWeekOf } from "@/domain/parse";
import type { DocSpec, DocItem } from "@/server/documents/pdf-render";
import { IBANS, OWN_COMPANY } from "./master-data";

export interface DemoAttachment {
  fileName: string;
  spec: DocSpec;
}

export interface DemoEmail {
  key: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  /** Minutes before workspace creation the e-mail was received. */
  minutesAgo: number;
  attachments: DemoAttachment[];
}

const OWN_RECIPIENT = {
  name: OWN_COMPANY.name,
  street: OWN_COMPANY.street,
  zipCity: `${OWN_COMPANY.zip} ${OWN_COMPANY.city}`,
};

const SENDERS = {
  beispiel: { name: "Beispiel Maschinenbau GmbH", street: "Industriestraße 12", zipCity: "33602 Bielefeld", email: "einkauf@beispiel-maschinenbau.example" },
  nordlicht: { name: "Nordlicht Fördertechnik GmbH & Co. KG", street: "Hafenweg 8", zipCity: "28217 Bremen", email: "beschaffung@nordlicht-foerdertechnik.example" },
  alpenblick: { name: "Alpenblick Verpackungssysteme AG", street: "Gewerbepark 3", zipCity: "87435 Kempten", email: "einkauf@alpenblick-verpackung.example" },
  rheinauen: { name: "Rheinauen Anlagenbau GmbH", street: "Am Rheinufer 21", zipCity: "47051 Duisburg", email: "technik@rheinauen-anlagenbau.example" },
  weber: { name: "Weber & Söhne Agrartechnik GmbH", street: "Feldweg 5", zipCity: "49377 Vechta", email: "info@weber-agrartechnik.example" },
  stahlhandel: { name: "Stahlhandel Muster KG", street: "Rheinstahlstraße 40", zipCity: "50769 Köln", phone: "+49 221 4710 140", email: "vertrieb@stahlhandel-muster.example" },
  kugellager: { name: "Kugellager Beispiel GmbH", street: "Lagerstraße 7", zipCity: "81379 München", phone: "+49 89 99998 207", email: "auftrag@kugellager-beispiel.example" },
  elektro: { name: "Elektro Komponenten Muster GmbH", street: "Schaltweg 3", zipCity: "22525 Hamburg", phone: "+49 40 66969 330", email: "service@ekm-muster.example" },
  spedition: { name: "Spedition Testmann GmbH", street: "Frachtring 12", zipCity: "60549 Frankfurt am Main", phone: "+49 69 90009 450", email: "dispo@spedition-testmann.example" },
};

const customerFooter = (s: { name: string; street: string; zipCity: string }, reg: string, vat: string) => [
  `${s.name} · ${s.street} · ${s.zipCity} · ${reg} · USt-IdNr. ${vat}`,
];
const supplierFooter = (s: { name: string; street: string; zipCity: string }, reg: string, vat: string, iban: string, bank: string) => [
  `${s.name} · ${s.street} · ${s.zipCity} · ${reg} · USt-IdNr. ${vat}`,
  `Bankverbindung: ${bank} · IBAN ${formatIban(iban)} · BIC DEMODEXX`,
];

const item = (pos: string, articleNo: string, description: string, qty: number, unit: string, price?: number | null): DocItem => ({
  pos,
  articleNo,
  description,
  quantity: n(qty, 0),
  unit,
  unitPrice: price != null ? n(price) : undefined,
  total: price != null ? n(qty * price) : undefined,
});
const sum = (items: DocItem[]) =>
  items.reduce((s, i) => s + (i.total ? Number(i.total.replace(/\./g, "").replace(",", ".")) : 0), 0);
const eur = (v: number) => `${n(v)} EUR`;

export function buildCorpus(today: string): Record<string, DemoEmail> {
  const d = (days: number) => g(addDays(today, days));
  const kw = (days: number) => {
    const { week, year } = isoWeekOf(addDays(today, days));
    return `KW ${week}/${year}`;
  };

  /* ----- Purchase orders from customers ----- */

  const poCleanItems = [
    item("10", "AT-4711", "Stirnradgetriebe SG-40, i=10", 6, "Stk", 445.0),
    item("20", "AT-5120", "Antriebswelle Ø 40 x 600 mm", 12, "Stk", 124.0),
    item("30", "AT-2210", "Elastische Kupplung EK-28", 20, "Stk", 61.5),
  ];
  const poPriceItems = [
    item("10", "AT-4711", "Stirnradgetriebe SG-40, i=10", 10, "Stk", 412.0),
    item("20", "AT-6001", "Getriebemotor GM-075, 0,75 kW", 8, "Stk", 589.0),
    item("30", "AT-7302", "Flanschlager FL-30", 40, "Stk", 36.9),
    item("40", "AT-8105", "Zahnriemen HTD 8M-1200", 60, "Stk", 26.4),
  ];
  const poUnknownItems = [
    item("1", "AT-6001", "Getriebemotor GM-075, 0,75 kW", 2, "Stk", 612.0),
    item("2", "AT-2210", "Elastische Kupplung EK-28", 4, "Stk", 64.9),
  ];
  const poDupItems = [
    item("10", "AT-4711", "Stirnradgetriebe SG-40, i=10", 4, "Stk", 445.0),
    item("20", "AT-2210", "Elastische Kupplung EK-28", 10, "Stk", 61.5),
  ];
  const simRheinItems = [
    item("1", "AT-6001", "Getriebemotor GM-075, 0,75 kW", 4, "Stk", 595.0),
    item("2", "AT-9010", "Wartungsset Getriebe SG-40", 4, "Set", 85.0),
  ];
  const simAlpenItems = [
    item("10", "AT-3305", "Rillenkugellager 6205-2RS", 400, "Stk", 4.95),
    item("20", "AT-7302", "Flanschlager FL-30", 50, "Stk", 38.4),
  ];

  const po = (
    sender: (typeof SENDERS)[keyof typeof SENDERS],
    meta: [string, string][],
    items: DocItem[],
    delivery: string[],
    reg: string,
    vat: string,
    extraBlocks: { label: string; lines: string[] }[] = [],
  ): DocSpec => ({
    title: "Bestellung",
    sender,
    recipient: { ...OWN_RECIPIENT, attention: "Vertrieb Innendienst" },
    meta,
    intro: ["Sehr geehrte Damen und Herren,", "wir bestellen zu den vereinbarten Konditionen folgende Positionen:"],
    items,
    totals: [["Nettobetrag", eur(sum(items))]],
    blocks: [{ label: "Lieferanschrift", lines: delivery }, ...extraBlocks],
    closing: ["Bitte senden Sie uns eine Auftragsbestätigung.", "Mit freundlichen Grüßen"],
    footer: customerFooter(sender, reg, vat),
  });

  const emails: DemoEmail[] = [
    {
      key: "po_price_mismatch",
      fromName: "Sven Petersen",
      fromEmail: SENDERS.nordlicht.email,
      subject: "Bestellung NF-2026-1187 – Getriebe und Antriebskomponenten",
      body:
        "Moin zusammen,\n\nanbei unsere Bestellung NF-2026-1187. Bitte Liefertermin bestätigen.\n\nBeste Grüße\nSven Petersen\nEinkauf | Nordlicht Fördertechnik GmbH & Co. KG",
      minutesAgo: 168,
      attachments: [
        {
          fileName: "Bestellung_NF-2026-1187.pdf",
          spec: po(
            SENDERS.nordlicht,
            [
              ["Bestellnummer", "NF-2026-1187"],
              ["Datum", d(0)],
              ["Unsere Kundennummer bei Ihnen", "K-10047"],
              ["Ansprechpartner", "Sven Petersen"],
              ["Liefertermin", kw(28)],
            ],
            poPriceItems,
            ["Nordlicht Fördertechnik GmbH & Co. KG", "Werk 2 – Wareneingang Tor 3", "Hafenweg 10", "28217 Bremen"],
            "Amtsgericht Bremen HRA 00000",
            "DE000000047",
            [{ label: "Zahlungsbedingungen", lines: ["14 Tage 2 % Skonto, 30 Tage netto"] }],
          ),
        },
      ],
    },
    {
      key: "po_clean",
      fromName: "Martina Klein",
      fromEmail: SENDERS.beispiel.email,
      subject: "Neue Bestellung BM-PO-88412",
      body:
        "Guten Morgen,\n\nim Anhang erhalten Sie unsere Bestellung BM-PO-88412 zu den Konditionen aus dem Rahmenvertrag.\n\nFreundliche Grüße\nMartina Klein\nStrategischer Einkauf\nBeispiel Maschinenbau GmbH",
      minutesAgo: 154,
      attachments: [
        {
          fileName: "BM-PO-88412.pdf",
          spec: po(
            SENDERS.beispiel,
            [
              ["Bestellnummer", "BM-PO-88412"],
              ["Bestelldatum", d(0)],
              ["Kundennummer", "K-10023"],
              ["Ansprechpartner", "Martina Klein"],
              ["Liefertermin", d(21)],
            ],
            poCleanItems,
            ["Beispiel Maschinenbau GmbH", "Industriestraße 12", "33602 Bielefeld"],
            "Amtsgericht Bielefeld HRB 00000",
            "DE000000023",
            [{ label: "Zahlungsbedingungen", lines: ["30 Tage netto"] }],
          ),
        },
      ],
    },
    {
      key: "po_unknown_customer",
      fromName: "Johannes Weber",
      fromEmail: SENDERS.weber.email,
      subject: "Bestellung Getriebemotoren",
      body:
        "Sehr geehrte Damen und Herren,\n\nwir sind über die Messe auf Sie aufmerksam geworden und möchten gerne die beigefügte Bestellung aufgeben.\n\nMit freundlichen Grüßen\nJohannes Weber\nWeber & Söhne Agrartechnik GmbH",
      minutesAgo: 141,
      attachments: [
        {
          fileName: "Bestellung_WS-2026-031.pdf",
          spec: po(
            SENDERS.weber,
            [
              ["Bestellnummer", "WS-2026-031"],
              ["Datum", d(0)],
              ["Ansprechpartner", "Johannes Weber"],
              ["Liefertermin", d(24)],
            ],
            poUnknownItems,
            ["Weber & Söhne Agrartechnik GmbH", "Feldweg 5", "49377 Vechta"],
            "Amtsgericht Oldenburg HRB 00000",
            "DE000000031",
            [{ label: "Zahlungsbedingungen", lines: ["Vorkasse oder nach Vereinbarung"] }],
          ),
        },
      ],
    },
    {
      key: "po_duplicate",
      fromName: "Martina Klein",
      fromEmail: SENDERS.beispiel.email,
      subject: "WG: Bestellung BM-PO-88231",
      body:
        "Hallo,\n\nzur Sicherheit sende ich Ihnen unsere Bestellung BM-PO-88231 noch einmal zu – bitte kurz den Eingang bestätigen.\n\nViele Grüße\nMartina Klein\nBeispiel Maschinenbau GmbH",
      minutesAgo: 127,
      attachments: [
        {
          fileName: "BM-PO-88231.pdf",
          spec: po(
            SENDERS.beispiel,
            [
              ["Bestellnummer", "BM-PO-88231"],
              ["Bestelldatum", d(-6)],
              ["Kundennummer", "K-10023"],
              ["Ansprechpartner", "Martina Klein"],
              ["Liefertermin", d(16)],
            ],
            poDupItems,
            ["Beispiel Maschinenbau GmbH", "Industriestraße 12", "33602 Bielefeld"],
            "Amtsgericht Bielefeld HRB 00000",
            "DE000000023",
          ),
        },
      ],
    },
    {
      key: "po_freetext",
      fromName: "Katrin Huber",
      fromEmail: SENDERS.alpenblick.email,
      subject: "Nachbestellung Flanschlager und Zahnriemen",
      body:
        "Guten Morgen Herr Schneider,\n\nbitte liefern Sie uns zum bekannten Preis:\n40 Stück Flanschlager FL-30 (AT-7302)\n25 Stück Zahnriemen HTD 8M-1200 (AT-8105)\n\nUnsere Bestellnummer: AV-55871\nLieferung bitte wie immer an unser Werk.\n\nViele Grüße\nKatrin Huber\nEinkauf\nAlpenblick Verpackungssysteme AG",
      minutesAgo: 112,
      attachments: [],
    },

    /* ----- Supplier order confirmations ----- */

    {
      key: "ab_qty_mismatch",
      fromName: "Auftragsbearbeitung Kugellager Beispiel",
      fromEmail: SENDERS.kugellager.email,
      subject: "Auftragsbestätigung AB-77812 zu Ihrer Bestellung B-2026-0412",
      body: "Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie unsere Auftragsbestätigung.\n\nMit freundlichen Grüßen\nKugellager Beispiel GmbH",
      minutesAgo: 103,
      attachments: [
        {
          fileName: "AB-77812.pdf",
          spec: {
            title: "Auftragsbestätigung",
            sender: SENDERS.kugellager,
            recipient: { ...OWN_RECIPIENT, attention: "Einkauf" },
            meta: [
              ["AB-Nr.", "AB-77812"],
              ["Datum", d(0)],
              ["Ihre Bestellung", "B-2026-0412"],
              ["Liefertermin", d(19)],
            ],
            intro: ["Vielen Dank für Ihren Auftrag. Wir bestätigen wie folgt:"],
            items: [
              item("1", "KB-6205-2RS", "Rillenkugellager 6205-2RS", 480, "Stk", 3.85),
              item("2", "KB-FL30", "Flanschlager FL-30", 100, "Stk", 22.1),
            ],
            totals: [["Nettobetrag", eur(480 * 3.85 + 100 * 22.1)]],
            blocks: [
              { label: "Hinweis", lines: ["Position 1: Teilmenge 480 Stk, Restmenge folgt nach Verfügbarkeit."] },
              { label: "Zahlungsbedingungen", lines: ["30 Tage netto"] },
            ],
            footer: supplierFooter(SENDERS.kugellager, "Amtsgericht München HRB 00000", "DE000000234", IBANS.kugellager, "Demobank München"),
          },
        },
      ],
    },
    {
      key: "ab_match",
      fromName: "Elektro Komponenten Muster",
      fromEmail: SENDERS.elektro.email,
      subject: "Auftragsbestätigung 2026-AB-3391",
      body: "Guten Tag,\n\nanbei die Auftragsbestätigung zu Ihrer Bestellung B-2026-0420.\n\nIhr Team der Elektro Komponenten Muster GmbH",
      minutesAgo: 96,
      attachments: [
        {
          fileName: "AB_2026-AB-3391.pdf",
          spec: {
            title: "Auftragsbestätigung",
            sender: SENDERS.elektro,
            recipient: { ...OWN_RECIPIENT, attention: "Einkauf" },
            meta: [
              ["AB-Nr.", "2026-AB-3391"],
              ["Datum", d(0)],
              ["Ihre Bestellung", "B-2026-0420"],
              ["Liefertermin", d(12)],
            ],
            intro: ["Wir bedanken uns für Ihre Bestellung und bestätigen:"],
            items: [
              item("1", "EKM-FU075", "Frequenzumrichter FU-075", 12, "Stk", 248.0),
              item("2", "EKM-MS25", "Motorschutzschalter MS-25", 30, "Stk", 41.6),
            ],
            totals: [["Nettobetrag", eur(12 * 248 + 30 * 41.6)]],
            blocks: [{ label: "Zahlungsbedingungen", lines: ["30 Tage netto"] }],
            footer: supplierFooter(SENDERS.elektro, "Amtsgericht Hamburg HRB 00000", "DE000000278", IBANS.elektro, "Demobank Hamburg"),
          },
        },
      ],
    },

    /* ----- Supplier invoices ----- */

    {
      key: "inv_iban_changed",
      fromName: "Buchhaltung Elektro Komponenten",
      fromEmail: "buchhaltung@ekm-muster-zahlung.example",
      subject: "DRINGEND: Rechnung RE-EKM-26-4471 – neue Bankverbindung",
      body:
        "Sehr geehrte Damen und Herren,\n\nbitte beachten Sie, dass sich unsere Bankverbindung geändert hat. Zahlungen auf das bisherige Konto können ab sofort nicht mehr zugeordnet werden.\nWir bitten um Ausgleich der beigefügten Rechnung bis spätestens morgen auf das neue Konto.\n\nMit freundlichen Grüßen\nBuchhaltung\nElektro Komponenten Muster GmbH",
      minutesAgo: 88,
      attachments: [
        {
          fileName: "Rechnung_RE-EKM-26-4471.pdf",
          spec: {
            title: "Rechnung",
            sender: SENDERS.elektro,
            recipient: { ...OWN_RECIPIENT, attention: "Kreditorenbuchhaltung" },
            meta: [
              ["Rechnungsnummer", "RE-EKM-26-4471"],
              ["Rechnungsdatum", d(0)],
              ["Ihre Bestellung", "B-2026-0388"],
              ["Fällig am", d(1)],
            ],
            items: [
              item("1", "EKM-FU075", "Frequenzumrichter FU-075", 20, "Stk", 248.0),
              item("2", "EKM-MS25", "Motorschutzschalter MS-25", 50, "Stk", 41.6),
            ],
            totals: [
              ["Nettobetrag", eur(7040)],
              ["zzgl. 19 % USt", eur(1337.6)],
              ["Gesamtbetrag", eur(8377.6)],
            ],
            blocks: [
              { label: "Neue Bankverbindung", lines: ["Bitte überweisen Sie ausschließlich auf unser neues Konto:", `IBAN ${formatIban(IBANS.elektroFraud)}`] },
            ],
            footer: supplierFooter(SENDERS.elektro, "Amtsgericht Hamburg HRB 00000", "DE000000278", IBANS.elektroFraud, "Demobank Zahlungsverkehr"),
          },
        },
      ],
    },
    {
      key: "inv_sum_mismatch",
      fromName: "Stahlhandel Muster",
      fromEmail: SENDERS.stahlhandel.email,
      subject: "Rechnung RE-2026-10944",
      body: "Sehr geehrte Damen und Herren,\n\nanbei unsere Rechnung zur Lieferung vom " + d(-2) + ".\n\nMit freundlichen Grüßen\nStahlhandel Muster KG",
      minutesAgo: 81,
      attachments: [
        {
          fileName: "RE-2026-10944.pdf",
          spec: {
            title: "Rechnung",
            sender: SENDERS.stahlhandel,
            recipient: { ...OWN_RECIPIENT, attention: "Kreditorenbuchhaltung" },
            meta: [
              ["Rechnungsnummer", "RE-2026-10944"],
              ["Rechnungsdatum", d(0)],
              ["Ihre Bestellung", "B-2026-0405"],
              ["Zahlbar bis", d(30)],
            ],
            items: [
              item("1", "S235-FL6010", "Flachstahl S235 60 x 10 mm", 400, "m", 6.85),
              item("2", "C45-RD45", "Rundstahl C45 Ø 45 mm", 200, "m", 14.2),
            ],
            totals: [
              ["Nettobetrag", eur(5850)],
              ["zzgl. 19 % USt", eur(1111.5)],
              ["Gesamtbetrag", eur(6961.5)],
            ],
            blocks: [{ label: "Zahlungsbedingungen", lines: ["30 Tage netto"] }],
            footer: supplierFooter(SENDERS.stahlhandel, "Amtsgericht Köln HRA 00000", "DE000000011", IBANS.stahlhandel, "Demobank Köln"),
          },
        },
      ],
    },
    {
      key: "inv_duplicate",
      fromName: "Stahlhandel Muster",
      fromEmail: SENDERS.stahlhandel.email,
      subject: "Rechnungskopie RE-2026-10871",
      body: "Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie eine Kopie unserer Rechnung RE-2026-10871 für Ihre Unterlagen.\n\nMit freundlichen Grüßen\nStahlhandel Muster KG",
      minutesAgo: 74,
      attachments: [
        {
          fileName: "RE-2026-10871_Kopie.pdf",
          spec: {
            title: "Rechnung",
            sender: SENDERS.stahlhandel,
            recipient: { ...OWN_RECIPIENT, attention: "Kreditorenbuchhaltung" },
            meta: [
              ["Rechnungsnummer", "RE-2026-10871"],
              ["Rechnungsdatum", d(-12)],
              ["Ihre Bestellung", "B-2026-0391"],
              ["Zahlbar bis", d(18)],
            ],
            items: [item("1", "C45-RD45", "Rundstahl C45 Ø 45 mm", 200, "m", 14.2)],
            totals: [
              ["Nettobetrag", eur(2840)],
              ["zzgl. 19 % USt", eur(539.6)],
              ["Gesamtbetrag", eur(3379.6)],
            ],
            footer: supplierFooter(SENDERS.stahlhandel, "Amtsgericht Köln HRA 00000", "DE000000011", IBANS.stahlhandel, "Demobank Köln"),
          },
        },
      ],
    },
    {
      key: "inv_clean",
      fromName: "Kugellager Beispiel – Buchhaltung",
      fromEmail: "rechnung@kugellager-beispiel.example",
      subject: "Rechnung RE-KB-2026-1187",
      body: "Sehr geehrte Damen und Herren,\n\nim Anhang finden Sie unsere Rechnung zur Lieferung LS-55120.\n\nMit freundlichen Grüßen\nKugellager Beispiel GmbH",
      minutesAgo: 66,
      attachments: [
        {
          fileName: "RE-KB-2026-1187.pdf",
          spec: {
            title: "Rechnung",
            sender: SENDERS.kugellager,
            recipient: { ...OWN_RECIPIENT, attention: "Kreditorenbuchhaltung" },
            meta: [
              ["Rechnungsnummer", "RE-KB-2026-1187"],
              ["Rechnungsdatum", d(0)],
              ["Ihre Bestellung", "B-2026-0377"],
              ["Zahlbar bis", d(30)],
            ],
            items: [item("1", "KB-6205-2RS", "Rillenkugellager 6205-2RS", 1000, "Stk", 3.85)],
            totals: [
              ["Nettobetrag", eur(3850)],
              ["zzgl. 19 % USt", eur(731.5)],
              ["Gesamtbetrag", eur(4581.5)],
            ],
            blocks: [{ label: "Zahlungsbedingungen", lines: ["30 Tage netto"] }],
            footer: supplierFooter(SENDERS.kugellager, "Amtsgericht München HRB 00000", "DE000000234", IBANS.kugellager, "Demobank München"),
          },
        },
      ],
    },
    {
      key: "freight_invoice",
      fromName: "Spedition Testmann – Abrechnung",
      fromEmail: "abrechnung@spedition-testmann.example",
      subject: "Frachtrechnung FR-26-08812",
      body: "Guten Tag,\n\nanbei die Frachtrechnung zu Transportauftrag B-2026-0415.\n\nMit freundlichen Grüßen\nSpedition Testmann GmbH",
      minutesAgo: 58,
      attachments: [
        {
          fileName: "FR-26-08812.pdf",
          spec: {
            title: "Rechnung",
            sender: SENDERS.spedition,
            recipient: { ...OWN_RECIPIENT, attention: "Versand / Logistik" },
            meta: [
              ["Rechnungsnummer", "FR-26-08812"],
              ["Rechnungsdatum", d(0)],
              ["Ihre Bestellung", "B-2026-0415"],
              ["Zahlbar bis", d(14)],
            ],
            items: [
              item("1", "STG-PAL", "Stückgut national je Palette", 14, "Pal", 61.5),
              item("2", "STG-AVIS", "Avis / Terminzustellung", 3, "Stk", 15.0),
            ],
            totals: [
              ["Nettobetrag", eur(906)],
              ["zzgl. 19 % USt", eur(172.14)],
              ["Gesamtbetrag", eur(1078.14)],
            ],
            footer: supplierFooter(SENDERS.spedition, "Amtsgericht Frankfurt am Main HRB 00000", "DE000000056", IBANS.spedition, "Demobank Frankfurt"),
          },
        },
      ],
    },

    /* ----- Delays ----- */

    {
      key: "delay_critical",
      fromName: "Stahlhandel Muster – Disposition",
      fromEmail: SENDERS.stahlhandel.email,
      subject: "Lieferverzug zu Ihrer Bestellung B-2026-0398",
      body:
        "Sehr geehrte Damen und Herren,\n\nleider müssen wir Ihnen mitteilen, dass sich die Lieferung zu Ihrer Bestellung B-2026-0398 verzögert. Details entnehmen Sie bitte dem Anhang.\n\nWir bitten um Verständnis.\nStahlhandel Muster KG",
      minutesAgo: 47,
      attachments: [
        {
          fileName: "Lieferverzug_B-2026-0398.pdf",
          spec: {
            title: "Mitteilung Lieferverzug",
            sender: SENDERS.stahlhandel,
            recipient: { ...OWN_RECIPIENT, attention: "Einkauf" },
            meta: [
              ["Datum", d(0)],
              ["Ihre Bestellung", "B-2026-0398"],
              ["Ansprechpartner", "Frank Böhm"],
            ],
            intro: [
              "für die oben genannte Bestellung (Rundstahl C45 und Flachstahl S235) können wir den",
              "bestätigten Termin leider nicht halten.",
            ],
            blocks: [
              { label: "Termine", lines: [`Ursprünglicher Liefertermin: ${d(18)}`, `Neuer Liefertermin: ${d(32)}`] },
              { label: "Grund", lines: ["Verzögerte Anlieferung des Vormaterials aus dem Walzwerk"] },
            ],
            closing: ["Wir informieren Sie umgehend, falls sich ein früherer Termin ergibt."],
            footer: supplierFooter(SENDERS.stahlhandel, "Amtsgericht Köln HRA 00000", "DE000000011", IBANS.stahlhandel, "Demobank Köln"),
          },
        },
      ],
    },
    {
      key: "carrier_delay",
      fromName: "Spedition Testmann – Disposition",
      fromEmail: SENDERS.spedition.email,
      subject: "Zustellverzögerung Transportauftrag B-2026-0415",
      body:
        "Guten Tag,\n\nwegen eines Fahrzeugausfalls verschiebt sich die Zustellung Ihrer Sendung. Die neue Planung finden Sie im Anhang.\n\nMit freundlichen Grüßen\nDisposition Spedition Testmann GmbH",
      minutesAgo: 39,
      attachments: [
        {
          fileName: "Zustellverzoegerung_B-2026-0415.pdf",
          spec: {
            title: "Mitteilung Zustellverzögerung",
            sender: SENDERS.spedition,
            recipient: { ...OWN_RECIPIENT, attention: "Versand / Logistik" },
            meta: [
              ["Datum", d(0)],
              ["Ihr Transportauftrag", "B-2026-0415"],
              ["Sendung", "4471-2209"],
            ],
            intro: ["die Zustellung der Sendung an Beispiel Maschinenbau GmbH, Bielefeld, verschiebt sich."],
            blocks: [
              { label: "Termine", lines: [`Ursprünglicher Zustelltermin: ${d(1)}`, `Neuer Zustelltermin: ${d(3)}`] },
              { label: "Grund", lines: ["Fahrzeugausfall im Nachtsprung Frankfurt – Bielefeld"] },
            ],
            footer: supplierFooter(SENDERS.spedition, "Amtsgericht Frankfurt am Main HRB 00000", "DE000000056", IBANS.spedition, "Demobank Frankfurt"),
          },
        },
      ],
    },

    /* ----- RFQ ----- */

    {
      key: "rfq_deadline",
      fromName: "Dr. Lena Hoffmann",
      fromEmail: SENDERS.rheinauen.email,
      subject: "Anfrage ANF-77120 – Angebot bis " + d(2),
      body:
        "Sehr geehrte Damen und Herren,\n\nfür ein laufendes Projekt bitten wir um Ihr Angebot gemäß beigefügter Anfrage. Die Sonderwelle bitte nach Zeichnung kalkulieren.\n\nMit freundlichen Grüßen\nDr. Lena Hoffmann\nTechnischer Einkauf\nRheinauen Anlagenbau GmbH",
      minutesAgo: 31,
      attachments: [
        {
          fileName: "Anfrage_ANF-77120.pdf",
          spec: {
            title: "Anfrage",
            sender: SENDERS.rheinauen,
            recipient: { ...OWN_RECIPIENT, attention: "Vertrieb" },
            meta: [
              ["Anfragenummer", "ANF-77120"],
              ["Datum", d(0)],
              ["Kundennummer", "K-10112"],
              ["Angebotsabgabe bis", d(2)],
              ["Ansprechpartner", "Dr. Lena Hoffmann"],
            ],
            intro: ["wir bitten um ein Angebot über folgende Positionen inklusive Lieferzeit:"],
            priced: false,
            items: [
              item("1", "AT-6001", "Getriebemotor GM-075, 0,75 kW", 6, "Stk"),
              item("2", "AT-9010", "Wartungsset Getriebe SG-40", 6, "Set"),
              item("3", "RZ-2231", "Sonderwelle Ø 50 x 800 mm nach Zeichnung", 2, "Stk"),
            ],
            blocks: [
              { label: "Gewünschter Liefertermin", lines: [kw(42)] },
              { label: "Lieferanschrift", lines: ["Rheinauen Anlagenbau GmbH", "Am Rheinufer 21", "47051 Duisburg"] },
            ],
            footer: customerFooter(SENDERS.rheinauen, "Amtsgericht Duisburg HRB 00000", "DE000000112"),
          },
        },
      ],
    },

    /* ----- Delivery notes ----- */

    {
      key: "ln_clean",
      fromName: "Kugellager Beispiel – Versand",
      fromEmail: "versand@kugellager-beispiel.example",
      subject: "Lieferschein LS-55120",
      body: "Guten Tag,\n\nanbei der Lieferschein zur heutigen Anlieferung.\n\nKugellager Beispiel GmbH – Versand",
      minutesAgo: 24,
      attachments: [
        {
          fileName: "LS-55120.pdf",
          spec: {
            title: "Lieferschein",
            sender: SENDERS.kugellager,
            recipient: { ...OWN_RECIPIENT, attention: "Wareneingang" },
            meta: [
              ["Lieferschein-Nr.", "LS-55120"],
              ["Datum", d(0)],
              ["Ihre Bestellung", "B-2026-0377"],
              ["Packstücke", "4 Kartons"],
            ],
            priced: false,
            items: [item("1", "KB-6205-2RS", "Rillenkugellager 6205-2RS", 1000, "Stk")],
            blocks: [{ label: "Lieferanschrift", lines: [OWN_COMPANY.name, "Wareneingang", OWN_COMPANY.street, `${OWN_COMPANY.zip} ${OWN_COMPANY.city}`] }],
            footer: supplierFooter(SENDERS.kugellager, "Amtsgericht München HRB 00000", "DE000000234", IBANS.kugellager, "Demobank München"),
          },
        },
      ],
    },
    {
      key: "ln_scan",
      fromName: "Wareneingang Scanner",
      fromEmail: "scanner-wareneingang@muster-antriebstechnik.example",
      subject: "Scan Lieferschein Stahlhandel",
      body: "Gescanntes Dokument vom Multifunktionsgerät Wareneingang.\nSeiten: 1",
      minutesAgo: 17,
      attachments: [
        {
          fileName: "Scan_Wareneingang_0412.pdf",
          spec: {
            title: "Scan",
            sender: SENDERS.stahlhandel,
            recipient: OWN_RECIPIENT,
            meta: [],
            footer: [],
            scan: true,
          },
        },
      ],
    },

    /* ----- Noise ----- */

    {
      key: "newsletter",
      fromName: "Fachforum Antriebstechnik",
      fromEmail: "news@fachforum-antrieb.example",
      subject: "Einladung: Fachforum Antriebstechnik 2027 – jetzt Frühbucherrabatt sichern",
      body:
        "Sehr geehrte Damen und Herren,\n\nwir laden Sie herzlich zum Fachforum Antriebstechnik 2027 ein. Sichern Sie sich jetzt Ihren Frühbucherrabatt!\n\nZum Abmelden vom Newsletter klicken Sie bitte hier.",
      minutesAgo: 9,
      attachments: [],
    },

    /* ----- Simulation pool (injected via "Neue E-Mail simulieren") ----- */

    {
      key: "sim_po_rheinauen",
      fromName: "Dr. Lena Hoffmann",
      fromEmail: SENDERS.rheinauen.email,
      subject: "Bestellung RA-4452-26",
      body: "Guten Tag,\n\nanbei unsere Bestellung RA-4452-26.\n\nMit freundlichen Grüßen\nDr. Lena Hoffmann\nRheinauen Anlagenbau GmbH",
      minutesAgo: 0,
      attachments: [
        {
          fileName: "Bestellung_RA-4452-26.pdf",
          spec: po(
            SENDERS.rheinauen,
            [
              ["Bestellnummer", "RA-4452-26"],
              ["Datum", d(0)],
              ["Kundennummer", "K-10112"],
              ["Ansprechpartner", "Dr. Lena Hoffmann"],
              ["Liefertermin", d(25)],
            ],
            simRheinItems,
            ["Rheinauen Anlagenbau GmbH", "Am Rheinufer 21", "47051 Duisburg"],
            "Amtsgericht Duisburg HRB 00000",
            "DE000000112",
          ),
        },
      ],
    },
    {
      key: "sim_po_alpen",
      fromName: "Katrin Huber",
      fromEmail: SENDERS.alpenblick.email,
      subject: "Bestellung AV-55902",
      body: "Hallo,\n\nanbei unsere Bestellung AV-55902.\n\nViele Grüße\nKatrin Huber\nAlpenblick Verpackungssysteme AG",
      minutesAgo: 0,
      attachments: [
        {
          fileName: "Bestellung_AV-55902.pdf",
          spec: po(
            SENDERS.alpenblick,
            [
              ["Bestellnummer", "AV-55902"],
              ["Datum", d(0)],
              ["Kundennummer", "K-10088"],
              ["Ansprechpartner", "Katrin Huber"],
              ["Liefertermin", d(18)],
            ],
            simAlpenItems,
            ["Alpenblick Verpackungssysteme AG", "Gewerbepark 3", "87435 Kempten"],
            "Amtsgericht Kempten HRB 00000",
            "DE000000088",
          ),
        },
      ],
    },
    {
      key: "sim_ab_kugellager",
      fromName: "Auftragsbearbeitung Kugellager Beispiel",
      fromEmail: SENDERS.kugellager.email,
      subject: "Korrigierte Auftragsbestätigung AB-77812-1",
      body: "Sehr geehrte Damen und Herren,\n\nanbei die korrigierte Auftragsbestätigung: die volle Menge ist nun verfügbar.\n\nKugellager Beispiel GmbH",
      minutesAgo: 0,
      attachments: [
        {
          fileName: "AB-77812-1.pdf",
          spec: {
            title: "Auftragsbestätigung",
            sender: SENDERS.kugellager,
            recipient: { ...OWN_RECIPIENT, attention: "Einkauf" },
            meta: [
              ["AB-Nr.", "AB-77812-1"],
              ["Datum", d(0)],
              ["Ihre Bestellung", "B-2026-0412"],
              ["Liefertermin", d(10)],
            ],
            items: [
              item("1", "KB-6205-2RS", "Rillenkugellager 6205-2RS", 500, "Stk", 3.85),
              item("2", "KB-FL30", "Flanschlager FL-30", 100, "Stk", 22.1),
            ],
            totals: [["Nettobetrag", eur(500 * 3.85 + 100 * 22.1)]],
            footer: supplierFooter(SENDERS.kugellager, "Amtsgericht München HRB 00000", "DE000000234", IBANS.kugellager, "Demobank München"),
          },
        },
      ],
    },
  ];

  return Object.fromEntries(emails.map((e) => [e.key, e]));
}

export const SIMULATION_POOL = ["sim_po_rheinauen", "sim_po_alpen", "sim_ab_kugellager"];
