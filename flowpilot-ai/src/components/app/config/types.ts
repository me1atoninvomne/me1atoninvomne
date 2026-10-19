import type { Rule } from "@/domain/types";
import type { getWorkflowsPage } from "@/server/services/queries";

export type WorkflowsPageData = Awaited<ReturnType<typeof getWorkflowsPage>>;
export type WorkflowItem = WorkflowsPageData["workflows"][number];
export type RuleRow = WorkflowsPageData["rules"][number];
export type SampleDoc = WorkflowsPageData["sampleDocs"][number];

export function toRule(r: RuleRow): Rule {
  return { id: r.id, name: r.name, enabled: r.enabled, docTypes: r.docTypes, conditions: r.conditions, action: r.action };
}

export interface SimulationResult {
  route: "auto" | "review" | "approval" | "ignore";
  reasons: { code: string; params?: Record<string, string | number | null> }[];
  requiredRole: string | null;
  path: string[];
  ruleEvaluations: { id: string; matched: boolean; conditions: { condition: Rule["conditions"][number]; result: boolean }[] }[];
}
