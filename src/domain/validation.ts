import { DOC_TYPE_META, documentNetAmount, round2 } from "./documents";
import { findAgreedPrice, findArticle, findPurchaseOrder } from "./matching";
import { daysBetween, isValidIban, normalizeIban } from "./parse";
import type {
  DocType,
  Extraction,
  FieldKey,
  IssueCode,
  MasterData,
  PartyMatch,
  PurchaseOrder,
  Severity,
  ValidationIssue,
} from "./types";

/** A document already known to the workspace (used for duplicate detection inside the inbox). */
export interface KnownDocument {
  id: string;
  docType: DocType;
  partyNumber: string | null;
  documentNumber: string | null;
}

export interface ValidationContext {
  master: MasterData;
  party: PartyMatch | null;
  today: string; // ISO date
  knownDocuments: KnownDocument[];
  options?: Partial<ValidationOptions>;
}

export interface ValidationOptions {
  /** Price deviation tolerated without an issue, in percent. */
  priceTolerancePct: number;
  /** Tolerated rounding difference between sums, in EUR. */
  sumTolerance: number;
  /** Fields below this confidence get an informational hint for the reviewer. */
  lowConfidence: number;
  /** RFQ deadlines within this many days are flagged. */
  deadlineSoonDays: number;
}

export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  priceTolerancePct: 0.5,
  sumTolerance: 0.05,
  lowConfidence: 0.8,
  deadlineSoonDays: 3,
};

export function validateDocument(extraction: Extraction, ctx: ValidationContext): ValidationIssue[] {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...ctx.options };
  const issues: ValidationIssue[] = [];
  let seq = 0;
  const add = (
    code: IssueCode,
    severity: Severity,
    blocking: boolean,
    params: ValidationIssue["params"],
    extra: Partial<Pick<ValidationIssue, "field" | "lineIndex" | "amountAtRisk">> = {},
  ) => {
    issues.push({ id: `${code.toLowerCase()}-${++seq}`, code, severity, blocking, params, status: "open", ...extra });
  };

  const { docType, fields, lineItems } = extraction;
  if (docType === "other") return issues;

  if (!extraction.textAvailable) {
    add("NO_TEXT_LAYER", "critical", true, {});
    return issues;
  }

  const meta = DOC_TYPE_META[docType];
  const v = (k: FieldKey) => fields[k]?.value ?? null;

  // 1. Required fields
  for (const key of meta.requiredFields) {
    if (v(key) == null || v(key) === "") {
      if (key === "deliveryDate" && (docType === "purchase_order" || docType === "order_confirmation")) {
        add("MISSING_DELIVERY_DATE", "warning", true, {}, { field: key });
      } else {
        add("MISSING_REQUIRED_FIELD", "warning", true, { field: key }, { field: key });
      }
    }
  }

  // 2. Low confidence hints (non-blocking; the confidence gate decides routing)
  for (const f of Object.values(fields)) {
    if (f && f.value != null && f.status === "extracted" && f.confidence < opts.lowConfidence) {
      add("LOW_CONFIDENCE", "info", false, { field: f.key, confidence: Math.round(f.confidence * 100) }, { field: f.key });
    }
  }

  // 3. Business partner
  const partyName = v("partyName");
  if (partyName && !ctx.party) {
    const critical = docType === "invoice";
    add("UNKNOWN_PARTY", critical ? "critical" : "warning", true, { name: partyName, role: meta.partyRole }, { field: "partyName" });
  }

  const net = documentNetAmount(fields, lineItems);
  const gross = v("grossTotal") != null ? Number(v("grossTotal")) : null;
  const docNumber = v("documentNumber");
  const reference = v("referenceNumber");
  const docDate = v("documentDate") ?? ctx.today;

  // 4. Duplicates inside the workspace inbox
  if (docNumber) {
    const dup = ctx.knownDocuments.find(
      (d) =>
        d.docType === docType &&
        d.documentNumber?.toUpperCase() === docNumber.toUpperCase() &&
        (ctx.party ? d.partyNumber === ctx.party.number : true),
    );
    if (dup && (docType === "purchase_order" || docType === "invoice")) {
      const code = docType === "invoice" ? "DUPLICATE_INVOICE" : "DUPLICATE_ORDER";
      add(code, "critical", true, { documentNumber: docNumber, existing: dup.id, source: "inbox" }, {
        field: "documentNumber",
        amountAtRisk: docType === "invoice" ? gross : net,
      });
    }
  }

  // 5. Sum checks
  if (meta.hasLineItems && lineItems.length > 0 && v("netTotal") != null) {
    const allTotals = lineItems.every((li) => li.total != null);
    if (allTotals) {
      const lineSum = round2(lineItems.reduce((s, li) => s + (li.total ?? 0), 0));
      const stated = Number(v("netTotal"));
      if (Math.abs(lineSum - stated) > opts.sumTolerance) {
        add("SUM_MISMATCH", "warning", true, { kind: "lines_vs_net", computed: lineSum, stated, diff: round2(stated - lineSum) }, {
          field: "netTotal",
          amountAtRisk: Math.abs(round2(stated - lineSum)),
        });
      }
    }
  }
  for (const [i, li] of lineItems.entries()) {
    if (li.quantity != null && li.unitPrice != null && li.total != null) {
      const expected = round2(li.quantity * li.unitPrice);
      if (Math.abs(expected - li.total) > opts.sumTolerance) {
        add("SUM_MISMATCH", "warning", true, { kind: "line", pos: li.pos, computed: expected, stated: li.total, diff: round2(li.total - expected) }, {
          lineIndex: i,
          amountAtRisk: Math.abs(round2(li.total - expected)),
        });
      }
    }
  }

  // 6. Type specific checks
  switch (docType) {
    case "purchase_order":
      validatePurchaseOrder();
      break;
    case "invoice":
      validateInvoice();
      break;
    case "order_confirmation":
    case "delivery_note":
      validateAgainstPurchaseOrder();
      break;
    case "rfq":
      validateRfq();
      break;
    case "delay_notice":
      validateDelay();
      break;
  }

  return issues;

  /* ---------- per type ---------- */

  function validatePurchaseOrder() {
    if (docNumber) {
      const existing = ctx.master.salesOrders.find(
        (o) =>
          o.customerPoNumber.toUpperCase() === docNumber.toUpperCase() &&
          (ctx.party ? o.customerNumber === ctx.party.number : true),
      );
      if (existing) {
        add("DUPLICATE_ORDER", "critical", true, { documentNumber: docNumber, existing: existing.number, existingDate: existing.date, source: "erp" }, {
          field: "documentNumber",
          amountAtRisk: net,
        });
      }
    }
    const delivery = v("deliveryDate");
    if (delivery && delivery < ctx.today) {
      add("DATE_IN_PAST", "warning", true, { field: "deliveryDate", date: delivery }, { field: "deliveryDate" });
    }
    for (const [i, li] of lineItems.entries()) {
      const article = findArticle(ctx.master, li.articleNo);
      if (!article) {
        add("UNKNOWN_ARTICLE", "warning", true, { pos: li.pos, articleNo: li.articleNo ?? "—", description: li.description ?? "" }, { lineIndex: i });
        continue;
      }
      if (li.unitPrice == null) continue;
      const agreed = ctx.party ? findAgreedPrice(ctx.master, ctx.party.number, article.number, docDate) : null;
      const expected = agreed?.price ?? article.listPrice;
      checkPrice(i, li.pos, article.number, li.unitPrice, expected, agreed ? "agreed" : "list", li.quantity ?? 0);
    }
  }

  function validateInvoice() {
    if (docNumber && ctx.party) {
      const booked = ctx.master.receivedInvoices.find(
        (inv) => inv.supplierNumber === ctx.party!.number && inv.invoiceNumber.toUpperCase() === docNumber.toUpperCase(),
      );
      if (booked) {
        add("DUPLICATE_INVOICE", "critical", true, { documentNumber: docNumber, existingDate: booked.date, source: "erp", amount: booked.grossTotal }, {
          field: "documentNumber",
          amountAtRisk: gross ?? booked.grossTotal,
        });
      }
    }
    const iban = v("iban");
    if (iban) {
      if (!isValidIban(iban)) {
        add("IBAN_INVALID", "critical", true, { iban }, { field: "iban", amountAtRisk: gross });
      } else if (ctx.party) {
        const supplier = ctx.master.suppliers.find((s) => s.number === ctx.party!.number);
        if (supplier && normalizeIban(supplier.iban) !== normalizeIban(iban)) {
          add("IBAN_CHANGED", "critical", true, { documentIban: normalizeIban(iban), masterIban: normalizeIban(supplier.iban), phone: supplier.phone }, {
            field: "iban",
            amountAtRisk: gross,
          });
        }
      }
    }
    const rate = v("vatRate") != null ? Number(v("vatRate")) : null;
    const vat = v("vatAmount") != null ? Number(v("vatAmount")) : null;
    const statedNet = v("netTotal") != null ? Number(v("netTotal")) : null;
    if (statedNet != null && rate != null && vat != null) {
      const expectedVat = round2((statedNet * rate) / 100);
      if (Math.abs(expectedVat - vat) > opts.sumTolerance) {
        add("VAT_MISMATCH", "warning", true, { kind: "vat", net: statedNet, rate, stated: vat, expected: expectedVat }, { field: "vatAmount" });
      }
    }
    if (statedNet != null && vat != null && gross != null && Math.abs(round2(statedNet + vat) - gross) > opts.sumTolerance) {
      add("VAT_MISMATCH", "warning", true, { kind: "gross", net: statedNet, stated: gross, expected: round2(statedNet + vat) }, {
        field: "grossTotal",
        amountAtRisk: Math.abs(round2(gross - statedNet - vat)),
      });
    }
    if (reference) {
      const po = findPurchaseOrder(ctx.master, reference);
      if (!po) {
        add("REFERENCE_NOT_FOUND", "warning", true, { reference }, { field: "referenceNumber" });
      } else {
        compareLinesWithPo(po, false);
      }
    }
  }

  function validateAgainstPurchaseOrder() {
    if (!reference) return;
    const po = findPurchaseOrder(ctx.master, reference);
    if (!po) {
      add("REFERENCE_NOT_FOUND", "warning", true, { reference }, { field: "referenceNumber" });
      return;
    }
    compareLinesWithPo(po, true);
    const confirmed = v("deliveryDate");
    if (docType === "order_confirmation" && confirmed && confirmed > po.requestedDate) {
      add("DATE_SHIFT", "warning", true, { requested: po.requestedDate, confirmed, days: daysBetween(po.requestedDate, confirmed), reference: po.number }, {
        field: "deliveryDate",
      });
    }
  }

  function compareLinesWithPo(po: PurchaseOrder, compareQty: boolean) {
    for (const [i, li] of lineItems.entries()) {
      const article = findArticle(ctx.master, li.articleNo, po.supplierNumber);
      const poLine = article ? po.lines.find((l) => l.articleNo === article.number) : undefined;
      if (!article || !poLine) {
        add("UNKNOWN_ARTICLE", "warning", true, { pos: li.pos, articleNo: li.articleNo ?? "—", description: li.description ?? "", reference: po.number }, { lineIndex: i });
        continue;
      }
      if (li.quantity != null && li.quantity !== poLine.quantity && (compareQty || li.quantity > poLine.quantity)) {
        add("QTY_MISMATCH", "warning", true, { pos: li.pos, articleNo: article.number, ordered: poLine.quantity, document: li.quantity, reference: po.number }, {
          lineIndex: i,
          amountAtRisk: Math.abs(round2((li.quantity - poLine.quantity) * poLine.unitPrice)),
        });
      }
      if (li.unitPrice != null && docType !== "delivery_note") {
        checkPrice(i, li.pos, article.number, li.unitPrice, poLine.unitPrice, "order", li.quantity ?? poLine.quantity);
      }
    }
  }

  function validateRfq() {
    const due = v("dueDate");
    if (due) {
      const days = daysBetween(ctx.today, due);
      if (days <= opts.deadlineSoonDays) add("DEADLINE_SOON", "info", false, { date: due, days }, { field: "dueDate" });
    }
    for (const [i, li] of lineItems.entries()) {
      if (!findArticle(ctx.master, li.articleNo)) {
        add("UNKNOWN_ARTICLE", "info", false, { pos: li.pos, articleNo: li.articleNo ?? "—", description: li.description ?? "" }, { lineIndex: i });
      }
    }
  }

  function validateDelay() {
    if (!reference) return;
    const po = findPurchaseOrder(ctx.master, reference);
    if (!po) {
      add("REFERENCE_NOT_FOUND", "warning", true, { reference }, { field: "referenceNumber" });
      return;
    }
    const original = v("originalDeliveryDate") ?? po.confirmedDate ?? po.requestedDate;
    const newDate = v("deliveryDate");
    if (!newDate) return;
    const days = daysBetween(original, newDate);
    if (days <= 0) return;
    const affected = ctx.master.salesOrders.filter((o) => o.dependsOnPurchaseOrders?.includes(po.number) && o.status !== "shipped");
    const atRisk = affected.filter((o) => o.requestedDate < newDate);
    const value = round2(atRisk.reduce((s, o) => s + o.lines.reduce((x, l) => x + l.quantity * l.unitPrice, 0), 0));
    const customers = atRisk
      .map((o) => ctx.master.customers.find((c) => c.number === o.customerNumber)?.name ?? o.customerNumber)
      .join(", ");
    add(
      "DELIVERY_DELAY",
      atRisk.length > 0 ? "critical" : "warning",
      true,
      {
        reference: po.number,
        original,
        newDate,
        days,
        affectedOrders: atRisk.map((o) => o.number).join(", ") || null,
        affectedCount: atRisk.length,
        customers: customers || null,
      },
      { field: "deliveryDate", amountAtRisk: value || null },
    );
  }

  function checkPrice(
    lineIndex: number,
    pos: string,
    articleNumber: string,
    documentPrice: number,
    expectedPrice: number,
    priceSource: "agreed" | "list" | "order",
    quantity: number,
  ) {
    if (expectedPrice <= 0) return;
    const diffPct = ((documentPrice - expectedPrice) / expectedPrice) * 100;
    if (Math.abs(diffPct) <= opts.priceTolerancePct) return;
    const impact = round2((documentPrice - expectedPrice) * quantity);
    add(
      "PRICE_MISMATCH",
      "warning",
      true,
      { pos, articleNo: articleNumber, documentPrice, expectedPrice, priceSource, diffPct: Math.round(diffPct * 10) / 10, impact },
      { lineIndex, amountAtRisk: Math.abs(impact) },
    );
  }
}

/** Largest absolute price deviation in percent among the issues (used by rules). */
export function maxPriceDeviationPct(issues: ValidationIssue[]): number {
  return issues
    .filter((i) => i.code === "PRICE_MISMATCH" && i.status === "open")
    .reduce((m, i) => Math.max(m, Math.abs(Number(i.params.diffPct ?? 0))), 0);
}
