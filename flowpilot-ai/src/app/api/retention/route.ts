import { z } from "zod";
import { requireSession } from "@/server/auth/session";
import { api, readJson } from "@/server/http";
import { applyRetention } from "@/server/services/config";

const Input = z.object({ dryRun: z.boolean().default(true), days: z.number().int().min(0).max(3650).optional() });

export const POST = api(async (req) => applyRetention(await requireSession(), await readJson(req, Input)));
