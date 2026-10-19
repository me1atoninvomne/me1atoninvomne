import { formatters } from "@/i18n/core";
import { dom } from "@/i18n/domain";
import { requireSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { csvResponse, errorResponse } from "@/server/http";
import { audit } from "@/server/services/audit";
import { getInbox } from "@/server/services/queries";

export async function GET() {
  try {
    const s = await requireSession();
    s.require("inbox.read");
    const d = dom(s.lang);
    const f = formatters(s.lang);
    const inbox = await getInbox(s);
    const rows = inbox.emails.flatMap((e) =>
      e.documents.map((doc) => [
        f.dateTime(e.receivedAt),
        e.fromName,
        e.subject,
        doc.fileName ?? "",
        doc.docType ? d.docType[doc.docType as keyof typeof d.docType] : "",
        doc.documentNumber ?? "",
        doc.partyName ?? "",
        doc.netAmount,
        doc.grossAmount,
        d.status[doc.status],
        doc.route ? d.route[doc.route] : "",
        doc.critical,
        doc.warnings,
        doc.decidedBy ?? "",
        doc.exportRef ?? "",
      ]),
    );
    await audit(await getDb(), { workspaceId: s.workspace.id, actorType: "user", actorId: s.user.id, actorName: s.user.name, action: "export.csv", entityType: "export", params: { kind: "documents", rows: rows.length } });
    const header =
      s.lang === "de"
        ? ["Eingang", "Absender", "Betreff", "Datei", "Dokumenttyp", "Belegnummer", "Geschäftspartner", "Netto (EUR)", "Brutto (EUR)", "Status", "Weg", "Kritisch", "Warnungen", "Entschieden von", "ERP-Referenz"]
        : ["Received", "Sender", "Subject", "File", "Document type", "Document no.", "Business partner", "Net (EUR)", "Gross (EUR)", "Status", "Route", "Critical", "Warnings", "Decided by", "ERP reference"];
    return csvResponse(`flowpilot-belege-${new Date().toISOString().slice(0, 10)}.csv`, header, rows);
  } catch (error) {
    return errorResponse(error);
  }
}
