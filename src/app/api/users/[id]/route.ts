import { z } from "zod";
import { ROLES } from "@/domain/types";
import { requireSession } from "@/server/auth/session";
import { api, readJson, type RouteParams } from "@/server/http";
import { changeUserRole } from "@/server/services/config";

const Input = z.object({ role: z.enum(ROLES) });

export const PATCH = api(async (req, ctx: RouteParams<{ id: string }>) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const { role } = await readJson(req, Input);
  await changeUserRole(s, id, role);
  return { ok: true };
});
