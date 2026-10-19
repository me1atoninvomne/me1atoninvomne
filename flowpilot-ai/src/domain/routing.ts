import { DOC_TYPE_META } from "./documents";
import { evaluateRules, overallConfidence, type RuleEvaluation, type RuleFacts } from "./rules";
import {
  FINANCIAL_DOC_TYPES,
  type Department,
  type Extraction,
  type Role,
  type RouteReason,
  type RoutingDecision,
  type Rule,
  type ValidationIssue,
  type WorkflowParams,
} from "./types";

const ROLE_RANK: Record<Role, number> = { viewer: 0, clerk: 1, manager: 2, admin: 3 };

export function maxRole(a: Role | null, b: Role): Role {
  if (!a) return b;
  return ROLE_RANK[b] > ROLE_RANK[a] ? b : a;
}

export function roleAtLeast(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export interface RoutingInput {
  extraction: Extraction;
  issues: ValidationIssue[];
  facts: RuleFacts;
  /** Active workflow parameters for this document type; null when no workflow covers it. */
  workflow: WorkflowParams | null;
  rules: Rule[];
}

export interface RoutingResult extends RoutingDecision {
  ruleEvaluations: RuleEvaluation[];
}

/**
 * Decides what happens with a document.
 *
 * Order of precedence (top wins):
 *  1. System guardrails – not configurable: critical issues, missing required fields, unknown
 *     partners, missing text layer and low confidence always lead to human review.
 *  2. Rules that force a review.
 *  3. Approval requirements – financial documents, approval limits, rules requiring approval,
 *     or automation not permitted by the manager → a human confirms with one click.
 *  4. Automatic processing – only if the workflow allows it, the amount is within the auto limit
 *     and an enabled "continue" rule explicitly matched.
 */
export function decideRoute(input: RoutingInput): RoutingResult {
  const { extraction, issues, facts, workflow, rules } = input;
  const meta = DOC_TYPE_META[extraction.docType];
  const confidence = overallConfidence(extraction);
  const reasons: RouteReason[] = [];
  const notify = new Set<Department>();
  let department: Department = workflow?.reviewDepartment ?? meta.defaultDepartment;
  let priority: RoutingDecision["priority"] = "normal";

  if (extraction.docType === "other") {
    return {
      route: "ignore",
      reasons: [{ code: "NOT_BUSINESS_DOCUMENT" }],
      requiredRole: null,
      department,
      priority: "low",
      notify: [],
      matchedRules: [],
      confidence,
      ruleEvaluations: [],
    };
  }

  const open = issues.filter((i) => i.status === "open");
  let blocked = false;

  // 1. Guardrails
  if (!extraction.textAvailable) {
    reasons.push({ code: "GUARDRAIL_NO_TEXT" });
    blocked = true;
  }
  const critical = open.filter((i) => i.severity === "critical");
  if (critical.length > 0) {
    reasons.push({ code: "GUARDRAIL_CRITICAL_ISSUE", params: { count: critical.length } });
    blocked = true;
    priority = "high";
  }
  const missing = open.filter((i) => i.code === "MISSING_REQUIRED_FIELD" || i.code === "MISSING_DELIVERY_DATE");
  if (missing.length > 0) {
    reasons.push({ code: "GUARDRAIL_MISSING_FIELDS", params: { count: missing.length } });
    blocked = true;
  }
  if (open.some((i) => i.code === "UNKNOWN_PARTY") && !critical.some((i) => i.code === "UNKNOWN_PARTY")) {
    reasons.push({ code: "GUARDRAIL_UNKNOWN_PARTY" });
    blocked = true;
  }
  const otherBlocking = open.filter(
    (i) => i.blocking && i.severity === "warning" && !["MISSING_REQUIRED_FIELD", "MISSING_DELIVERY_DATE", "UNKNOWN_PARTY"].includes(i.code),
  );
  if (otherBlocking.length > 0) {
    reasons.push({ code: "GUARDRAIL_OPEN_WARNINGS", params: { count: otherBlocking.length } });
    blocked = true;
  }
  const threshold = workflow?.minConfidence ?? 0.9;
  if (extraction.textAvailable && confidence < threshold) {
    reasons.push({ code: "GUARDRAIL_LOW_CONFIDENCE", params: { confidence: Math.round(confidence * 100), threshold: Math.round(threshold * 100) } });
    blocked = true;
  }

  // 2./3. Rules
  const ruleEvaluations = evaluateRules(rules, facts);
  let continueMatched = false;
  let forceReview = false;
  let requiredRole: Role | null = null;
  for (const ev of ruleEvaluations) {
    if (!ev.matched) continue;
    const a = ev.rule.action;
    switch (a.type) {
      case "continue":
        continueMatched = true;
        reasons.push({ code: "RULE_CONTINUE", params: { rule: ev.rule.id } });
        break;
      case "route_review":
        forceReview = true;
        if (a.department) department = a.department;
        reasons.push({ code: "RULE_REVIEW", params: { rule: ev.rule.id } });
        break;
      case "require_approval":
        requiredRole = maxRole(requiredRole, a.role ?? "manager");
        reasons.push({ code: "RULE_REQUIRE_APPROVAL", params: { rule: ev.rule.id, role: a.role ?? "manager" } });
        break;
      case "notify":
        if (a.department) notify.add(a.department);
        break;
      case "set_priority":
        if (a.priority) priority = a.priority;
        break;
    }
  }

  if (workflow?.notifyDepartment) notify.add(workflow.notifyDepartment);
  if (open.some((i) => i.code === "DEADLINE_SOON" || (i.code === "DELIVERY_DELAY" && i.severity === "critical"))) priority = "high";

  const isFinancial = FINANCIAL_DOC_TYPES.includes(extraction.docType);
  if (isFinancial) {
    reasons.push({ code: "GUARDRAIL_FINANCIAL" });
    requiredRole = maxRole(requiredRole, "clerk");
  }
  if (workflow?.approvalLimit != null && facts.netAmount != null && facts.netAmount > workflow.approvalLimit) {
    reasons.push({ code: "POLICY_APPROVAL_LIMIT", params: { amount: facts.netAmount, limit: workflow.approvalLimit } });
    requiredRole = maxRole(requiredRole, "manager");
  }

  // 4. Automation permission
  let autoAllowed = true;
  if (!workflow || !workflow.autoProcess || isFinancial) {
    if (!isFinancial) reasons.push({ code: "POLICY_AUTO_DISABLED" });
    autoAllowed = false;
  }
  if (workflow?.maxAutoAmount != null && facts.netAmount != null && facts.netAmount > workflow.maxAutoAmount) {
    reasons.push({ code: "POLICY_AMOUNT_ABOVE_AUTO_LIMIT", params: { amount: facts.netAmount, limit: workflow.maxAutoAmount } });
    autoAllowed = false;
  }
  if (!continueMatched && autoAllowed && !blocked && !forceReview) {
    reasons.push({ code: "NO_CONTINUE_RULE" });
    autoAllowed = false;
  }

  let route: RoutingDecision["route"];
  if (blocked || forceReview) {
    route = "review";
    requiredRole = maxRole(requiredRole, "clerk");
  } else if (!autoAllowed || requiredRole) {
    route = "approval";
    requiredRole = maxRole(requiredRole, "clerk");
  } else {
    route = "auto";
    reasons.push({ code: "ALL_CHECKS_PASSED" });
  }

  return {
    route,
    reasons,
    requiredRole: route === "auto" ? null : requiredRole,
    department,
    priority,
    notify: [...notify],
    matchedRules: ruleEvaluations.filter((e) => e.matched).map((e) => e.rule.id),
    confidence,
    ruleEvaluations,
  };
}
