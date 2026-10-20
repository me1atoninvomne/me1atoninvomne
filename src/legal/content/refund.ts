/**
 * Cancellation and refund policy. Consistent with the pricing page (src/i18n/ui/marketing-pages.ts):
 * free demo, one-off pilot without automatic renewal, setup fee, monthly platform fee, free data
 * export at the end of the contract. Contract-specific values are placeholders.
 */
import type { Lang } from "@/i18n/core";
import type { LegalDocFactory } from "../types";

const de: LegalDocFactory = (ctx) => {
  const c = ctx.company;
  return {
    title: "Kündigung & Erstattung",
    intro: "Hier beschreiben wir, wie Sie Leistungen von FlowPilot AI beenden und was mit bereits gezahlten Beträgen geschieht – ohne versteckte Hürden.",
    sections: [
      {
        id: "geltung",
        title: "Geltungsbereich",
        blocks: [
          "Diese Regelungen ergänzen die [Nutzungsbedingungen](/agb) und den jeweiligen Vertrag; bei Widersprüchen geht der Vertrag vor. Unser Angebot richtet sich ausschließlich an Unternehmen. Das gesetzliche Widerrufsrecht für Verbraucherverträge (§ 312g BGB) besteht daher nicht.",
        ],
      },
      {
        id: "demo",
        title: "Demo",
        blocks: [
          `Die Demo ist kostenlos und ohne Zahlungsdaten nutzbar. Es gibt nichts zu kündigen und nichts zu erstatten. Sie können Ihren Demo-Arbeitsbereich jederzeit selbst löschen; ohne Aktivität wird er nach ${ctx.demoTtlHours} Stunden automatisch gelöscht.`,
        ],
      },
      {
        id: "pilot",
        title: "Pilotpaket",
        blocks: [
          {
            list: [
              "Das Pilotpaket hat einen einmaligen Festpreis laut Angebot (Spanne laut [Preisseite](/preise): 3.000–15.000 € zzgl. MwSt.).",
              "Es endet mit dem vereinbarten Zeitraum ohne Folgekosten. Es verlängert sich nicht automatisch und geht nicht automatisch in ein Abonnement über.",
              "Eine Fortsetzung erfordert einen gesonderten Auftrag. Ob und in welcher Höhe der Pilotpreis auf die Einrichtung angerechnet wird, steht im Angebot.",
              "Vorzeitige Beendigung des Pilotprojekts: [[Regelung zur Vergütung bereits erbrachter Leistungen]].",
            ],
          },
        ],
      },
      {
        id: "abonnement",
        title: "Laufzeit von Abonnements",
        blocks: [
          "Nach der Pilotphase schlagen wir eine Laufzeit von 12 Monaten vor. Monatlich kündbare Varianten sind gegen einen Aufpreis möglich, den wir vor Vertragsschluss im Angebot beziffern.",
          "Verbindlich sind die Angaben in Ihrem Vertrag: Mindestlaufzeit [[Mindestlaufzeit]], Kündigungsfrist [[Kündigungsfrist]], Verlängerung [[Verlängerungsregel]].",
        ],
      },
      {
        id: "kuendigen",
        title: "So kündigen Sie",
        blocks: [
          `Eine Kündigung in Textform genügt, z. B. per E-Mail an ${c.email}. Eine Begründung ist nicht erforderlich.`,
          "Wir machen die Kündigung nicht von einem Telefonat, einer Umfrage oder einem Rückhalteangebot abhängig und bestätigen den Eingang und das Vertragsende in Textform.",
        ],
      },
      {
        id: "erstattung",
        title: "Bereits gezahlte Beträge",
        blocks: [
          { note: "Vorlage – vor Verwendung rechtlich prüfen und mit den Vertragsbedingungen abstimmen." },
          {
            list: [
              "**Plattformgebühr:** Kündigen Sie ordentlich, gilt die Gebühr bis zum Vertragsende. Endet der Vertrag vorzeitig, weil wir kündigen oder die Leistung nicht erbringen können, erstatten wir im Voraus gezahlte Gebühren für den Zeitraum nach Vertragsende anteilig.",
              "**Einrichtung:** Die Einrichtungsgebühr vergütet die Einrichtungsarbeiten. Sie wird nicht erstattet, soweit diese Arbeiten erbracht sind. Für noch nicht erbrachte Teile erstatten wir bereits gezahlte Beträge.",
              "**Mehrdokumente:** werden nachträglich nach tatsächlicher Nutzung abgerechnet; es gibt keine Vorauszahlung, die erstattet werden müsste.",
              "**Ausfälle:** Gutschriften bei Unterschreitung der vereinbarten Verfügbarkeit richten sich nach der Service-Level-Vereinbarung: [[Regelung zu Gutschriften]].",
              "**Auszahlung:** Erstattungen überweisen wir innerhalb von [[Frist]] auf das Konto, von dem die Zahlung erfolgt ist.",
            ],
          },
        ],
      },
      {
        id: "daten",
        title: "Datenexport und Löschung",
        blocks: [
          "Vor Vertragsende können Sie Ihre Daten kostenlos in gängigen Formaten (z. B. CSV) exportieren; auf Wunsch unterstützen wir Sie dabei. Nach Vertragsende löschen wir Ihre Daten innerhalb von [[Frist]], soweit keine gesetzlichen Aufbewahrungspflichten bestehen, und bestätigen die Löschung auf Wunsch in Textform.",
        ],
      },
      {
        id: "preise",
        title: "Preisänderungen",
        blocks: ["Preise ändern sich während der Laufzeit nur nach den Regeln Ihres Vertrags: [[Preisanpassungsklausel und Sonderkündigungsrecht]]."],
      },
      {
        id: "gesetz",
        title: "Gesetzliche Rechte",
        blocks: ["Ihre gesetzlichen Rechte, insbesondere das Recht zur außerordentlichen Kündigung aus wichtigem Grund (§ 314 BGB) und Gewährleistungsrechte, bleiben unberührt."],
      },
    ],
  };
};

const en: LegalDocFactory = (ctx) => {
  const c = ctx.company;
  return {
    title: "Cancellation & refunds",
    intro: "This page describes how you end FlowPilot AI services and what happens to amounts already paid – without hidden hurdles.",
    sections: [
      {
        id: "geltung",
        title: "Scope",
        blocks: [
          "These provisions supplement the [terms of use](/agb) and the respective contract; in the event of contradictions, the contract prevails. Our offering is aimed exclusively at businesses. The statutory right of withdrawal for consumer contracts (§ 312g BGB) therefore does not apply.",
        ],
      },
      {
        id: "demo",
        title: "Demo",
        blocks: [
          `The demo is free of charge and can be used without payment details. There is nothing to cancel and nothing to refund. You can delete your demo workspace yourself at any time; without activity it is deleted automatically after ${ctx.demoTtlHours} hours.`,
        ],
      },
      {
        id: "pilot",
        title: "Pilot package",
        blocks: [
          {
            list: [
              "The pilot package has a one-off fixed price according to the offer (range according to the [pricing page](/preise): €3,000–15,000 excl. VAT).",
              "It ends with the agreed period without follow-up costs. It does not renew automatically and does not automatically turn into a subscription.",
              "Continuing requires a separate order. Whether and to what extent the pilot price is credited towards the setup is stated in the offer.",
              "Early termination of the pilot project: [[Provision on remuneration for services already rendered]].",
            ],
          },
        ],
      },
      {
        id: "abonnement",
        title: "Subscription term",
        blocks: [
          "After the pilot phase we propose a term of 12 months. Variants that can be cancelled monthly are available for a surcharge, which we quantify in the offer before the contract is concluded.",
          "The details in your contract are binding: minimum term [[minimum term]], notice period [[notice period]], renewal [[renewal rule]].",
        ],
      },
      {
        id: "kuendigen",
        title: "How to cancel",
        blocks: [
          `Cancellation in text form is sufficient, e.g. by e-mail to ${c.email}. No reason is required.`,
          "We do not make cancellation dependent on a phone call, a survey or a retention offer, and we confirm receipt and the end of the contract in text form.",
        ],
      },
      {
        id: "erstattung",
        title: "Amounts already paid",
        blocks: [
          { note: "Template – have it reviewed by a lawyer and aligned with the contract terms before use." },
          {
            list: [
              "**Platform fee:** If you cancel ordinarily, the fee applies until the end of the contract. If the contract ends early because we terminate or cannot provide the service, we refund fees paid in advance for the period after the end of the contract pro rata.",
              "**Setup:** The setup fee remunerates the setup work. It is not refunded to the extent that this work has been performed. For parts not yet performed we refund amounts already paid.",
              "**Additional documents:** are billed in arrears according to actual use; there is no prepayment that would have to be refunded.",
              "**Outages:** Credits for falling below the agreed availability are governed by the service level agreement: [[Provision on service credits]].",
              "**Payout:** We transfer refunds within [[period]] to the account from which the payment was made.",
            ],
          },
        ],
      },
      {
        id: "daten",
        title: "Data export and deletion",
        blocks: [
          "Before the end of the contract you can export your data free of charge in common formats (e.g. CSV); we support you on request. After the end of the contract we delete your data within [[period]], unless statutory retention obligations apply, and confirm the deletion in text form on request.",
        ],
      },
      {
        id: "preise",
        title: "Price changes",
        blocks: ["Prices only change during the term according to the rules of your contract: [[Price adjustment clause and special right of termination]]."],
      },
      {
        id: "gesetz",
        title: "Statutory rights",
        blocks: ["Your statutory rights, in particular the right to extraordinary termination for good cause (§ 314 BGB) and warranty rights, remain unaffected."],
      },
    ],
  };
};

export const refundDoc: Record<Lang, LegalDocFactory> = { de, en };
