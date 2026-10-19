import { formatters } from "@/i18n/core";
import { auditText } from "@/i18n/audit";
import { requireSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { csvResponse, errorResponse } from "@/server/http";
import { audit, listAudit } from "@/server/services/audit";

export async function GET() {
  try {
    const s = await requireSession();
    s.require("audit.export");
    const db = await getDb();
    const f = formatters(s.lang);
    const events = await listAudit(db, s.workspace.id, { limit: 1000 });
    const rows = events.map((e) => [f.dateTime(e.at), e.actorType, e.actorName, e.action, e.entityType, e.entityId ?? "", e.documentId ?? "", auditText(e.action, e.params, s.lang, f)]);
    await audit(db, { workspaceId: s.workspace.id, actorType: "user", actorId: s.user.id, actorName: s.user.name, action: "export.csv", entityType: "export", params: { kind: "audit", rows: rows.length } });
    const header = s.lang === "de" ? ["Zeitpunkt", "Akteur-Typ", "Akteur", "Aktion", "Objekt", "Objekt-ID", "Dokument-ID", "Beschreibung"] : ["Time", "Actor type", "Actor", "Action", "Entity", "Entity ID", "Document ID", "Description"];
    return csvResponse(`flowpilot-protokoll-${new Date().toISOString().slice(0, 10)}.csv`, header, rows);
  } catch (error) {
    return errorResponse(error);
  }
}
