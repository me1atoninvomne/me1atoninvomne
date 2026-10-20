import { cookies } from "next/headers";
import { z } from "zod";
import { DEFAULT_INDUSTRY, INDUSTRY_KEYS } from "@/domain/templates";
import { getLang, sessionCookieOptions, USER_COOKIE, WS_COOKIE } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { errorResponse } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { recordConsent } from "@/server/services/privacy";
import { createDemoWorkspace } from "@/server/services/workspace";

const Input = z.object({
  industry: z.enum(INDUSTRY_KEYS).catch(DEFAULT_INDUSTRY),
  /** Age and business-use confirmation – a checkbox ("on") in the form, `true` in JSON. */
  confirmAge: z.union([z.literal(true), z.literal("on"), z.literal("true")]).optional(),
});

/** Creates an isolated demo workspace. Accepts a plain HTML form (redirect) or JSON. */
export async function POST(req: Request) {
  const isForm = (req.headers.get("content-type") ?? "").includes("form");
  try {
    rateLimit(req, "demo-start", 30, 60 * 60 * 1000);
    const raw = isForm ? Object.fromEntries((await req.formData()).entries()) : await req.json().catch(() => ({}));
    const { industry, confirmAge } = Input.parse(raw);
    if (!confirmAge) {
      if (isForm) return new Response(null, { status: 303, headers: { Location: `/demo?error=age&industry=${industry}#demo-start` } });
      throw new AppError("age_confirmation_required", 400);
    }
    const { workspaceId, defaultUserId } = await createDemoWorkspace(industry);
    await recordConsent(await getDb(), { subjectType: "demo", subjectId: workspaceId, purpose: "age_b2b", granted: true, lang: await getLang(), source: "demo_start" });
    const store = await cookies();
    store.set(WS_COOKIE, workspaceId, sessionCookieOptions());
    store.set(USER_COOKIE, defaultUserId, sessionCookieOptions());
    if (isForm) return new Response(null, { status: 303, headers: { Location: "/app/inbox?tour=1" } });
    return Response.json({ ok: true, redirect: "/app/inbox?tour=1" });
  } catch (error) {
    return errorResponse(error);
  }
}
