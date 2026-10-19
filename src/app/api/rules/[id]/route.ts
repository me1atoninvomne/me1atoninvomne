import { requireSession } from "@/server/auth/session";
import { api, readJson, type RouteParams } from "@/server/http";
import { deleteRule, RuleInputSchema, updateRule } from "@/server/services/config";

export const PATCH = api(async (req, ctx: RouteParams<{ id: string }>) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  await updateRule(s, id, await readJson(req, RuleInputSchema.partial()));
  return { ok: true };
});

export const DELETE = api(async (_req, ctx: RouteParams<{ id: string }>) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  await deleteRule(s, id);
  return { ok: true };
});
