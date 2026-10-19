import { describe, expect, it } from "vitest";
import { evaluateRules } from "@/domain/rules";
import type { Extraction, Rule, ValidationIssue } from "@/domain/types";
import { buildSummary } from "@/server/pipeline/summary";
import { buildQueryDraft } from "@/server/services/review";

const extraction: Extraction = {
  docType: "purchase_order",
  docTypeConfidence: 0.97,
  textAvailable: true,
  provider: "test",
  signals: [],
  lineItems: [{ pos: "1", articleNo: "AT-7302", description: "Flanschlager", quantity: 40, unit: "Stk", unitPrice: null, total: null, confidence: 0.78 }],
  fields: {
    documentNumber: { key: "documentNumber", value: "AV-55871", confidence: 0.97, status: "extracted" },
    partyName: { key: "partyName", value: "Alpenblick Verpackungssysteme AG", confidence: 0.85, status: "extracted" },
    deliveryDate: { key: "deliveryDate", value: null, confidence: 0, status: "missing" },
  },
};

const issue = (code: ValidationIssue["code"], params: ValidationIssue["params"] = {}, severity: ValidationIssue["severity"] = "warning"): ValidationIssue => ({
  id: code,
  code,
  severity,
  blocking: true,
  params,
  status: "open",
});

describe("query draft", () => {
  it("asks for the missing delivery date in German business style", () => {
    const d = buildQueryDraft([issue("MISSING_DELIVERY_DATE")], extraction, "Julia Becker", "Muster Antriebstechnik GmbH", null);
    expect(d.subject).toBe("Rückfrage zu Ihrer Bestellung AV-55871");
    expect(d.body).toContain("den gewünschten Liefertermin");
    expect(d.body).toContain("Julia Becker");
  });

  it("never clarifies changed bank details by replying to the same e-mail", () => {
    const d = buildQueryDraft([issue("IBAN_CHANGED", { documentIban: "DE00", masterIban: "DE11", phone: "+49" }, "critical")], extraction, "A", "B", null);
    expect(d.body).not.toMatch(/IBAN|Bank/);
    expect(d.excludedBankFinding).toBe(true);
  });
});

describe("summary", () => {
  it("states unknown values instead of inventing them", () => {
    const s = buildSummary({ extraction, issues: [issue("MISSING_DELIVERY_DATE")], routing: { route: "review", requiredRole: "clerk", department: "sales" }, partyName: null, autoTransferred: false });
    expect(s.summary.de).toContain("Liefertermin nicht erkannt");
    expect(s.summary.en).toContain("delivery date not recognised");
    expect(s.nextAction.de).toBe("Liefertermin erfragen");
  });
});

describe("rules engine", () => {
  const rule = (over: Partial<Rule>): Rule => ({
    id: "r",
    name: { de: "r", en: "r" },
    enabled: true,
    docTypes: ["purchase_order"],
    conditions: [{ field: "netAmount", op: "gt", value: 10000 }],
    action: { type: "require_approval", role: "manager" },
    ...over,
  });
  const facts = {
    docType: "purchase_order" as const,
    partyKnown: true,
    allRequiredFields: true,
    noOpenIssues: true,
    hasCriticalIssue: false,
    netAmount: 12000,
    minConfidence: 95,
    delayDays: null,
    deliveryLeadDays: 20,
    priceDeviationPct: 0,
  };
  it("matches only enabled rules for the document type, all conditions AND-ed", () => {
    expect(evaluateRules([rule({})], facts)[0].matched).toBe(true);
    expect(evaluateRules([rule({ enabled: false })], facts)).toHaveLength(0);
    expect(evaluateRules([rule({ docTypes: ["invoice"] })], facts)).toHaveLength(0);
    expect(evaluateRules([rule({ conditions: [{ field: "netAmount", op: "gt", value: 10000 }, { field: "partyKnown", op: "is_false" }] })], facts)[0].matched).toBe(false);
  });
  it("treats unknown numeric facts as not matching", () => {
    expect(evaluateRules([rule({ conditions: [{ field: "delayDays", op: "gt", value: 0 }] })], facts)[0].matched).toBe(false);
  });
});
