import type { DocType, Route, WorkflowDefinition, WorkflowParams, WorkflowStep } from "./types";

/** Standard pipeline: every workflow uses the same building blocks, parameters differ. */
export function buildSteps(params: Pick<WorkflowParams, "targetSystem" | "notifyDepartment">): WorkflowStep[] {
  const steps: WorkflowStep[] = [
    { id: "trigger", type: "trigger" },
    { id: "classify", type: "classify" },
    { id: "extract", type: "extract" },
    { id: "match", type: "match" },
    { id: "validate", type: "validate" },
    { id: "rules", type: "rules" },
    { id: "gate", type: "gate" },
    { id: "auto", type: "auto", branch: "auto" },
    { id: "review", type: "review", branch: "review" },
  ];
  if (params.targetSystem !== "none") steps.push({ id: "transfer", type: "transfer" });
  steps.push({ id: "notify", type: "notify" });
  return steps;
}

/** Which steps a document passes for a given routing result (used for highlighting in the builder). */
export function simulatePath(def: WorkflowDefinition, route: Route): string[] {
  const ids = def.steps.map((s) => s.id);
  if (route === "ignore") return ["trigger", "classify"];
  const common = ["trigger", "classify", "extract", "match", "validate", "rules", "gate"];
  const branch = route === "auto" ? "auto" : "review";
  const tail = [branch, ...(ids.includes("transfer") ? ["transfer"] : []), "notify"];
  return [...common, ...tail].filter((id) => ids.includes(id));
}

export function workflowForDocType<T extends { docTypes: DocType[]; active: boolean }>(workflows: T[], docType: DocType): T | null {
  return workflows.find((w) => w.active && w.docTypes.includes(docType)) ?? null;
}
