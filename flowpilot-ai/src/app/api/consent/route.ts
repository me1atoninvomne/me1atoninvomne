import { cookies } from "next/headers";
import { z } from "zod";
import { CONSENT_COOKIE, CONSENT_MAX_AGE, parseConsent, serializeConsent, type ConsentState } from "@/legal/cookies";
import { LEGAL_VERSIONS } from "@/legal/versions";
import { getLang } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { api, readJson } from "@/server/http";
import { newId, nowIso } from "@/server/ids";
import { rateLimit } from "@/server/rate-limit";
import { recordConsent } from "@/server/services/privacy";

const Input = z.object({ comfort: z.boolean() });

/** Stores the cookie-banner choice in the browser and, as proof, in the consent log (no personal data). */
export const POST = api(async (req) => {
  rateLimit(req, "consent", 60, 60 * 60 * 1000);
  const { comfort } = await readJson(req, Input);
  const store = await cookies();
  const previous = parseConsent(store.get(CONSENT_COOKIE)?.value, LEGAL_VERSIONS.consent);
  const consent: ConsentState = { v: LEGAL_VERSIONS.consent, id: previous?.id ?? newId("cc", 16), at: nowIso(), comfort };
  store.set(CONSENT_COOKIE, serializeConsent(consent), {
    path: "/",
    maxAge: CONSENT_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
  });
  const db = await getDb();
  await recordConsent(db, { subjectType: "cookie", subjectId: consent.id, purpose: "comfort_storage", granted: comfort, lang: await getLang(), source: "banner" });
  return { consent };
});
