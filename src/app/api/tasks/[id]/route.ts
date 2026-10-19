import { z } from "zod";
import { requireSession } from "@/server/auth/session";
import { api, readJson, type RouteParams } from "@/server/http";
import { completeTask } from "@/server/services/config";

const Input = z.object({ status: z.enum(["done", "open"]) });

export const PATCH = api(async (req, ctx: RouteParams<{ id: string }>) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const { status } = await readJson(req, Input);
  await completeTask(s, id, status);
  return { ok: true };
});
