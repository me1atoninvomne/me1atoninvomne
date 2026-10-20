import { z } from "zod";
import { getLang } from "@/server/auth/session";
import { notFound } from "@/server/errors";
import { api, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { withdrawLeadConsent } from "@/server/services/privacy";

const Input = z.object({ token: z.string().min(20).max(100), purpose: z.enum(["marketing_email", "phone_callback"]) });

export const POST = api(async (req) => {
  rateLimit(req, "privacy", 60, 60 * 60 * 1000);
  const { token, purpose } = await readJson(req, Input);
  if (!(await withdrawLeadConsent(token, purpose, await getLang(), "privacy_center"))) throw notFound("lead");
  return { ok: true };
});
