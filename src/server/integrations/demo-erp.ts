/**
 * ERP connector interface and the demo sandbox implementation.
 *
 * Connectors only ever create drafts / staged records. Releasing an order, posting an invoice or
 * triggering a payment remains a human action in the target system.
 */
import "server-only";
import { and, count, eq } from "drizzle-orm";
import { documentNetAmount } from "@/domain/documents";
import type { DocType, Extraction, LocalizedText } from "@/domain/types";
import { schema, type Db } from "@/server/db/client";
import { newId, nowIso } from "@/server/ids";

export type StageKind = "sales_order_draft" | "po_confirmation" | "goods_receipt_draft" | "invoice_prebooking" | "po_date_update";

export const STAGE_KIND_LABEL: Record<StageKind, LocalizedText> = {
  sales_order_draft: { de: "Auftragsentwurf", en: "Sales order draft" },
  po_confirmation: { de: "Bestätigung zur Bestellung", en: "Purchase order confirmation" },
  goods_receipt_draft: { de: "Wareneingang (vorbereitet)", en: "Goods receipt (prepared)" },
  invoice_prebooking: { de: "Rechnungsvorerfassung (keine Zahlung)", en: "Invoice pre-entry (no payment)" },
  po_date_update: { de: "Terminänderung zur Bestellung", en: "Purchase order date change" },
};

const PREFIX: Record<StageKind, string> = {
  sales_order_draft: "AE",
  po_confirmation: "AB",
  goods_receipt_draft: "WE",
  invoice_prebooking: "RV",
  po_date_update: "TA",
};

export function stageKindFor(docType: DocType): StageKind | null {
  switch (docType) {
    case "purchase_order":
      return "sales_order_draft";
    case "order_confirmation":
      return "po_confirmation";
    case "delivery_note":
      return "goods_receipt_draft";
    case "invoice":
      return "invoice_prebooking";
    case "delay_notice":
      return "po_date_update";
    default:
      return null;
  }
}

export interface StageRequest {
  workspaceId: string;
  documentId: string;
  fileName: string | null;
  partyNumber: string | null;
  extraction: Extraction;
  createdBy: string;
  /** "auto" when released by an automation rule, otherwise the approving user. */
  mode: "auto" | "approved";
}

export interface ErpConnector {
  id: string;
  label: LocalizedText;
  stage(db: Db, req: StageRequest): Promise<{ externalRef: string; kind: StageKind; payload: Record<string, unknown> }>;
}

export const demoErpConnector: ErpConnector = {
  id: "demo_erp",
  label: { de: "Demo-ERP-Sandbox", en: "Demo ERP sandbox" },
  async stage(db, req) {
    const kind = stageKindFor(req.extraction.docType);
    if (!kind) throw new Error(`No ERP transfer for ${req.extraction.docType}`);
    const [{ n }] = await db
      .select({ n: count() })
      .from(schema.erpRecords)
      .where(and(eq(schema.erpRecords.workspaceId, req.workspaceId), eq(schema.erpRecords.kind, kind)));
    const externalRef = `DEMO-${PREFIX[kind]}-${String(n + 1).padStart(4, "0")}`;
    const v = (k: keyof Extraction["fields"]) => req.extraction.fields[k]?.value ?? null;
    const payload = {
      mode: "draft",
      releasedBy: req.mode,
      sourceDocument: req.fileName,
      partner: { number: req.partyNumber, name: v("partyName") },
      documentNumber: v("documentNumber"),
      documentDate: v("documentDate"),
      reference: v("referenceNumber"),
      deliveryDate: v("deliveryDate"),
      deliveryAddress: v("deliveryAddress"),
      paymentTerms: v("paymentTerms"),
      netAmount: documentNetAmount(req.extraction.fields, req.extraction.lineItems),
      grossAmount: v("grossTotal") != null ? Number(v("grossTotal")) : null,
      currency: v("currency") ?? "EUR",
      lines: req.extraction.lineItems.map((li) => ({
        pos: li.pos,
        article: li.articleNo,
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unitPrice: li.unitPrice,
        total: li.total,
      })),
    };
    await db.insert(schema.erpRecords).values({
      id: newId("erp"),
      workspaceId: req.workspaceId,
      documentId: req.documentId,
      connector: "demo_erp",
      kind,
      externalRef,
      payload,
      status: "staged",
      createdAt: nowIso(),
      createdBy: req.createdBy,
    });
    return { externalRef, kind, payload };
  },
};
