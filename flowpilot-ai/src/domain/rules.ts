import { DOC_TYPE_META, documentNetAmount } from "./documents";
import { daysBetween } from "./parse";
import { maxPriceDeviationPct } from "./validation";
import type {
  ConditionField,
  DocType,
  Extraction,
  PartyMatch,
  Rule,
  RuleCondition,
  ValidationIssue,
} from "./types";

/** Facts about a processed document that no-code rules can refer to. */
export interface RuleFacts {
  docType: DocType;
  partyKnown: boolean;
  allRequiredFields: boolean;
  noOpenIssues: boolean;
  hasCriticalIssue: boolean;
  netAmount: number | null;
  minConfidence: number;
  delayDays: number | null;
  deliveryLeadDays: number | null;
  priceDeviationPct: number;
}

export const BOOLEAN_FIELDS: ConditionField[] = ["partyKnown", "allRequiredFields", "noOpenIssues", "hasCriticalIssue"];

/**
 * Overall extraction confidence = the weakest link among the document type, the extracted
 * required fields and the line items. Missing required fields are handled separately by the
 * "missing fields" guardrail, so they do not distort the confidence value.
 */
export function overallConfidence(extraction: Extraction): number {
  if (!extraction.textAvailable) return 0;
  const meta = DOC_TYPE_META[extraction.docType];
  const values = [extraction.docTypeConfidence];
  for (const key of meta.requiredFields) {
    const f = extraction.fields[key];
    if (f && f.value != null) values.push(f.status === "corrected" || f.status === "confirmed" ? 1 : f.confidence);
  }
  for (const li of extraction.lineItems) values.push(li.corrected ? 1 : li.confidence);
  return Math.max(0, Math.min(...values));
}

export function computeFacts(
  extraction: Extraction,
  issues: ValidationIssue[],
  party: PartyMatch | null,
  today: string,
): RuleFacts {
  const meta = DOC_TYPE_META[extraction.docType];
  const open = issues.filter((i) => i.status === "open");
  const delay = open.find((i) => i.code === "DELIVERY_DELAY");
  const delivery = extraction.fields.deliveryDate?.value ?? null;
  return {
    docType: extraction.docType,
    partyKnown: party != null,
    allRequiredFields: meta.requiredFields.every((k) => extraction.fields[k]?.value != null && extraction.fields[k]?.value !== ""),
    noOpenIssues: open.filter((i) => i.severity !== "info").length === 0,
    hasCriticalIssue: open.some((i) => i.severity === "critical"),
    netAmount: documentNetAmount(extraction.fields, extraction.lineItems),
    minConfidence: Math.round(overallConfidence(extraction) * 100),
    delayDays: delay ? Number(delay.params.days) : null,
    deliveryLeadDays: delivery && extraction.docType === "purchase_order" ? daysBetween(today, delivery) : null,
    priceDeviationPct: maxPriceDeviationPct(issues),
  };
}

export function ruleAppliesTo(rule: Rule, docType: DocType): boolean {
  return rule.docTypes === "all" || rule.docTypes.includes(docType);
}

export function evaluateCondition(c: RuleCondition, facts: RuleFacts): boolean {
  const raw = facts[c.field];
  if (c.op === "is_true") return raw === true;
  if (c.op === "is_false") return raw === false;
  if (typeof raw !== "number" || c.value == null) return false;
  switch (c.op) {
    case "gt":
      return raw > c.value;
    case "gte":
      return raw >= c.value;
    case "lt":
      return raw < c.value;
    case "lte":
      return raw <= c.value;
  }
  return false;
}

export interface RuleEvaluation {
  rule: Rule;
  matched: boolean;
  conditions: { condition: RuleCondition; result: boolean }[];
}

/** Evaluates all applicable rules; every condition of a rule must hold (AND). */
export function evaluateRules(rules: Rule[], facts: RuleFacts): RuleEvaluation[] {
  return rules
    .filter((r) => r.enabled && ruleAppliesTo(r, facts.docType))
    .map((rule) => {
      const conditions = rule.conditions.map((condition) => ({ condition, result: evaluateCondition(condition, facts) }));
      return { rule, matched: conditions.every((c) => c.result), conditions };
    });
}
