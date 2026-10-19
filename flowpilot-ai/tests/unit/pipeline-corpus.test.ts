/**
 * End-to-end check of the processing chain on the synthetic demo corpus:
 * real PDF rendering → text extraction → classification → extraction → validation → routing.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { INDUSTRY_TEMPLATES } from "@/domain/templates";
import type { IssueCode, Route } from "@/domain/types";
import { demoRulesProvider } from "@/server/ai/demo-provider";
import { buildCorpus } from "@/server/demo/corpus";
import { buildMasterData, OWN_COMPANY } from "@/server/demo/master-data";
import { renderPdf } from "@/server/documents/pdf-render";
import { analyzeDocument, type AnalysisResult } from "@/server/pipeline/analyze";

const today = "2026-10-19";
const corpus = buildCorpus(today);
const master = buildMasterData(today);
const tpl = INDUSTRY_TEMPLATES.order_processing;
const workflows = tpl.workflows.map((w) => ({ id: w.key, docTypes: w.docTypes, active: true, params: w.params }));
const results: Record<string, AnalysisResult> = {};

beforeAll(async () => {
  for (const e of Object.values(corpus)) {
    const att = e.attachments[0];
    results[e.key] = await analyzeDocument({
      pdf: att ? await renderPdf(att.spec) : null,
      bodyText: e.body,
      fileName: att?.fileName ?? null,
      emailSubject: e.subject,
      emailFromName: e.fromName,
      emailReceivedAt: `${today}T07:30:00Z`,
      ownCompanyName: OWN_COMPANY.name,
      ownVatId: OWN_COMPANY.vatId,
      master,
      knownDocuments: [],
      workflows,
      rules: tpl.rules,
      today,
      provider: demoRulesProvider,
    });
  }
});

const expectations: [key: string, docType: string, route: Route, issues: IssueCode[]][] = [
  ["po_clean", "purchase_order", "auto", []],
  ["po_price_mismatch", "purchase_order", "review", ["PRICE_MISMATCH"]],
  ["po_unknown_customer", "purchase_order", "review", ["UNKNOWN_PARTY"]],
  ["po_duplicate", "purchase_order", "review", ["DUPLICATE_ORDER"]],
  ["po_freetext", "purchase_order", "review", ["MISSING_DELIVERY_DATE", "MISSING_REQUIRED_FIELD"]],
  ["ab_qty_mismatch", "order_confirmation", "review", ["QTY_MISMATCH", "DATE_SHIFT"]],
  ["ab_match", "order_confirmation", "auto", []],
  ["inv_iban_changed", "invoice", "review", ["IBAN_CHANGED"]],
  ["inv_sum_mismatch", "invoice", "review", ["SUM_MISMATCH"]],
  ["inv_duplicate", "invoice", "review", ["DUPLICATE_INVOICE"]],
  ["inv_clean", "invoice", "approval", []],
  ["freight_invoice", "invoice", "review", ["PRICE_MISMATCH"]],
  ["delay_critical", "delay_notice", "review", ["DELIVERY_DELAY"]],
  ["carrier_delay", "delay_notice", "review", ["DELIVERY_DELAY"]],
  ["rfq_deadline", "rfq", "approval", ["DEADLINE_SOON", "UNKNOWN_ARTICLE"]],
  ["ln_clean", "delivery_note", "auto", []],
  ["ln_scan", "delivery_note", "review", ["NO_TEXT_LAYER"]],
  ["newsletter", "other", "ignore", []],
];

describe("demo corpus", () => {
  it.each(expectations)("%s → %s / %s", (key, docType, route, issues) => {
    const r = results[key];
    expect(r.extraction.docType).toBe(docType);
    expect(r.routing.route).toBe(route);
    expect(r.issues.filter((i) => i.code !== "LOW_CONFIDENCE").map((i) => i.code).sort()).toEqual([...issues].sort());
  });

  it("extracts exact values from the price-mismatch order", () => {
    const x = results.po_price_mismatch.extraction;
    expect(x.fields.documentNumber?.value).toBe("NF-2026-1187");
    expect(x.fields.netTotal?.value).toBe("11892.00");
    expect(x.fields.partyNumber?.value).toBe("K-10047");
    expect(x.fields.deliveryDate?.value).toBe("2026-11-16"); // "KW 47/2026"
    expect(x.lineItems).toHaveLength(4);
    expect(x.lineItems[0]).toMatchObject({ articleNo: "AT-4711", quantity: 10, unitPrice: 412, total: 4120 });
    const issue = results.po_price_mismatch.issues.find((i) => i.code === "PRICE_MISMATCH")!;
    expect(issue.params).toMatchObject({ expectedPrice: 438.5, documentPrice: 412, priceSource: "agreed", impact: -265 });
  });

  it("never invents values that are not in the document", () => {
    const x = results.po_freetext.extraction;
    expect(x.fields.deliveryDate?.value).toBeNull();
    expect(x.fields.deliveryAddress?.value).toBeNull();
    expect(x.lineItems.every((li) => li.unitPrice === null)).toBe(true);
    expect(results.ln_scan.extraction.textAvailable).toBe(false);
    expect(Object.values(results.ln_scan.extraction.fields)).toHaveLength(0);
  });

  it("flags the changed bank details with the fraud-relevant facts", () => {
    const issue = results.inv_iban_changed.issues.find((i) => i.code === "IBAN_CHANGED")!;
    expect(issue.severity).toBe("critical");
    expect(issue.amountAtRisk).toBe(8377.6);
    expect(issue.params.phone).toBe("+49 40 66969 330");
  });

  it("links a supplier delay to the customer order at risk", () => {
    const issue = results.delay_critical.issues.find((i) => i.code === "DELIVERY_DELAY")!;
    expect(issue.params).toMatchObject({ days: 14, affectedOrders: "A-2026-5530", affectedCount: 1 });
  });

  it("detects duplicates within the inbox as well", async () => {
    const e = corpus.po_clean;
    const r = await analyzeDocument({
      pdf: await renderPdf(e.attachments[0].spec),
      bodyText: e.body,
      fileName: e.attachments[0].fileName,
      emailSubject: e.subject,
      emailFromName: e.fromName,
      emailReceivedAt: `${today}T07:30:00Z`,
      ownCompanyName: OWN_COMPANY.name,
      master,
      knownDocuments: [{ id: "doc-1", docType: "purchase_order", partyNumber: "K-10023", documentNumber: "BM-PO-88412" }],
      workflows,
      rules: tpl.rules,
      today,
      provider: demoRulesProvider,
    });
    expect(r.issues.map((i) => i.code)).toContain("DUPLICATE_ORDER");
    expect(r.routing.route).toBe("review");
  });
});
