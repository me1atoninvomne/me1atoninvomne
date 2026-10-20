/**
 * Cookie and storage policy. The table is generated from STORAGE_INVENTORY (src/legal/cookies.ts),
 * the same list the cookie banner and the tests use.
 */
import type { Lang } from "@/i18n/core";
import type { StorageEntry } from "../cookies";
import type { LegalContext, LegalDocFactory } from "../types";

const TYPE: Record<Lang, Record<StorageEntry["storage"], string>> = {
  de: { cookie: "Cookie", localStorage: "Local Storage", sessionStorage: "Session Storage" },
  en: { cookie: "Cookie", localStorage: "Local storage", sessionStorage: "Session storage" },
};
const CATEGORY: Record<Lang, Record<StorageEntry["category"], string>> = {
  de: { necessary: "Notwendig", comfort: "Komfort (nur mit Einwilligung)" },
  en: { necessary: "Necessary", comfort: "Comfort (consent only)" },
};

function rows(ctx: LegalContext) {
  const { lang } = ctx;
  return ctx.storage.map((s) => [
    s.name,
    `${TYPE[lang][s.storage]}${s.httpOnly ? " (HttpOnly)" : ""}`,
    CATEGORY[lang][s.category],
    s.purpose[lang],
    s.duration[lang],
  ]);
}

const de: LegalDocFactory = (ctx) => ({
  title: "Cookie-Richtlinie",
  intro:
    "Diese Seite listet vollständig auf, was FlowPilot AI in Ihrem Browser speichert. Alle Einträge stammen von dieser Website selbst (Erstanbieter). Es gibt keine Cookies von Drittanbietern, kein Tracking, keine Analyse, keine Werbung und kein Browser-Fingerprinting.",
  sections: [
    {
      id: "uebersicht",
      title: "Übersicht aller Einträge",
      blocks: [
        {
          table: {
            head: ["Name", "Art", "Kategorie", "Zweck", "Speicherdauer"],
            rows: rows(ctx),
            mono: true,
          },
        },
        "Anbieter aller Einträge ist der Betreiber dieser Website (siehe [Impressum](/impressum)). Die Liste wird automatisch aus derselben Konfiguration erzeugt, die auch der Cookie-Hinweis verwendet.",
      ],
    },
    {
      id: "notwendig",
      title: "Notwendige Speicherung",
      blocks: [
        "Notwendige Einträge sind unbedingt erforderlich, damit die von Ihnen ausdrücklich gewünschten Funktionen arbeiten. Sie werden erst gesetzt, wenn Sie die jeweilige Funktion nutzen: fp_lang beim Umschalten der Sprache, fp_ws und fp_user beim Start der Demo, fp_consent bei Ihrer Auswahl im Cookie-Hinweis.",
        "Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG; die anschließende Verarbeitung stützen wir auf Art. 6 Abs. 1 lit. b bzw. f DSGVO.",
      ],
    },
    {
      id: "komfort",
      title: "Komfort-Speicher (Einwilligung)",
      blocks: [
        "Komfort-Einträge merken sich den Fortschritt im Demo-Rundgang und die Startzeit einer Dokumentprüfung im Browser. Sie werden nur gespeichert, wenn Sie im Cookie-Hinweis „Alle akzeptieren“ wählen oder die Kategorie „Komfort“ einschalten. Ohne Einwilligung hält die Website diese Werte nur im Arbeitsspeicher; sie gehen beim Neuladen verloren. Weitere Nachteile entstehen nicht.",
        "Rechtsgrundlage ist § 25 Abs. 1 TDDDG in Verbindung mit Art. 6 Abs. 1 lit. a DSGVO.",
      ],
    },
    {
      id: "aendern",
      title: "Auswahl ändern oder widerrufen",
      blocks: [
        "Sie können Ihre Auswahl jederzeit über „Cookie-Einstellungen“ im Seitenfuß, im Benutzermenü der Demo oder mit der Schaltfläche unten ändern. Ein Widerruf wirkt für die Zukunft; die Website entfernt dabei die Komfort-Einträge aus Ihrem Browser.",
        "Zusätzlich können Sie Cookies und Website-Daten jederzeit in den Einstellungen Ihres Browsers löschen. Danach fragen wir Sie beim nächsten Besuch erneut.",
      ],
    },
    {
      id: "nachweis",
      title: "Nachweis Ihrer Auswahl",
      blocks: [
        "Zum Nachweis Ihrer Entscheidung speichern wir auf dem Server eine zufällige Kennung (dieselbe wie im Cookie fp_consent), die Version des Hinweistexts, den Zeitpunkt, den angezeigten Wortlaut und Ihre Auswahl. IP-Adresse und Browserkennung speichern wir dafür nicht. Details: [Datenschutzerklärung](/datenschutz#einwilligungsnachweis).",
      ],
    },
    {
      id: "aenderungen",
      title: "Änderungen",
      blocks: ["Ändern sich die gespeicherten Einträge oder der Hinweistext, erhöhen wir die Version und fragen Sie beim nächsten Besuch erneut."],
    },
  ],
});

const en: LegalDocFactory = (ctx) => ({
  title: "Cookie policy",
  intro:
    "This page lists completely what FlowPilot AI stores in your browser. All entries come from this website itself (first party). There are no third-party cookies, no tracking, no analytics, no advertising and no browser fingerprinting.",
  sections: [
    {
      id: "uebersicht",
      title: "Overview of all entries",
      blocks: [
        {
          table: {
            head: ["Name", "Type", "Category", "Purpose", "Duration"],
            rows: rows(ctx),
            mono: true,
          },
        },
        "All entries are provided by the operator of this website (see [imprint](/impressum)). The list is generated automatically from the same configuration that the cookie notice uses.",
      ],
    },
    {
      id: "notwendig",
      title: "Necessary storage",
      blocks: [
        "Necessary entries are strictly required for the functions you explicitly request to work. They are only set when you use the respective function: fp_lang when switching the language, fp_ws and fp_user when starting the demo, fp_consent when you make your choice in the cookie notice.",
        "The legal basis is § 25(2) no. 2 TDDDG; we base the subsequent processing on Art. 6(1)(b) or (f) GDPR.",
      ],
    },
    {
      id: "komfort",
      title: "Comfort storage (consent)",
      blocks: [
        "Comfort entries remember your progress in the demo tour and the start time of a document review in the browser. They are only stored if you choose “Accept all” in the cookie notice or switch on the “comfort” category. Without consent the website keeps these values in memory only; they are lost on reload. There are no other disadvantages.",
        "The legal basis is § 25(1) TDDDG in conjunction with Art. 6(1)(a) GDPR.",
      ],
    },
    {
      id: "aendern",
      title: "Changing or withdrawing your choice",
      blocks: [
        "You can change your choice at any time via “Cookie settings” in the page footer, in the demo's user menu or with the button below. A withdrawal takes effect for the future; the website then removes the comfort entries from your browser.",
        "You can also delete cookies and site data at any time in your browser settings. We will then ask you again on your next visit.",
      ],
    },
    {
      id: "nachweis",
      title: "Proof of your choice",
      blocks: [
        "As proof of your decision we store on the server a random identifier (the same as in the cookie fp_consent), the version of the notice text, the time, the wording shown and your choice. We do not store IP addresses or browser identifiers for this. Details: [privacy policy](/datenschutz#einwilligungsnachweis).",
      ],
    },
    {
      id: "aenderungen",
      title: "Changes",
      blocks: ["If the stored entries or the notice text change, we increase the version and ask you again on your next visit."],
    },
  ],
});

export const cookiesDoc: Record<Lang, LegalDocFactory> = { de, en };
