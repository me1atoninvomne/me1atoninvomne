import { requireSession } from "@/server/auth/session";
import { api, readJson, type RouteParams } from "@/server/http";
import { updateDocument, UpdateSchema } from "@/server/services/review";

export const PATCH = api(async (req, ctx: RouteParams<{ id: string }>) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  return updateDocument(s, id, await readJson(req, UpdateSchema));
});
