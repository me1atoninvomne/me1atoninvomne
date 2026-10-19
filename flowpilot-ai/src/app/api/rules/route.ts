import { requireSession } from "@/server/auth/session";
import { api, readJson } from "@/server/http";
import { createRule, RuleInputSchema } from "@/server/services/config";

export const POST = api(async (req) => createRule(await requireSession(), await readJson(req, RuleInputSchema)));
