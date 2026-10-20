/**
 * Accessibility statement. Honest status: partially compliant, based on self-assessment only.
 */
import type { Lang } from "@/i18n/core";
import type { LegalDocFactory } from "../types";

export const ACCESSIBILITY_VERSION = "2026-10-20";

const de: LegalDocFactory = (ctx) => {
  const c = ctx.company;
  return {
    title: "Erklärung zur Barrierefreiheit",
    intro: "Wir möchten, dass alle Menschen FlowPilot AI nutzen können – auch mit Tastatur, Screenreader oder Vergrößerung. Diese Erklärung beschreibt den aktuellen Stand ehrlich, einschließlich der bekannten Einschränkungen.",
    sections: [
      {
        id: "geltung",
        title: "Geltungsbereich",
        blocks: ["Diese Erklärung gilt für diese Website einschließlich der Demo-Anwendung."],
      },
      {
        id: "stand",
        title: "Stand der Vereinbarkeit",
        blocks: [
          "Als Ziel orientieren wir uns an den Web Content Accessibility Guidelines (WCAG) 2.1, Konformitätsstufe AA. Diese Website ist mit diesen Anforderungen **teilweise vereinbar**. Die unten genannten Einschränkungen sind bekannt.",
          "Die Bewertung beruht auf einer Selbstbewertung durch das Entwicklungsteam: automatisierte Prüfungen mit axe-core in der End-to-End-Testsuite sowie manuelle Tests der Bedienung per Tastatur. Eine Prüfung durch eine externe, unabhängige Stelle hat nicht stattgefunden.",
        ],
      },
      {
        id: "massnahmen",
        title: "Umgesetzte Maßnahmen",
        blocks: [
          {
            list: [
              "semantisches HTML mit Überschriftenhierarchie, Landmarken und beschrifteten Formularfeldern,",
              "vollständige Bedienung per Tastatur mit sichtbarem Fokus und Sprunglinks („Zum Inhalt springen“),",
              "Farbkontraste nach WCAG 2.1 AA als Zielwert; Informationen werden nicht allein über Farbe vermittelt,",
              "Textalternativen für Diagramme, die PDF-Vorschau und bedeutungstragende Symbole,",
              "Fehlermeldungen in Formularen werden dem jeweiligen Feld zugeordnet,",
              "Inhalte auf Deutsch und Englisch, umschaltbar auf jeder Seite.",
            ],
          },
        ],
      },
      {
        id: "einschraenkungen",
        title: "Bekannte Einschränkungen",
        blocks: [
          {
            list: [
              "Die PDF-Vorschau in der Dokumentprüfung ist eine Grafik. Alle ausgelesenen Werte stehen daneben als bearbeitbare Textfelder zur Verfügung; das Original kann als Datei geöffnet werden. Hervorhebungen im PDF sind nur visuell.",
              "Diagramme besitzen Textalternativen. Komplexe Diagramme können mit Screenreadern dennoch schwer zu erfassen sein; die wichtigsten Werte stehen zusätzlich als Kennzahlen im Text.",
              "Synthetische Demo-Dokumente und einige Produktbegriffe (z. B. „Exception Radar“) sind nicht in Leichter Sprache verfügbar. Inhalte in Gebärdensprache bieten wir nicht an.",
              "Automatisierte Tests finden nicht alle Barrieren. Für Hinweise sind wir dankbar.",
            ],
          },
        ],
      },
      {
        id: "feedback",
        title: "Feedback und Kontakt",
        blocks: [
          `Sind Ihnen Barrieren aufgefallen oder benötigen Sie Inhalte in einer anderen Form? Schreiben Sie uns an ${c.email}. Wir antworten innerhalb von [[Antwortfrist]].`,
        ],
      },
      {
        id: "durchsetzung",
        title: "Durchsetzungsverfahren",
        blocks: [`Erhalten Sie keine zufriedenstellende Antwort, können Sie sich wenden an: [[Zuständige Schlichtungs- oder Marktüberwachungsstelle]].`],
      },
      {
        id: "erstellung",
        title: "Erstellung dieser Erklärung",
        blocks: ["Diese Erklärung wurde auf Grundlage der oben beschriebenen Selbstbewertung erstellt und wird bei wesentlichen Änderungen der Website aktualisiert."],
      },
    ],
  };
};

const en: LegalDocFactory = (ctx) => {
  const c = ctx.company;
  return {
    title: "Accessibility statement",
    intro: "We want everyone to be able to use FlowPilot AI – including with a keyboard, screen reader or magnification. This statement honestly describes the current status, including known limitations.",
    sections: [
      {
        id: "geltung",
        title: "Scope",
        blocks: ["This statement applies to this website including the demo application."],
      },
      {
        id: "stand",
        title: "Compliance status",
        blocks: [
          "Our target is the Web Content Accessibility Guidelines (WCAG) 2.1, conformance level AA. This website is **partially compliant** with these requirements. The limitations listed below are known.",
          "The assessment is based on a self-assessment by the development team: automated checks with axe-core in the end-to-end test suite and manual keyboard tests. No audit by an external, independent body has taken place.",
        ],
      },
      {
        id: "massnahmen",
        title: "Measures implemented",
        blocks: [
          {
            list: [
              "semantic HTML with a heading hierarchy, landmarks and labelled form fields,",
              "full keyboard operation with visible focus and skip links (“Skip to content”),",
              "colour contrast according to WCAG 2.1 AA as the target; information is not conveyed by colour alone,",
              "text alternatives for charts, the PDF preview and meaningful icons,",
              "error messages in forms are associated with the respective field,",
              "content in German and English, switchable on every page.",
            ],
          },
        ],
      },
      {
        id: "einschraenkungen",
        title: "Known limitations",
        blocks: [
          {
            list: [
              "The PDF preview in document review is an image. All extracted values are available next to it as editable text fields; the original can be opened as a file. Highlights in the PDF are visual only.",
              "Charts have text alternatives. Complex charts may still be difficult to grasp with screen readers; the key values are also shown as figures in the text.",
              "Synthetic demo documents and some product terms (e.g. “Exception Radar”) are not available in plain language. We do not offer sign-language content.",
              "Automated tests do not find all barriers. We are grateful for any feedback.",
            ],
          },
        ],
      },
      {
        id: "feedback",
        title: "Feedback and contact",
        blocks: [`Have you noticed barriers or do you need content in another form? Write to us at ${c.email}. We respond within [[response time]].`],
      },
      {
        id: "durchsetzung",
        title: "Enforcement procedure",
        blocks: ["If you do not receive a satisfactory answer, you can contact: [[Competent conciliation or market surveillance body]]."],
      },
      {
        id: "erstellung",
        title: "Preparation of this statement",
        blocks: ["This statement was prepared on the basis of the self-assessment described above and is updated when the website changes significantly."],
      },
    ],
  };
};

export const accessibilityDoc: Record<Lang, LegalDocFactory> = { de, en };
