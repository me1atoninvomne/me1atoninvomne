import { z } from "zod";
import { INDUSTRY_KEYS } from "@/domain/templates";
import { requireSession } from "@/server/auth/session";
import { api, readJson } from "@/server/http";
import { resetWorkspace } from "@/server/services/workspace";

const Input = z.object({ industry: z.enum(INDUSTRY_KEYS).optional() });

export const POST = api(async (req) => {
  const s = await requireSession();
  // In a demo workspace every visitor may reset their own sandbox; real workspaces need admin rights.
  if (!s.workspace.isDemo) s.require("workspace.reset");
  const { industry } = await readJson(req, Input);
  await resetWorkspace(s.workspace.id, industry);
  return { ok: true };
});
