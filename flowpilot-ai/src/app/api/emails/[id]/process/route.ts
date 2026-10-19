import { requireSession } from "@/server/auth/session";
import { api, type RouteParams } from "@/server/http";
import { processEmail } from "@/server/services/processing";

export const POST = api(async (_req, ctx: RouteParams<{ id: string }>) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  return processEmail(s, id);
});
