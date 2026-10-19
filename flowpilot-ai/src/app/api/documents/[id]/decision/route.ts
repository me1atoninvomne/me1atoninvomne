import { requireSession } from "@/server/auth/session";
import { api, readJson, type RouteParams } from "@/server/http";
import { decide, DecisionSchema } from "@/server/services/review";

export const POST = api(async (req, ctx: RouteParams<{ id: string }>) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  return decide(s, id, await readJson(req, DecisionSchema));
});
