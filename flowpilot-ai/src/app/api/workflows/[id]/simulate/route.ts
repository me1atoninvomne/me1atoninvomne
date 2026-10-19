import { z } from "zod";
import { requireSession } from "@/server/auth/session";
import { api, readJson, type RouteParams } from "@/server/http";
import { simulateWorkflow, WorkflowParamsSchema } from "@/server/services/config";

const Input = z.object({ documentId: z.string().max(64), overrides: WorkflowParamsSchema.partial().optional() });

export const POST = api(async (req, ctx: RouteParams<{ id: string }>) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const { documentId, overrides } = await readJson(req, Input);
  return simulateWorkflow(s, id, documentId, overrides);
});
