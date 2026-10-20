import { z } from "zod";
import { notFound } from "@/server/errors";
import { api, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { deleteLead } from "@/server/services/privacy";

const Input = z.object({ token: z.string().min(20).max(100) });

/** Immediate erasure of a contact request by the person holding its private link (Art. 17 GDPR). */
export const POST = api(async (req) => {
  rateLimit(req, "privacy", 60, 60 * 60 * 1000);
  const { token } = await readJson(req, Input);
  if (!(await deleteLead(token))) throw notFound("lead");
  return { ok: true };
});
