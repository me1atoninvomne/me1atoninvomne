import { z } from "zod";
import { getLang } from "@/server/auth/session";
import { api, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createLead } from "@/server/services/privacy";

const Input = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(60).optional(),
  employees: z.string().max(40).optional(),
  process: z.string().max(80).optional(),
  message: z.string().max(2000).optional(),
  consents: z.object({
    /** Required: at least 18 years old and acting for a business. */
    b2b: z.literal(true),
    /** Required: consent to process the request. */
    processing: z.literal(true),
    /** Optional, never pre-selected. */
    marketingEmail: z.boolean().default(false),
    phoneCallback: z.boolean().default(false),
  }),
  website: z.string().max(0).optional(), // honeypot
});

/**
 * Stores a consultation request with its consent decisions. No e-mail is sent from this
 * installation. The returned token is the person's private link for access, export, withdrawal
 * and deletion – it is shown once and only its hash is stored.
 */
export const POST = api(async (req) => {
  rateLimit(req, "leads", 10, 60 * 60 * 1000);
  const data = await readJson(req, Input);
  const { token } = await createLead(
    { ...data, marketingEmail: data.consents.marketingEmail, phoneCallback: data.consents.phoneCallback },
    await getLang(),
  );
  return { ok: true, token };
});
