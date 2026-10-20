import { z } from "zod";
import { getLang } from "@/server/auth/session";
import { api, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createPrivacyRequest, PRIVACY_REQUEST_TYPES } from "@/server/services/privacy";

const Input = z.object({
  type: z.enum(PRIVACY_REQUEST_TYPES),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().max(2000).optional(),
  confirm: z.literal(true),
  website: z.string().max(0).optional(), // honeypot
});

/** Records a data-subject request with its one-month deadline (Art. 12(3) GDPR). */
export const POST = api(async (req) => {
  rateLimit(req, "privacy-request", 10, 60 * 60 * 1000);
  const data = await readJson(req, Input);
  const { id, dueAt } = await createPrivacyRequest(data, await getLang());
  return { ok: true, id, dueAt };
});
