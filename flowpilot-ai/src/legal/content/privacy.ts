/**
 * Privacy policy (Art. 13 GDPR). Describes only what this code actually does; operator-specific
 * details come from the company configuration and show up as placeholders when missing.
 */
import type { Lang } from "@/i18n/core";
import type { LegalContext, LegalDocFactory } from "../types";

function names(ctx: LegalContext, category: "necessary" | "comfort") {
  return ctx.storage
    .filter((s) => s.category === category)
    .map((s) => `**${s.name}**`)
    .join(", ");
}

const de: LegalDocFactory = (ctx) => {
  const c = ctx.company;
  return {
    title: "Datenschutzerklärung",
    intro:
      "Mit dieser Erklärung informieren wir Sie nach Art. 13 DSGVO darüber, welche personenbezogenen Daten beim Besuch dieser Website und bei der Nutzung der Demo von FlowPilot AI verarbeitet werden, zu welchen Zwecken, auf welcher Rechtsgrundlage und wie lange. Beschrieben ist die tatsächliche technische Arbeitsweise dieser Installation.",
    sections: [
      {
        id: "verantwortlicher",
        title: "Verantwortlicher",
        blocks: [
          `Verantwortlich für die Datenverarbeitung ist: **${c.name}**, ${c.address}, vertreten durch ${c.representative}.`,
          `E-Mail: ${c.email} · Telefon: ${c.phone}`,
          `Für Datenschutzanliegen erreichen Sie uns unter ${c.privacyEmail} oder über das Formular [Datenschutzanfrage](/datenschutz/anfrage).`,
        ],
      },
      {
        id: "dsb",
        title: "Datenschutzbeauftragte/r",
        blocks: [`Kontakt: ${c.dpo}`],
      },
      {
        id: "ueberblick",
        title: "Überblick",
        blocks: [
          "Auf dieser Website verarbeiten wir personenbezogene Daten nur in folgenden Fällen:",
          {
            list: [
              "technisch notwendige Verarbeitung beim Aufruf der Seiten (Auslieferung, Schutz vor Missbrauch),",
              "Cookies und lokale Speicherung, soweit für die gewünschten Funktionen notwendig oder von Ihnen erlaubt,",
              "die Demo, wenn Sie sie ausdrücklich starten,",
              "Kontaktanfragen, Einwilligungen und Datenschutzanfragen, die Sie uns über die Formulare senden.",
            ],
          },
          "Wir setzen keine Analyse- oder Tracking-Werkzeuge, keine Werbe-Cookies, keine Social-Media-Plugins und keine Inhalte von Drittanbietern (z. B. Schriftarten, Skripte oder Karten von fremden Servern) ein.",
        ],
      },
      {
        id: "hosting",
        title: "Hosting und Server-Protokolle",
        blocks: [
          `Die Website wird betrieben bei: ${c.hosting}.`,
          "Beim Aufruf einer Seite verarbeitet der Server technisch zwingend Ihre IP-Adresse, Datum und Uhrzeit, die angeforderte Adresse sowie die vom Browser gesendeten Angaben (z. B. Browsertyp), um die Seite auszuliefern. Die Anwendung selbst speichert keine Zugriffsprotokolle mit IP-Adressen in ihrer Datenbank. Bei unerwarteten Fehlern schreibt sie eine technische Fehlermeldung in die Server-Konsole.",
          "Ob und wie lange der Hosting-Anbieter Server-Protokolle speichert: [[Inhalt und Speicherdauer der Server-Logs des Hosting-Anbieters]].",
          "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in der sicheren und stabilen Bereitstellung der Website. Soweit der Hosting-Anbieter Daten in unserem Auftrag verarbeitet, ist mit ihm ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO zu schließen: [[Bestätigung des Auftragsverarbeitungsvertrags mit dem Hosting-Anbieter]].",
        ],
      },
      {
        id: "missbrauchsschutz",
        title: "Schutz vor Missbrauch (Ratenbegrenzung)",
        blocks: [
          "Im Produktivbetrieb begrenzt die Anwendung, wie oft öffentliche Funktionen (z. B. Demo-Start, Kontaktformular, Datenschutzanfrage, Cookie-Auswahl) je IP-Adresse aufgerufen werden können. Dazu wird die IP-Adresse zusammen mit dem Zeitpunkt des Aufrufs ausschließlich im Arbeitsspeicher des Servers gehalten – höchstens eine Stunde lang. Sie wird nicht in der Datenbank gespeichert und geht bei einem Neustart verloren.",
          "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist der Schutz vor automatisiertem Missbrauch und Überlastung.",
        ],
      },
      {
        id: "cookies",
        title: "Cookies und lokale Speicherung",
        blocks: [
          `Technisch notwendig und ohne Einwilligung gesetzt werden: ${names(ctx, "necessary")}. Sie speichern Ihre Sprache, Ihren Demo-Arbeitsbereich, den gewählten Demo-Benutzer und Ihre Auswahl im Cookie-Hinweis. Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG; die anschließende Verarbeitung stützen wir auf Art. 6 Abs. 1 lit. b bzw. f DSGVO.`,
          `Nur mit Ihrer Einwilligung (Kategorie „Komfort“) speichern wir: ${names(ctx, "comfort")}. Rechtsgrundlage ist § 25 Abs. 1 TDDDG in Verbindung mit Art. 6 Abs. 1 lit. a DSGVO. Ohne Einwilligung bleiben diese Werte nur im Arbeitsspeicher Ihres Browsers.`,
          "Ihre Auswahl können Sie jederzeit über „Cookie-Einstellungen“ im Seitenfuß ändern oder widerrufen. Alle Einträge mit Zweck und Speicherdauer finden Sie in der [Cookie-Richtlinie](/cookies).",
        ],
      },
      {
        id: "demo",
        title: "Demo-Arbeitsbereich",
        blocks: [
          "Die Demo startet nur, wenn Sie dies ausdrücklich auswählen und bestätigen, dass Sie mindestens 18 Jahre alt sind und die Demo beruflich nutzen. Dabei wird ein isolierter Arbeitsbereich angelegt, den eine zufällige Kennung im Cookie fp_ws Ihrem Browser zuordnet. Für die Demo sind keine Anmeldung und keine Angaben zu Ihrer Person erforderlich.",
          "Der Arbeitsbereich enthält ausschließlich synthetische Daten: Firmen, Personen, Bankverbindungen und Dokumente sind erfunden. Gespeichert werden außerdem Ihre Aktionen in der Demo (z. B. Korrekturen, Freigaben, Begründungen, Regeln, Einstellungen) einschließlich des Aktivitätsprotokolls. Ihre Bestätigung beim Start wird als Nachweis mit der zufälligen Kennung des Arbeitsbereichs gespeichert; sie enthält keine Angaben zu Ihrer Person.",
          "Hochgeladene Dateien (nur PDF, höchstens 8 MB) werden in der Datenbank dieser Installation gespeichert und mit dem Arbeitsbereich gelöscht. Bitte laden Sie keine echten personenbezogenen oder vertraulichen Dokumente hoch.",
          `Der Arbeitsbereich wird nach ${ctx.demoTtlHours} Stunden ohne Aktivität automatisch gelöscht. Sie können ihn jederzeit sofort und vollständig selbst löschen („Demo-Daten löschen“ im Benutzermenü der Demo).`,
          "Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der von Ihnen gewünschten Demo) bzw. Art. 6 Abs. 1 lit. f DSGVO (Nachweis der Bestätigung).",
        ],
      },
      {
        id: "ki",
        title: "Verarbeitung durch KI",
        blocks: [
          "In Demo-Arbeitsbereichen werden Dokumente ausschließlich auf unserem Server von einem lokalen, regelbasierten Adapter ausgewertet. Es findet keine Übermittlung an KI-Anbieter statt.",
          ctx.externalAiEnabled
            ? "In dieser Installation ist zusätzlich die Anbindung an das KI-Modell Claude der Anthropic PBC (USA) aktiviert. Sie wird ausschließlich in produktiven Arbeitsbereichen (nicht in der Demo) verwendet: Zur Datenextraktion werden der Inhalt des jeweiligen Dokuments (PDF-Datei und ausgelesener Text) an Anthropic übermittelt. Dabei handelt es sich um eine Übermittlung in ein Drittland (USA). Sie ist nur zulässig, wenn ein Auftragsverarbeitungsvertrag besteht und eine Grundlage nach Art. 44 ff. DSGVO vorliegt (z. B. Zertifizierung nach dem EU-US Data Privacy Framework oder Standardvertragsklauseln): [[Konkrete Übermittlungsgrundlage und Auftragsverarbeitungsvertrag mit Anthropic]]."
            : "Eine externe KI-Anbindung ist in dieser Installation nicht aktiv. Sie kann nur für produktive Arbeitsbereiche serverseitig eingeschaltet werden; diese Erklärung beschreibt sie dann automatisch einschließlich des Empfängers und der Drittlandübermittlung.",
          "Eine automatisierte Entscheidung im Einzelfall im Sinne von Art. 22 DSGVO findet nicht statt. FlowPilot AI prüft Geschäftsdokumente (z. B. Bestellungen und Rechnungen), keine Personen. Fälle mit kritischen Abweichungen, fehlenden Angaben oder geringer Sicherheit werden Menschen zur Entscheidung vorgelegt; strittige finanzielle Vorgänge gibt die KI nie selbst frei.",
        ],
      },
      {
        id: "kontakt",
        title: "Kontaktformular",
        blocks: [
          "Wenn Sie uns über das [Kontaktformular](/kontakt) schreiben, verarbeiten wir Name, Unternehmen, E-Mail-Adresse und – freiwillig – Telefonnummer, Unternehmensgröße, betroffenen Prozess und Ihre Nachricht, um Ihre Anfrage zu bearbeiten und ein Gespräch vorzubereiten.",
          "Erforderlich sind Ihre Bestätigung, dass Sie mindestens 18 Jahre alt sind und für ein Unternehmen handeln, sowie Ihre Einwilligung in die Bearbeitung der Anfrage. Freiwillig und ohne Nachteile verweigerbar sind die Einwilligungen in E-Mail-Informationen und in einen telefonischen Rückruf.",
          "Rechtsgrundlagen sind Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) und Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen auf Ihre Anfrage).",
          `Die Angaben werden in der Datenbank dieser Installation gespeichert. Diese Installation versendet keine E-Mails. Kontaktanfragen werden ${ctx.leadRetentionDays} Tage nach Eingang zusammen mit den zugehörigen Einwilligungsnachweisen automatisch gelöscht (die Bereinigung läuft automatisch beim Eingang neuer Anfragen und beim Start neuer Demo-Arbeitsbereiche), sofern nicht gesetzliche Aufbewahrungspflichten – etwa nach einem Vertragsschluss gemäß § 257 HGB und § 147 AO – entgegenstehen.`,
          "Nach dem Absenden erhalten Sie einmalig einen persönlichen Link (/datenschutz/meine-daten). Darüber können Sie Ihre gespeicherten Angaben einsehen, als Datei herunterladen, Einwilligungen widerrufen und die Anfrage vollständig löschen. Wir speichern nur einen kryptografischen Hashwert dieses Links, nicht den Link selbst.",
          "Diese Installation versendet derzeit keine Werbe- oder Informations-E-Mails. Ein Versand setzt Ihre Einwilligung voraus und erfolgt erst, nachdem Sie Ihre Adresse über eine Bestätigungs-E-Mail (Double-Opt-in) bestätigt haben. Abmelden können Sie sich jederzeit kostenlos unter [/abmelden](/abmelden) oder über Ihren persönlichen Link; die Abmeldung wirkt sofort.",
        ],
      },
      {
        id: "einwilligungsnachweis",
        title: "Nachweis von Einwilligungen",
        blocks: [
          "Um nachweisen zu können, dass und wofür Sie eingewilligt haben (Art. 7 Abs. 1 DSGVO), speichern wir zu jeder Entscheidung: Zweck, erteilt oder nicht erteilt, Zeitpunkt, den genauen angezeigten Wortlaut, dessen Version, die Sprache und die Stelle (z. B. Cookie-Hinweis, Kontaktformular, Demo-Start). Eine IP-Adresse oder Browserkennung speichern wir dabei nicht.",
          `Nachweise zu Kontaktanfragen sind mit der Anfrage verknüpft und werden mit ihr gelöscht. Nachweise zum Cookie-Hinweis enthalten nur eine zufällige Kennung, die auch in Ihrem Cookie fp_consent steht. Sie werden ${ctx.consentRecordRetentionDays} Tage nach der jeweiligen Entscheidung automatisch gelöscht (Gültigkeit der Auswahl 12 Monate zuzüglich Verjährungsfrist für Nachweise).`,
          "Rechtsgrundlage ist Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit Art. 7 Abs. 1 DSGVO.",
        ],
      },
      {
        id: "anfragen",
        title: "Datenschutzanfragen",
        blocks: [
          "Über das Formular [Datenschutzanfrage](/datenschutz/anfrage) verarbeiten wir Name, E-Mail-Adresse, die Art Ihres Anliegens und Ihre ergänzenden Angaben, um die Anfrage zu bearbeiten und die Bearbeitung nachzuweisen. Jede Anfrage erhält eine Antwortfrist von einem Monat (Art. 12 Abs. 3 DSGVO).",
          "Ein Widerruf oder Widerspruch gegen E-Mail-Informationen wird sofort umgesetzt, weil er die Verarbeitung nur einschränkt. Andere Anliegen (z. B. Auskunft oder Löschung) bearbeitet der Betreiber nach Prüfung Ihrer Identität.",
          `Abgeschlossene Anfragen werden nach ${ctx.privacyRequestRetentionDays} Tagen gelöscht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit Art. 12 ff. und Art. 5 Abs. 2 DSGVO.`,
        ],
      },
      {
        id: "empfaenger",
        title: "Empfänger, Drittanbieter und SDKs",
        blocks: [
          "Empfänger personenbezogener Daten sind ausschließlich:",
          {
            list: [
              `der Hosting-Anbieter (${c.hosting}) als technischer Dienstleister,`,
              ctx.externalAiEnabled
                ? "Anthropic PBC (USA) für die KI-Datenextraktion in produktiven Arbeitsbereichen (siehe „Verarbeitung durch KI“)."
                : "keine weiteren Empfänger – eine externe KI-Anbindung ist nicht aktiv.",
            ],
          },
          "Die Website lädt keine Skripte, Schriftarten, Bilder oder sonstigen Inhalte von fremden Servern. Die Schriftart Inter wird von unserem Server ausgeliefert. Die einzige Programmbibliothek, die mit einem externen Dienst kommunizieren kann, ist das Anthropic-SDK; es läuft ausschließlich auf dem Server und nur, wenn die KI-Anbindung wie oben beschrieben aktiviert ist. Alle verwendeten Bibliotheken und ihre Lizenzen finden Sie unter [Lizenzen](/lizenzen).",
        ],
      },
      {
        id: "drittland",
        title: "Übermittlung in Drittländer",
        blocks: [
          ctx.externalAiEnabled
            ? "Eine Übermittlung in ein Land außerhalb der EU bzw. des EWR findet bei der KI-Datenextraktion in produktiven Arbeitsbereichen statt (USA, siehe oben). Darüber hinaus nur, wenn der Hosting-Anbieter Daten außerhalb des EWR verarbeitet: [[Serverstandort und ggf. Übermittlungsgrundlage des Hosting-Anbieters]]."
            : "Durch die Anwendung selbst findet keine Übermittlung in Länder außerhalb der EU bzw. des EWR statt. Ob der Hosting-Anbieter Daten außerhalb des EWR verarbeitet: [[Serverstandort und ggf. Übermittlungsgrundlage des Hosting-Anbieters]].",
        ],
      },
      {
        id: "speicherdauer",
        title: "Speicherdauer im Überblick",
        blocks: [
          {
            table: {
              head: ["Daten", "Speicherdauer"],
              rows: [
                ["Demo-Arbeitsbereich inkl. hochgeladener Dateien", `${ctx.demoTtlHours} Stunden nach der letzten Aktivität oder sofort auf Ihren Wunsch`],
                ["Cookies fp_ws und fp_user", "7 Tage"],
                ["Cookies fp_lang und fp_consent", "12 Monate"],
                ["Kontaktanfragen inkl. Einwilligungsnachweisen", `${ctx.leadRetentionDays} Tage nach Eingang oder sofort über Ihren persönlichen Link`],
                ["Datenschutzanfragen", `bis zur Erledigung, danach ${ctx.privacyRequestRetentionDays} Tage`],
                ["Nachweise zum Cookie-Hinweis und zur Demo-Bestätigung", `${ctx.consentRecordRetentionDays} Tage`],
                ["IP-Adressen für die Ratenbegrenzung", "höchstens 1 Stunde, nur im Arbeitsspeicher"],
                ["Server-Protokolle des Hosting-Anbieters", "[[Speicherdauer laut Hosting-Anbieter]]"],
              ],
            },
          },
        ],
      },
      {
        id: "kinder",
        title: "Kinder und Jugendliche",
        blocks: [
          "Unser Angebot richtet sich ausschließlich an Unternehmen und nicht an Personen unter 18 Jahren. Beim Start der Demo und im Kontaktformular bestätigen Sie, dass Sie mindestens 18 Jahre alt sind und beruflich handeln. Wir erheben wissentlich keine Daten von Minderjährigen.",
          `Erfahren wir, dass uns Daten einer minderjährigen Person übermittelt wurden, löschen wir sie unverzüglich. Eltern und Sorgeberechtigte wenden sich bitte an ${c.privacyEmail}.`,
        ],
      },
      {
        id: "rechte",
        title: "Ihre Rechte",
        blocks: [
          "Sie haben nach Maßgabe der DSGVO das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20). Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3); die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung bleibt unberührt.",
          "**Widerspruchsrecht (Art. 21 DSGVO):** Soweit wir Daten auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO verarbeiten, können Sie aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit widersprechen. Der Verwendung Ihrer Daten für Direktwerbung können Sie jederzeit ohne Angabe von Gründen widersprechen.",
          `So machen Sie Ihre Rechte geltend: über das Formular [Datenschutzanfrage](/datenschutz/anfrage), über Ihren persönlichen Link nach einer Kontaktanfrage, für Demo-Daten über „Demo-Daten löschen“ oder per E-Mail an ${c.privacyEmail}. Die Bearbeitung ist kostenlos; wir antworten innerhalb eines Monats.`,
        ],
      },
      {
        id: "beschwerde",
        title: "Beschwerderecht bei einer Aufsichtsbehörde",
        blocks: [
          `Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO), insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes oder des mutmaßlichen Verstoßes. Für uns zuständig ist: ${c.supervisoryAuthority}.`,
        ],
      },
      {
        id: "bereitstellung",
        title: "Pflicht zur Bereitstellung",
        blocks: [
          "Sie sind weder gesetzlich noch vertraglich verpflichtet, uns personenbezogene Daten bereitzustellen. Für die Demo sind keine Angaben zu Ihrer Person nötig. Ohne Kontaktdaten können wir eine Anfrage allerdings nicht beantworten.",
        ],
      },
      {
        id: "sicherheit",
        title: "Datensicherheit",
        blocks: [
          "Wir setzen unter anderem folgende technische und organisatorische Maßnahmen ein:",
          {
            list: [
              "Sitzungs-Cookies sind für Skripte nicht lesbar (HttpOnly), werden nur an diese Website gesendet (SameSite=Lax) und im Produktivbetrieb nur über verschlüsselte Verbindungen übertragen (Secure).",
              "Sicherheits-Header gegen Einbettung in fremde Seiten, MIME-Sniffing und unnötige Browser-Berechtigungen.",
              "Rollen- und Berechtigungsmodell mit Vier-Augen-Prinzip für sensible Änderungen und ein nur ergänzbares Aktivitätsprotokoll.",
              "Zugangsschlüssel für externe Dienste liegen ausschließlich auf dem Server; persönliche Links speichern wir nur als Hashwert.",
              "Die Verschlüsselung der Übertragung (HTTPS/TLS) hängt von der Betriebsumgebung ab: [[Bestätigung, dass die Website ausschließlich über HTTPS erreichbar ist]].",
            ],
          },
          "Kein System ist vollständig sicher. Wir passen die Maßnahmen dem Stand der Technik an.",
        ],
      },
      {
        id: "aenderungen",
        title: "Änderungen dieser Erklärung",
        blocks: [
          "Wir passen diese Erklärung an, wenn sich die Verarbeitung oder die Rechtslage ändert. Maßgeblich ist die Fassung mit dem oben angegebenen Stand. Ändern sich Texte, für die eine Einwilligung erforderlich ist, fragen wir Sie erneut.",
        ],
      },
    ],
  };
};

const en: LegalDocFactory = (ctx) => {
  const c = ctx.company;
  return {
    title: "Privacy policy",
    intro:
      "This policy informs you in accordance with Art. 13 GDPR about which personal data is processed when you visit this website and use the FlowPilot AI demo, for which purposes, on which legal basis and for how long. It describes how this installation actually works technically.",
    sections: [
      {
        id: "verantwortlicher",
        title: "Controller",
        blocks: [
          `The controller is: **${c.name}**, ${c.address}, represented by ${c.representative}.`,
          `E-mail: ${c.email} · Phone: ${c.phone}`,
          `For privacy matters, contact us at ${c.privacyEmail} or via the [privacy request](/datenschutz/anfrage) form.`,
        ],
      },
      {
        id: "dsb",
        title: "Data protection officer",
        blocks: [`Contact: ${c.dpo}`],
      },
      {
        id: "ueberblick",
        title: "Overview",
        blocks: [
          "We process personal data on this website only in the following cases:",
          {
            list: [
              "technically necessary processing when pages are requested (delivery, protection against abuse),",
              "cookies and local storage, where necessary for the functions you request or permitted by you,",
              "the demo, if you explicitly start it,",
              "contact requests, consents and privacy requests that you send us via the forms.",
            ],
          },
          "We do not use analytics or tracking tools, advertising cookies, social media plugins or third-party content (e.g. fonts, scripts or maps from external servers).",
        ],
      },
      {
        id: "hosting",
        title: "Hosting and server logs",
        blocks: [
          `The website is operated at: ${c.hosting}.`,
          "When a page is requested, the server necessarily processes your IP address, date and time, the requested address and the information sent by your browser (e.g. browser type) in order to deliver the page. The application itself does not store access logs with IP addresses in its database. In the event of unexpected errors, it writes a technical error message to the server console.",
          "Whether and for how long the hosting provider stores server logs: [[Content and retention period of the hosting provider's server logs]].",
          "The legal basis is Art. 6(1)(f) GDPR; our legitimate interest is the secure and stable provision of the website. Where the hosting provider processes data on our behalf, a data processing agreement under Art. 28 GDPR must be concluded with it: [[Confirmation of the data processing agreement with the hosting provider]].",
        ],
      },
      {
        id: "missbrauchsschutz",
        title: "Protection against abuse (rate limiting)",
        blocks: [
          "In production, the application limits how often public functions (e.g. demo start, contact form, privacy request, cookie choice) can be called per IP address. For this purpose, the IP address and the time of the request are held exclusively in the server's memory – for at most one hour. They are not stored in the database and are lost on restart.",
          "The legal basis is Art. 6(1)(f) GDPR; our legitimate interest is protection against automated abuse and overload.",
        ],
      },
      {
        id: "cookies",
        title: "Cookies and local storage",
        blocks: [
          `The following are technically necessary and set without consent: ${names(ctx, "necessary")}. They store your language, your demo workspace, the selected demo user and your choice in the cookie notice. The legal basis is § 25(2) no. 2 TDDDG; we base the subsequent processing on Art. 6(1)(b) or (f) GDPR.`,
          `Only with your consent (category “comfort”) do we store: ${names(ctx, "comfort")}. The legal basis is § 25(1) TDDDG in conjunction with Art. 6(1)(a) GDPR. Without consent these values remain in your browser's memory only.`,
          "You can change or withdraw your choice at any time via “Cookie settings” in the page footer. All entries with purpose and duration are listed in the [cookie policy](/cookies).",
        ],
      },
      {
        id: "demo",
        title: "Demo workspace",
        blocks: [
          "The demo only starts if you explicitly select it and confirm that you are at least 18 years old and use the demo for business purposes. An isolated workspace is created and assigned to your browser by a random identifier in the cookie fp_ws. The demo requires no registration and no information about you.",
          "The workspace contains synthetic data only: companies, persons, bank details and documents are fictional. Your actions in the demo (e.g. corrections, approvals, reasons, rules, settings) are also stored, including the activity log. Your confirmation at the start is stored as proof together with the random workspace identifier; it contains no information about you.",
          "Uploaded files (PDF only, at most 8 MB) are stored in the database of this installation and deleted together with the workspace. Please do not upload real personal or confidential documents.",
          `The workspace is deleted automatically after ${ctx.demoTtlHours} hours without activity. You can delete it yourself immediately and completely at any time (“Delete demo data” in the demo's user menu).`,
          "The legal basis is Art. 6(1)(b) GDPR (providing the demo you requested) and Art. 6(1)(f) GDPR (proof of the confirmation).",
        ],
      },
      {
        id: "ki",
        title: "Processing by AI",
        blocks: [
          "In demo workspaces, documents are analysed exclusively on our server by a local, rule-based adapter. Nothing is transferred to AI providers.",
          ctx.externalAiEnabled
            ? "In this installation, the connection to the AI model Claude by Anthropic PBC (USA) is additionally enabled. It is used exclusively in productive workspaces (not in the demo): for data extraction, the content of the respective document (PDF file and extracted text) is transferred to Anthropic. This is a transfer to a third country (USA). It is only permissible if a data processing agreement exists and a basis under Art. 44 et seq. GDPR is in place (e.g. certification under the EU-US Data Privacy Framework or standard contractual clauses): [[Specific transfer basis and data processing agreement with Anthropic]]."
            : "No external AI connection is active in this installation. It can only be switched on server-side for productive workspaces; this policy then automatically describes it, including the recipient and the third-country transfer.",
          "No automated individual decision-making within the meaning of Art. 22 GDPR takes place. FlowPilot AI checks business documents (e.g. purchase orders and invoices), not people. Cases with critical deviations, missing information or low confidence are presented to people for a decision; the AI never approves disputed financial transactions itself.",
        ],
      },
      {
        id: "kontakt",
        title: "Contact form",
        blocks: [
          "If you write to us via the [contact form](/kontakt), we process your name, company, e-mail address and – voluntarily – phone number, company size, the process concerned and your message in order to handle your request and prepare a conversation.",
          "Required are your confirmation that you are at least 18 years old and acting for a business, and your consent to the handling of the request. The consents to e-mail information and to a phone call-back are voluntary and can be refused without disadvantage.",
          "The legal bases are Art. 6(1)(a) GDPR (consent) and Art. 6(1)(b) GDPR (pre-contractual measures at your request).",
          `The details are stored in the database of this installation. This installation does not send e-mails. Contact requests are deleted automatically ${ctx.leadRetentionDays} days after receipt together with the related consent records (the clean-up runs automatically when new requests arrive and when new demo workspaces are started), unless statutory retention obligations – e.g. after conclusion of a contract under § 257 HGB and § 147 AO – prevent this.`,
          "After submitting, you receive a personal link (/datenschutz/meine-daten) once. With it you can view your stored details, download them as a file, withdraw consents and delete the request completely. We only store a cryptographic hash of this link, not the link itself.",
          "This installation currently sends no advertising or information e-mails. Any mailing requires your consent and only takes place after you have confirmed your address via a confirmation e-mail (double opt-in). You can unsubscribe free of charge at any time at [/abmelden](/abmelden) or via your personal link; the unsubscription takes effect immediately.",
        ],
      },
      {
        id: "einwilligungsnachweis",
        title: "Proof of consent",
        blocks: [
          "To be able to prove that and for what you consented (Art. 7(1) GDPR), we store for each decision: purpose, granted or not granted, time, the exact wording shown, its version, the language and the place (e.g. cookie notice, contact form, demo start). We do not store an IP address or browser identifier in this context.",
          `Records relating to contact requests are linked to the request and deleted with it. Records relating to the cookie notice only contain a random identifier that is also stored in your cookie fp_consent. They are deleted automatically ${ctx.consentRecordRetentionDays} days after the respective decision (validity of the choice 12 months plus the limitation period for proof).`,
          "The legal basis is Art. 6(1)(c) GDPR in conjunction with Art. 7(1) GDPR.",
        ],
      },
      {
        id: "anfragen",
        title: "Privacy requests",
        blocks: [
          "Via the [privacy request](/datenschutz/anfrage) form we process your name, e-mail address, the type of request and your additional details in order to handle the request and document its handling. Each request receives a response deadline of one month (Art. 12(3) GDPR).",
          "A withdrawal of consent or an objection to e-mail information is implemented immediately because it only restricts processing. Other requests (e.g. access or erasure) are handled by the operator after verifying your identity.",
          `Completed requests are deleted after ${ctx.privacyRequestRetentionDays} days. The legal basis is Art. 6(1)(c) GDPR in conjunction with Art. 12 et seq. and Art. 5(2) GDPR.`,
        ],
      },
      {
        id: "empfaenger",
        title: "Recipients, third parties and SDKs",
        blocks: [
          "Recipients of personal data are exclusively:",
          {
            list: [
              `the hosting provider (${c.hosting}) as technical service provider,`,
              ctx.externalAiEnabled
                ? "Anthropic PBC (USA) for AI data extraction in productive workspaces (see “Processing by AI”)."
                : "no further recipients – no external AI connection is active.",
            ],
          },
          "The website does not load scripts, fonts, images or other content from external servers. The Inter typeface is served from our server. The only library that can communicate with an external service is the Anthropic SDK; it runs exclusively on the server and only when the AI connection is enabled as described above. All libraries used and their licences are listed under [Licences](/lizenzen).",
        ],
      },
      {
        id: "drittland",
        title: "Transfers to third countries",
        blocks: [
          ctx.externalAiEnabled
            ? "A transfer to a country outside the EU/EEA takes place for AI data extraction in productive workspaces (USA, see above). Beyond that only if the hosting provider processes data outside the EEA: [[Server location and, if applicable, transfer basis of the hosting provider]]."
            : "The application itself does not transfer data to countries outside the EU/EEA. Whether the hosting provider processes data outside the EEA: [[Server location and, if applicable, transfer basis of the hosting provider]].",
        ],
      },
      {
        id: "speicherdauer",
        title: "Retention periods at a glance",
        blocks: [
          {
            table: {
              head: ["Data", "Retention"],
              rows: [
                ["Demo workspace incl. uploaded files", `${ctx.demoTtlHours} hours after the last activity or immediately at your request`],
                ["Cookies fp_ws and fp_user", "7 days"],
                ["Cookies fp_lang and fp_consent", "12 months"],
                ["Contact requests incl. consent records", `${ctx.leadRetentionDays} days after receipt or immediately via your personal link`],
                ["Privacy requests", `until completed, then ${ctx.privacyRequestRetentionDays} days`],
                ["Cookie notice and demo confirmation records", `${ctx.consentRecordRetentionDays} days`],
                ["IP addresses for rate limiting", "at most 1 hour, in memory only"],
                ["Hosting provider's server logs", "[[retention period according to hosting provider]]"],
              ],
            },
          },
        ],
      },
      {
        id: "kinder",
        title: "Children and minors",
        blocks: [
          "Our offering is aimed exclusively at businesses and not at persons under 18. When starting the demo and in the contact form you confirm that you are at least 18 years old and acting for business purposes. We do not knowingly collect data from minors.",
          `If we learn that data of a minor has been submitted to us, we delete it without undue delay. Parents and guardians please contact ${c.privacyEmail}.`,
        ],
      },
      {
        id: "rechte",
        title: "Your rights",
        blocks: [
          "Under the GDPR you have the right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18) and data portability (Art. 20). You can withdraw a consent at any time with effect for the future (Art. 7(3)); the lawfulness of processing carried out until then remains unaffected.",
          "**Right to object (Art. 21 GDPR):** Where we process data on the basis of Art. 6(1)(f) GDPR, you can object at any time on grounds relating to your particular situation. You can object to the use of your data for direct marketing at any time without giving reasons.",
          `How to exercise your rights: via the [privacy request](/datenschutz/anfrage) form, via your personal link after a contact request, for demo data via “Delete demo data”, or by e-mail to ${c.privacyEmail}. Handling is free of charge; we respond within one month.`,
        ],
      },
      {
        id: "beschwerde",
        title: "Right to lodge a complaint with a supervisory authority",
        blocks: [
          `You have the right to lodge a complaint with a data protection supervisory authority (Art. 77 GDPR), in particular in the member state of your habitual residence, place of work or the place of the alleged infringement. The authority competent for us is: ${c.supervisoryAuthority}.`,
        ],
      },
      {
        id: "bereitstellung",
        title: "Obligation to provide data",
        blocks: [
          "You are under no statutory or contractual obligation to provide personal data. The demo requires no information about you. Without contact details, however, we cannot answer a request.",
        ],
      },
      {
        id: "sicherheit",
        title: "Data security",
        blocks: [
          "Among other things, we use the following technical and organisational measures:",
          {
            list: [
              "Session cookies cannot be read by scripts (HttpOnly), are only sent to this website (SameSite=Lax) and in production are only transmitted over encrypted connections (Secure).",
              "Security headers against embedding in third-party pages, MIME sniffing and unnecessary browser permissions.",
              "Role and permission model with the four-eyes principle for sensitive changes and an append-only activity log.",
              "Access keys for external services are stored on the server only; we store personal links only as a hash.",
              "Transport encryption (HTTPS/TLS) depends on the deployment: [[Confirmation that the website is only reachable via HTTPS]].",
            ],
          },
          "No system is completely secure. We adapt the measures to the state of the art.",
        ],
      },
      {
        id: "aenderungen",
        title: "Changes to this policy",
        blocks: [
          "We update this policy when the processing or the legal situation changes. The version with the date shown above applies. If texts that require consent change, we ask you again.",
        ],
      },
    ],
  };
};

export const privacyDoc: Record<Lang, LegalDocFactory> = { de, en };
