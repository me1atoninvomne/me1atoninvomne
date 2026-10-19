import { requireSession } from "@/server/auth/session";
import { api, readJson, type RouteParams } from "@/server/http";
import { decideIssue, IssueDecisionSchema } from "@/server/services/review";

export const POST = api(async (req, ctx: RouteParams<{ id: string; issueId: string }>) => {
  const s = await requireSession();
  const { id, issueId } = await ctx.params;
  await decideIssue(s, id, issueId, await readJson(req, IssueDecisionSchema));
  return { ok: true };
});
