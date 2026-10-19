import { describe, expect, it } from "vitest";
import { decideRoute } from "@/domain/routing";
import { computeFacts } from "@/domain/rules";
import type { Extraction, Rule, ValidationIssue, WorkflowParams } from "@/domain/types";

const params: WorkflowParams = {
  autoProcess: true,
  minConfidence: 0.9,
  maxAutoAmount: 10000,
  approvalLimit: 20000,
  reviewDepartment: "sales",
  notifyDepartment: null,
  slaHours: 4,
  targetSystem: "demo_erp",
};

const continueRule: Rule = {
  id: "r-continue",
  name: { de: "weiter", en: "continue" },
  enabled: true,
  docTypes: "all",
  conditions: [
    { field: "partyKnown", op: "is_true" },
    { field: "allRequiredFields", op: "is_true" },
    { field: "noOpenIssues", op: "is_true" },
  ],
  action: { type: "continue" },
};

function po(net: number, confidence = 0.97): Extraction {
  const f = (key: string, value: string) => ({ key, value, confidence, status: "extracted" as const });
  return {
    docType: "purchase_order",
    docTypeConfidence: 0.99,
    textAvailable: true,
    provider: "test",
    signals: [],
    lineItems: [],
    fields: {
      documentNumber: f("documentNumber", "PO-1"),
      documentDate: f("documentDate", "2026-10-19"),
      partyName: f("partyName", "Kunde GmbH"),
      deliveryDate: f("deliveryDate", "2026-11-30"),
      deliveryAddress: f("deliveryAddress", "Weg 1, 12345 Stadt"),
      netTotal: f("netTotal", net.toFixed(2)),
    } as Extraction["fields"],
  };
}

const party = { role: "customer" as const, number: "K-1", name: "Kunde GmbH", score: 1 };
const route = (x: Extraction, issues: ValidationIssue[] = [], rules = [continueRule], wf: WorkflowParams | null = params) =>
  decideRoute({ extraction: x, issues, facts: computeFacts(x, issues, party, "2026-10-19"), workflow: wf, rules });

const issue = (severity: ValidationIssue["severity"], blocking = true): ValidationIssue => ({
  id: "i",
  code: severity === "critical" ? "DUPLICATE_ORDER" : "PRICE_MISMATCH",
  severity,
  blocking,
  params: {},
  status: "open",
});

describe("routing guardrails", () => {
  it("auto-processes only when workflow, continue rule and checks all agree", () => {
    expect(route(po(5000)).route).toBe("auto");
  });

  it("never auto-processes with a critical issue, even if a rule says continue", () => {
    const r = route(po(5000), [issue("critical")]);
    expect(r.route).toBe("review");
    expect(r.reasons.map((x) => x.code)).toContain("GUARDRAIL_CRITICAL_ISSUE");
  });

  it("requires a human when confidence is below the threshold", () => {
    expect(route(po(5000, 0.7)).route).toBe("review");
  });

  it("requires approval above the auto limit and a manager above the approval limit", () => {
    expect(route(po(15000)).route).toBe("approval");
    const big = route(po(25000));
    expect(big.route).toBe("approval");
    expect(big.requiredRole).toBe("manager");
  });

  it("does not auto-process when the continue rule is disabled", () => {
    const r = route(po(5000), [], [{ ...continueRule, enabled: false }]);
    expect(r.route).toBe("approval");
    expect(r.reasons.map((x) => x.code)).toContain("NO_CONTINUE_RULE");
  });

  it("never releases invoices automatically", () => {
    const inv = { ...po(500), docType: "invoice" as const };
    const r = route(inv, [], [continueRule], { ...params, autoProcess: true });
    expect(r.route).not.toBe("auto");
  });

  it("reviews documents without an active workflow", () => {
    expect(route(po(5000), [], [continueRule], null).route).toBe("approval");
  });
});
