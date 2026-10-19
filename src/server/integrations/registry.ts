/**
 * Integration catalogue with an honest status. "planned" means: architecture prepared, not
 * implemented. Only entries marked active actually move data – and in the demo they only move
 * data inside the workspace sandbox.
 */
import type { LocalizedText } from "@/domain/types";

export type IntegrationStatus = "active_demo" | "active" | "implemented_needs_config" | "planned";
export type IntegrationCategory = "mail" | "erp" | "accounting" | "storage" | "ai" | "ocr" | "export" | "messaging" | "identity";

export interface IntegrationInfo {
  id: string;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  description: LocalizedText;
  /** What is needed for a real connection. */
  requirements: LocalizedText[];
}

const t = (de: string, en: string): LocalizedText => ({ de, en });

export function integrationCatalogue(env: { anthropicConfigured: boolean }): IntegrationInfo[] {
  return [
    {
      id: "demo_mailbox",
      name: "Demo-Postfach",
      category: "mail",
      status: "active_demo",
      description: t("Synthetische E-Mails mit PDF-Anhängen für die Demo. Es werden keine echten Postfächer gelesen.", "Synthetic e-mails with PDF attachments for the demo. No real mailboxes are read."),
      requirements: [],
    },
    {
      id: "pdf_upload",
      name: "PDF-Upload",
      category: "mail",
      status: "active",
      description: t(
        "Eigene PDF-Dateien mit Textebene hochladen und durch die Pipeline laufen lassen. Scans ohne Textebene benötigen OCR.",
        "Upload your own PDFs with a text layer and run them through the pipeline. Scans without text layer need OCR.",
      ),
      requirements: [t("Bitte nur synthetische oder freigegebene Testdokumente verwenden.", "Please use synthetic or approved test documents only.")],
    },
    {
      id: "demo_erp",
      name: "Demo-ERP-Sandbox",
      category: "erp",
      status: "active_demo",
      description: t(
        "Simuliertes ERP mit synthetischen Stammdaten. Übergaben werden als Entwürfe im Arbeitsbereich gespeichert – keine Buchung, keine Zahlung.",
        "Simulated ERP with synthetic master data. Transfers are stored as drafts in the workspace – no posting, no payment.",
      ),
      requirements: [],
    },
    {
      id: "csv_export",
      name: "CSV-Export (Excel)",
      category: "export",
      status: "active",
      description: t("Verarbeitete Belege und das Aktivitätsprotokoll als CSV (Semikolon, UTF-8) für Excel exportieren.", "Export processed documents and the activity log as CSV (semicolon, UTF-8) for Excel."),
      requirements: [],
    },
    {
      id: "rules_extraction",
      name: "Regelbasierte Extraktion",
      category: "ai",
      status: "active",
      description: t(
        "Lokaler Demo-Adapter: erkennt Dokumenttypen, Belegfelder und Positionstabellen deutscher Geschäftsdokumente ohne externe Dienste.",
        "Local demo adapter: recognises document types, header fields and item tables of German business documents without external services.",
      ),
      requirements: [],
    },
    {
      id: "anthropic",
      name: "Claude (Anthropic API)",
      category: "ai",
      status: env.anthropicConfigured ? "active" : "implemented_needs_config",
      description: t(
        "KI-Extraktion über die Anthropic API für unbekannte Layouts. Implementiert, in dieser Umgebung ohne API-Schlüssel nicht getestet.",
        "AI extraction via the Anthropic API for unknown layouts. Implemented, not tested in this environment without an API key.",
      ),
      requirements: [
        t("Server-Umgebungsvariablen AI_PROVIDER=anthropic und ANTHROPIC_API_KEY", "Server environment variables AI_PROVIDER=anthropic and ANTHROPIC_API_KEY"),
        t("Auftragsverarbeitungsvertrag und Prüfung der Datenverarbeitung durch Ihren Datenschutz", "Data processing agreement and review by your data protection officer"),
        t("Evaluation mit einer gelabelten Stichprobe echter Dokumente vor dem Produktivbetrieb", "Evaluation on a labelled sample of real documents before going live"),
      ],
    },
    {
      id: "ms365_outlook",
      name: "Microsoft 365 / Outlook",
      category: "mail",
      status: "planned",
      description: t("Funktionspostfächer (z. B. auftrag@…) über Microsoft Graph lesen.", "Read shared mailboxes (e.g. orders@…) via Microsoft Graph."),
      requirements: [
        t("App-Registrierung in Microsoft Entra ID", "App registration in Microsoft Entra ID"),
        t("Berechtigung Mail.Read, beschränkt auf das Funktionspostfach, mit Admin-Zustimmung", "Mail.Read permission restricted to the shared mailbox, with admin consent"),
        t("Abruf per Change-Notifications oder Delta-Abfrage", "Retrieval via change notifications or delta query"),
      ],
    },
    {
      id: "sharepoint",
      name: "SharePoint / OneDrive",
      category: "storage",
      status: "planned",
      description: t("Originalbelege revisionssicher in einer festgelegten Bibliothek ablegen.", "File original documents in a defined library."),
      requirements: [t("Graph-Berechtigung Sites.Selected für die Zielbibliothek", "Graph permission Sites.Selected for the target library"), t("Ablagestruktur und Metadaten festlegen", "Define folder structure and metadata")],
    },
    {
      id: "datev",
      name: "DATEV",
      category: "accounting",
      status: "planned",
      description: t("Geprüfte Eingangsrechnungen samt Beleg an die Buchhaltung bzw. den Steuerberater übergeben.", "Hand over checked incoming invoices with document to accounting or the tax advisor."),
      requirements: [
        t("Zugang über das DATEV-Partner- bzw. Entwicklerprogramm", "Access via the DATEV partner / developer programme"),
        t("Freigabe durch Mandant bzw. Steuerberater", "Authorisation by the client or tax advisor"),
      ],
    },
    {
      id: "sap_s4",
      name: "SAP S/4HANA",
      category: "erp",
      status: "planned",
      description: t("Kundenaufträge als Entwurf anlegen, Bestellbestätigungen und Wareneingänge vorbereiten.", "Create sales orders as drafts, prepare order confirmations and goods receipts."),
      requirements: [
        t("Freigegebene OData-APIs (z. B. Sales Order) über SAP BTP oder direkt", "Released OData APIs (e.g. Sales Order) via SAP BTP or directly"),
        t("Technischer Benutzer mit minimalen Berechtigungen", "Technical user with minimal authorisations"),
      ],
    },
    {
      id: "sap_b1",
      name: "SAP Business One",
      category: "erp",
      status: "planned",
      description: t("Anbindung über den Service Layer für Aufträge und Belege.", "Connection via the Service Layer for orders and documents."),
      requirements: [t("Service-Layer-Zugang und Benutzer mit Belegberechtigung", "Service Layer access and a user with document permissions")],
    },
    {
      id: "dynamics_bc",
      name: "Microsoft Dynamics 365 Business Central",
      category: "erp",
      status: "planned",
      description: t("Verkaufsaufträge, Einkaufsbelege und Kreditorenrechnungen über die Standard-API vorbereiten.", "Prepare sales orders, purchase documents and vendor invoices via the standard API."),
      requirements: [t("Entra-ID-App mit API-Berechtigung für Business Central", "Entra ID app with API permission for Business Central"), t("Zuordnung von Mandant und Nummernserien", "Mapping of company and number series")],
    },
    {
      id: "dynamics_sales",
      name: "Microsoft Dynamics 365 Sales (CRM)",
      category: "erp",
      status: "planned",
      description: t("Anfragen und Kundenkommunikation im CRM verknüpfen.", "Link RFQs and customer communication in the CRM."),
      requirements: [t("Dataverse-Zugriff über Anwendungsbenutzer", "Dataverse access via application user")],
    },
    {
      id: "teams",
      name: "Microsoft Teams",
      category: "messaging",
      status: "planned",
      description: t("Benachrichtigungen an Kanäle oder Personen statt nur In-App.", "Notifications to channels or people instead of in-app only."),
      requirements: [t("Teams-App bzw. Workflow-Webhook pro Kanal", "Teams app or workflow webhook per channel")],
    },
    {
      id: "ocr",
      name: "OCR für Scans",
      category: "ocr",
      status: "planned",
      description: t("Texterkennung für Scans ohne Textebene, wahlweise als Cloud-Dienst in der EU oder lokal.", "Text recognition for scans without text layer, either as EU cloud service or on-premises."),
      requirements: [t("Auswahl des OCR-Dienstes und Datenschutzprüfung", "Selection of the OCR service and data protection review")],
    },
    {
      id: "sso",
      name: "Single Sign-on (Entra ID / OIDC)",
      category: "identity",
      status: "planned",
      description: t("Anmeldung mit Unternehmenskonten, Rollen aus Gruppen ableiten.", "Sign-in with company accounts, roles derived from groups."),
      requirements: [t("OIDC-App-Registrierung und Gruppen-Mapping", "OIDC app registration and group mapping")],
    },
  ];
}
