import { requireSession } from "@/server/auth/session";
import { api, readJson, type RouteParams } from "@/server/http";
import { updateWorkflow, WorkflowUpdateSchema } from "@/server/services/config";

export const PATCH = api(async (req, ctx: RouteParams<{ id: string }>) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  return updateWorkflow(s, id, await readJson(req, WorkflowUpdateSchema));
});
