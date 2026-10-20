import { z } from "zod";
import { getLang } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { api } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { unsubscribeEmail, withdrawLeadConsent } from "@/server/services/privacy";

const Input = z.union([z.object({ token: z.string().min(20).max(100) }), z.object({ email: z.string().trim().email().max(200) })]);

/**
 * Withdraws consent to e-mail information. Accepts JSON ({token} or {email}) and the RFC 8058
 * one-click form post (`/api/unsubscribe?t=…` with `List-Unsubscribe=One-Click`), so future
 * mailings can use it in their List-Unsubscribe-Post header. The e-mail variant always answers
 * the same way, so it cannot be used to find out whether an address is stored.
 */
export const POST = api(async (req) => {
  rateLimit(req, "unsubscribe", 30, 60 * 60 * 1000);
  const lang = await getLang();
  const queryToken = new URL(req.url).searchParams.get("t");
  if (queryToken) {
    await withdrawLeadConsent(queryToken, "marketing_email", lang, "unsubscribe");
    return { ok: true };
  }
  const body = Input.parse(await req.json().catch(() => ({})));
  if ("token" in body) {
    if (!(await withdrawLeadConsent(body.token, "marketing_email", lang, "unsubscribe"))) throw new AppError("invalid_token", 404);
    return { ok: true };
  }
  await unsubscribeEmail(body.email, lang);
  return { ok: true };
});
