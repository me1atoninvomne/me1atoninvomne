/**
 * Terms of use (AGB) – B2B only. Template: operator-specific values are placeholders and the
 * liability clauses must be reviewed by a lawyer before productive use.
 */
import type { Lang } from "@/i18n/core";
import type { LegalDocFactory } from "../types";

const de: LegalDocFactory = (ctx) => {
  const c = ctx.company;
  return {
    title: "Nutzungsbedingungen (AGB)",
    intro: `Diese Bedingungen regeln die Nutzung der Website und der Demo von FlowPilot AI sowie – ergänzend zum jeweiligen Vertrag – die kostenpflichtigen Leistungen von ${c.name}.`,
    sections: [
      {
        id: "geltung",
        title: "Geltungsbereich und Anbieter",
        blocks: [
          `Anbieter ist ${c.name}, ${c.address} („wir“). Diese Bedingungen gelten für die Website, die Demo und – soweit der Einzelvertrag nichts Abweichendes regelt – für kostenpflichtige Leistungen.`,
          "Abweichende oder ergänzende Bedingungen des Kunden gelten nur, wenn wir ihnen ausdrücklich in Textform zustimmen.",
        ],
      },
      {
        id: "unternehmer",
        title: "Nur für Unternehmen",
        blocks: [
          "Unser Angebot richtet sich ausschließlich an Unternehmer im Sinne von § 14 BGB, juristische Personen des öffentlichen Rechts und öffentlich-rechtliche Sondervermögen. Verbraucherinnen und Verbraucher (§ 13 BGB) sowie Personen unter 18 Jahren dürfen die Demo nicht nutzen und keine Verträge mit uns schließen.",
          "Beim Start der Demo und im Kontaktformular bestätigen Sie, dass Sie mindestens 18 Jahre alt sind und beruflich handeln. Wir können vor Vertragsschluss einen Nachweis der Unternehmereigenschaft verlangen.",
        ],
      },
      {
        id: "demo",
        title: "Demo",
        blocks: [
          {
            list: [
              "Die Demo ist kostenlos. Sie erfordert keine Anmeldung und keine Zahlungsdaten.",
              "Sie enthält ausschließlich synthetische Daten. Aktionen in der Demo versenden keine E-Mails, ändern keine echten ERP-Daten und lösen keine Zahlungen oder sonstigen Rechtsgeschäfte aus. Übergaben an das „Demo-ERP“ sind Entwürfe innerhalb Ihres Demo-Arbeitsbereichs.",
              "Laden Sie keine echten personenbezogenen Daten, Geschäftsgeheimnisse oder rechtswidrigen Inhalte hoch. Für hochgeladene Inhalte sind Sie verantwortlich.",
              `Demo-Arbeitsbereiche werden nach ${ctx.demoTtlHours} Stunden ohne Aktivität automatisch gelöscht; Sie können sie jederzeit selbst löschen. Ein Anspruch auf Verfügbarkeit, bestimmte Funktionen oder Aufbewahrung von Demo-Daten besteht nicht.`,
              "Untersagt sind insbesondere automatisierte Massenabrufe, Versuche, Sicherheitsmaßnahmen zu umgehen oder auf fremde Arbeitsbereiche zuzugreifen, sowie jede Nutzung, die den Betrieb beeinträchtigt.",
            ],
          },
        ],
      },
      {
        id: "leistungen",
        title: "Kostenpflichtige Leistungen und Preise",
        blocks: [
          "Kostenpflichtige Leistungen (Pilotprojekt, Einrichtung, Plattformnutzung, Anbindungen) kommen nur durch einen gesonderten Vertrag zustande – in der Regel durch unser schriftliches Angebot und Ihre Annahme in Textform. Bestandteil sind das Angebot bzw. Auftragsformular, diese Bedingungen und – bei Verarbeitung personenbezogener Daten – ein Vertrag zur Auftragsverarbeitung.",
          "Die auf der Seite [Preise](/preise) genannten Beträge sind Einführungskonditionen und verstehen sich zuzüglich der gesetzlichen Umsatzsteuer. Verbindlich sind die im Angebot genannten Preise, Volumengrenzen und Preise für Mehrdokumente. Leistungen „ohne Grenze“ bieten wir nicht an.",
          "Kosten, die weder auf der Preisseite noch im Angebot genannt sind, entstehen nur, wenn Sie ihnen vorher in Textform zustimmen.",
          "Zahlungsbedingungen: [[Fälligkeit, Abrechnungszeitraum und Zahlungsziel]].",
        ],
      },
      {
        id: "laufzeit",
        title: "Pilotprojekt, Laufzeit und Kündigung",
        blocks: [
          "Ein Pilotprojekt hat einen festen Umfang und Preis und endet mit dem vereinbarten Zeitraum. Es verlängert sich nicht automatisch in ein Abonnement; eine Fortsetzung erfordert einen gesonderten Auftrag.",
          "Laufzeit und Kündigungsfrist eines Abonnements: [[Mindestlaufzeit, Kündigungsfrist, Verlängerungsregel]]. Eine Kündigung in Textform (z. B. per E-Mail) genügt. Einzelheiten, auch zu Erstattungen, regelt die Seite [Kündigung & Erstattung](/erstattung).",
          "Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.",
        ],
      },
      {
        id: "ki",
        title: "KI-Ergebnisse und Ihre Mitwirkung",
        blocks: [
          "FlowPilot AI liest Dokumente automatisiert aus und prüft sie anhand Ihrer Stammdaten und Regeln. Automatisch erkannte Werte können falsch oder unvollständig sein; angezeigte Sicherheitswerte sind Schätzungen. Die Software ist so ausgelegt, dass Fälle mit kritischen Abweichungen, fehlenden Angaben oder geringer Sicherheit Menschen vorgelegt werden.",
          "Sie sind verantwortlich für die Konfiguration von Regeln, Freigabegrenzen und Automatisierungsstufen sowie für die Prüfung der Ergebnisse, bevor Sie darauf gestützte Geschäftsentscheidungen treffen – insbesondere bei Zahlungen, Bankverbindungen und Preisen.",
        ],
      },
      {
        id: "zusicherungen",
        title: "Keine Zusicherung bestimmter Ergebnisse",
        blocks: [
          "Wir sichern weder eine bestimmte Automatisierungsquote noch eine bestimmte Zeit- oder Kostenersparnis zu. Berechnungen im ROI-Rechner und im ROI-Dashboard sind Schätzungen auf Grundlage Ihrer Eingaben und der gemessenen Werte; das Ergebnis kann auch negativ sein. Zugesicherte Eigenschaften gelten nur, wenn sie im Vertrag ausdrücklich als solche bezeichnet sind.",
        ],
      },
      {
        id: "verfuegbarkeit",
        title: "Verfügbarkeit und Support",
        blocks: ["Für kostenpflichtige Leistungen gelten die im Vertrag vereinbarte Verfügbarkeit, Wartungsfenster und Reaktionszeiten: [[Service-Level-Vereinbarung]]."],
      },
      {
        id: "rechte",
        title: "Nutzungsrechte und Kundendaten",
        blocks: [
          "Sie erhalten für die Vertragslaufzeit ein einfaches, nicht übertragbares Recht, die Software im vereinbarten Umfang für eigene Geschäftszwecke zu nutzen.",
          "Ihre Daten bleiben Ihre Daten. Wir verwenden sie ausschließlich, um die vereinbarten Leistungen zu erbringen. Bei Vertragsende stellen wir sie Ihnen kostenlos in einem gängigen Format zur Verfügung und löschen sie anschließend (siehe [Kündigung & Erstattung](/erstattung)).",
          "Die Software enthält Open-Source-Komponenten, für die deren eigene Lizenzen gelten (siehe [Lizenzen](/lizenzen)).",
        ],
      },
      {
        id: "datenschutz",
        title: "Datenschutz und Auftragsverarbeitung",
        blocks: [
          "Wie wir auf der Website und in der Demo mit Daten umgehen, beschreibt die [Datenschutzerklärung](/datenschutz).",
          "Sollen im Rahmen kostenpflichtiger Leistungen personenbezogene Daten verarbeitet werden, schließen die Parteien vor Beginn einen Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. Ohne diesen Vertrag dürfen keine personenbezogenen Daten verarbeitet werden.",
        ],
      },
      {
        id: "haftung",
        title: "Haftung",
        blocks: [
          { note: "Vorlage für typische B2B-Haftungsregelungen – vor Verwendung rechtlich prüfen und an das konkrete Angebot anpassen." },
          "Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit, nach dem Produkthaftungsgesetz sowie im Umfang einer übernommenen Garantie.",
          "Bei leichter Fahrlässigkeit haften wir nur bei Verletzung einer wesentlichen Vertragspflicht, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung Sie regelmäßig vertrauen dürfen (Kardinalpflicht). In diesem Fall ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt: [[optional: Haftungshöchstbetrag je Schadensfall und Vertragsjahr]].",
          "Für die unentgeltliche Demo haften wir – außer bei Verletzung von Leben, Körper oder Gesundheit – nur für Vorsatz und grobe Fahrlässigkeit.",
          "Für den Verlust von Daten haften wir nur in Höhe des Aufwands, der bei regelmäßiger, dem Risiko angemessener Datensicherung zur Wiederherstellung erforderlich gewesen wäre. Im Übrigen ist die Haftung ausgeschlossen.",
        ],
      },
      {
        id: "aenderungen",
        title: "Änderungen dieser Bedingungen",
        blocks: [
          "Für die Demo gilt die jeweils aktuelle Fassung. Änderungen für laufende kostenpflichtige Verträge teilen wir mindestens [[Frist, z. B. sechs Wochen]] vor Inkrafttreten in Textform mit; Sie können ihnen widersprechen. Wesentliche Vertragsinhalte wie Preis und Leistungsumfang ändern wir nicht einseitig.",
        ],
      },
      {
        id: "schluss",
        title: "Schlussbestimmungen",
        blocks: [
          "Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).",
          `Ist der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist ausschließlicher Gerichtsstand ${c.city}.`,
          "Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.",
        ],
      },
    ],
  };
};

const en: LegalDocFactory = (ctx) => {
  const c = ctx.company;
  return {
    title: "Terms of use",
    intro: `These terms govern the use of the FlowPilot AI website and demo and – in addition to the respective contract – the paid services of ${c.name}. The German version is legally binding; this translation is provided for convenience.`,
    sections: [
      {
        id: "geltung",
        title: "Scope and provider",
        blocks: [
          `The provider is ${c.name}, ${c.address} (“we”). These terms apply to the website, the demo and – unless the individual contract provides otherwise – to paid services.`,
          "Deviating or supplementary terms of the customer only apply if we expressly agree to them in text form.",
        ],
      },
      {
        id: "unternehmer",
        title: "Businesses only",
        blocks: [
          "Our offering is aimed exclusively at entrepreneurs within the meaning of § 14 BGB (German Civil Code), legal entities under public law and special funds under public law. Consumers (§ 13 BGB) and persons under 18 may not use the demo or conclude contracts with us.",
          "When starting the demo and in the contact form, you confirm that you are at least 18 years old and acting for business purposes. We may request proof of business status before concluding a contract.",
        ],
      },
      {
        id: "demo",
        title: "Demo",
        blocks: [
          {
            list: [
              "The demo is free of charge. It requires no registration and no payment details.",
              "It contains synthetic data only. Actions in the demo do not send e-mails, do not change real ERP data and do not trigger payments or other legal transactions. Transfers to the “demo ERP” are drafts within your demo workspace.",
              "Do not upload real personal data, trade secrets or unlawful content. You are responsible for uploaded content.",
              `Demo workspaces are deleted automatically after ${ctx.demoTtlHours} hours without activity; you can delete them yourself at any time. There is no entitlement to availability, specific functions or retention of demo data.`,
              "In particular, automated bulk requests, attempts to circumvent security measures or to access other workspaces, and any use that impairs operation are prohibited.",
            ],
          },
        ],
      },
      {
        id: "leistungen",
        title: "Paid services and prices",
        blocks: [
          "Paid services (pilot project, setup, platform use, connections) are only provided under a separate contract – usually our written offer and your acceptance in text form. The contract comprises the offer or order form, these terms and – where personal data is processed – a data processing agreement.",
          "The amounts on the [pricing](/preise) page are introductory terms and exclude statutory VAT. The prices, volume limits and prices for additional documents stated in the offer are binding. We do not offer “unlimited” services.",
          "Costs that are neither stated on the pricing page nor in the offer only arise if you agree to them in advance in text form.",
          "Payment terms: [[Due date, billing period and payment term]].",
        ],
      },
      {
        id: "laufzeit",
        title: "Pilot project, term and termination",
        blocks: [
          "A pilot project has a fixed scope and price and ends with the agreed period. It does not renew automatically into a subscription; continuing requires a separate order.",
          "Term and notice period of a subscription: [[Minimum term, notice period, renewal rule]]. Termination in text form (e.g. by e-mail) is sufficient. Details, including refunds, are set out on the [cancellation & refunds](/erstattung) page.",
          "The right to extraordinary termination for good cause remains unaffected.",
        ],
      },
      {
        id: "ki",
        title: "AI results and your cooperation",
        blocks: [
          "FlowPilot AI reads documents automatically and checks them against your master data and rules. Automatically recognised values can be wrong or incomplete; displayed confidence values are estimates. The software is designed so that cases with critical deviations, missing information or low confidence are presented to people.",
          "You are responsible for configuring rules, approval limits and automation levels and for reviewing the results before making business decisions based on them – in particular for payments, bank details and prices.",
        ],
      },
      {
        id: "zusicherungen",
        title: "No guarantee of specific results",
        blocks: [
          "We guarantee neither a specific automation rate nor specific time or cost savings. Calculations in the ROI calculator and ROI dashboard are estimates based on your input and measured values; the result can also be negative. Warranted characteristics only apply if they are expressly designated as such in the contract.",
        ],
      },
      {
        id: "verfuegbarkeit",
        title: "Availability and support",
        blocks: ["For paid services, the availability, maintenance windows and response times agreed in the contract apply: [[Service level agreement]]."],
      },
      {
        id: "rechte",
        title: "Rights of use and customer data",
        blocks: [
          "For the term of the contract you receive a simple, non-transferable right to use the software to the agreed extent for your own business purposes.",
          "Your data remains your data. We use it exclusively to provide the agreed services. At the end of the contract we provide it to you free of charge in a common format and delete it afterwards (see [cancellation & refunds](/erstattung)).",
          "The software contains open-source components to which their own licences apply (see [licences](/lizenzen)).",
        ],
      },
      {
        id: "datenschutz",
        title: "Data protection and data processing",
        blocks: [
          "How we handle data on the website and in the demo is described in the [privacy policy](/datenschutz).",
          "If personal data is to be processed as part of paid services, the parties conclude a data processing agreement under Art. 28 GDPR before the start. Without this agreement, no personal data may be processed.",
        ],
      },
      {
        id: "haftung",
        title: "Liability",
        blocks: [
          { note: "Template for typical B2B liability provisions – have it reviewed by a lawyer and adapt it to the specific offer before use." },
          "We are liable without limitation for intent and gross negligence, for injury to life, body or health, under the Product Liability Act and to the extent of any guarantee given.",
          "In the case of slight negligence, we are only liable for breach of an essential contractual obligation whose fulfilment makes the proper performance of the contract possible in the first place and on whose compliance you may regularly rely (cardinal obligation). In this case liability is limited to the foreseeable damage typical for the contract: [[optional: maximum liability per incident and contract year]].",
          "For the free demo we are only liable – except for injury to life, body or health – for intent and gross negligence.",
          "For loss of data we are only liable for the effort that would have been required for restoration with regular data backups appropriate to the risk. Otherwise liability is excluded.",
        ],
      },
      {
        id: "aenderungen",
        title: "Changes to these terms",
        blocks: [
          "The current version applies to the demo. We notify changes for ongoing paid contracts in text form at least [[period, e.g. six weeks]] before they take effect; you may object to them. We do not unilaterally change essential contract terms such as price and scope of services.",
        ],
      },
      {
        id: "schluss",
        title: "Final provisions",
        blocks: [
          "The law of the Federal Republic of Germany applies, excluding the UN Convention on Contracts for the International Sale of Goods (CISG).",
          `If the customer is a merchant, a legal entity under public law or a special fund under public law, the exclusive place of jurisdiction is ${c.city}.`,
          "Should any provision be invalid, the validity of the remaining provisions remains unaffected.",
        ],
      },
    ],
  };
};

export const termsDoc: Record<Lang, LegalDocFactory> = { de, en };
