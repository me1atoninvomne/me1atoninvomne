import type { ConditionField, DocType, Rule, RuleCondition } from "@/domain/types";
import { fmt, type Formatters } from "@/i18n/core";
import type { DomainDict } from "@/i18n/domain";
import type { workflowsDict } from "@/i18n/ui/config";

type W = (typeof workflowsDict)["de"];

export const BOOLEAN_CONDITION_FIELDS: ConditionField[] = ["partyKnown", "allRequiredFields", "noOpenIssues", "hasCriticalIssue"];

export function isBooleanField(field: ConditionField) {
  return BOOLEAN_CONDITION_FIELDS.includes(field);
}

export function conditionValue(field: ConditionField, value: number | null | undefined, w: W, f: Formatters): string {
  if (value == null) return "—";
  switch (field) {
    case "netAmount":
      return f.money(value, { decimals: 0 });
    case "minConfidence":
    case "priceDeviationPct":
      return `${f.number(value, value % 1 ? 1 : 0)} %`;
    case "delayDays":
    case "deliveryLeadDays":
      return `${f.number(value)} ${w.sentence.days}`;
    default:
      return f.number(value);
  }
}

export function conditionPhrase(c: RuleCondition, w: W, f: Formatters): string {
  if (isBooleanField(c.field)) {
    const p = w.sentence.bool[c.field];
    return p ? (c.op === "is_false" ? p.false : p.true) : c.field;
  }
  const subject = w.sentence.subject[c.field] ?? c.field;
  return `${subject} ${fmt(w.sentence.op[c.op] ?? c.op, { v: conditionValue(c.field, c.value, w, f) })}`;
}

export function actionPhrase(a: Rule["action"], w: W, d: DomainDict): string {
  // English uses lower case for role/department names inside a sentence; German keeps nouns capitalised.
  const inline = (label: string) => (w.sentence.lowercaseLabels ? label.charAt(0).toLowerCase() + label.slice(1) : label);
  switch (a.type) {
    case "continue":
      return w.sentence.continue;
    case "require_approval":
      return fmt(w.sentence.require_approval, { role: a.role ? inline(d.role[a.role]) : "—" });
    case "route_review":
      return fmt(w.sentence.route_review, { department: a.department ? inline(d.department[a.department]) : "—" });
    case "notify":
      return fmt(w.sentence.notify, { department: a.department ? inline(d.department[a.department]) : "—" });
    case "set_priority":
      return fmt(w.sentence.set_priority, { priority: a.priority ? d.priority[a.priority] : "—" });
  }
}

/** "Wenn A, B und C, dann X." */
export function ruleSentence(rule: Pick<Rule, "conditions" | "action">, w: W, d: DomainDict, f: Formatters): string {
  const action = actionPhrase(rule.action, w, d);
  if (rule.conditions.length === 0) return `${w.sentence.always} ${action}.`;
  const parts = rule.conditions.map((c) => conditionPhrase(c, w, f));
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} ${w.sentence.and} ${parts[parts.length - 1]}`;
  return `${w.sentence.if} ${joined}, ${w.sentence.then} ${action}.`;
}

export function docTypesLabel(docTypes: Rule["docTypes"], w: W, d: DomainDict): string {
  if (docTypes === "all") return w.rules.appliesAll;
  return fmt(w.rules.appliesTo, { types: (docTypes as DocType[]).map((t) => d.docTypePlural[t]).join(", ") });
}
