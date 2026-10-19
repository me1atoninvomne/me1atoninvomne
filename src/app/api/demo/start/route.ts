import { cookies } from "next/headers";
import { z } from "zod";
import { DEFAULT_INDUSTRY, INDUSTRY_KEYS } from "@/domain/templates";
import { sessionCookieOptions, USER_COOKIE, WS_COOKIE } from "@/server/auth/session";
import { errorResponse } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createDemoWorkspace } from "@/server/services/workspace";

const Input = z.object({ industry: z.enum(INDUSTRY_KEYS).default(DEFAULT_INDUSTRY) });

/** Creates an isolated demo workspace. Accepts a plain HTML form (redirect) or JSON. */
export async function POST(req: Request) {
  try {
    rateLimit(req, "demo-start", 30, 60 * 60 * 1000);
    const isForm = (req.headers.get("content-type") ?? "").includes("form");
    const raw = isForm ? Object.fromEntries((await req.formData()).entries()) : await req.json().catch(() => ({}));
    const { industry } = Input.parse(raw);
    const { workspaceId, defaultUserId } = await createDemoWorkspace(industry);
    const store = await cookies();
    store.set(WS_COOKIE, workspaceId, sessionCookieOptions());
    store.set(USER_COOKIE, defaultUserId, sessionCookieOptions());
    if (isForm) return new Response(null, { status: 303, headers: { Location: "/app/inbox?tour=1" } });
    return Response.json({ ok: true, redirect: "/app/inbox?tour=1" });
  } catch (error) {
    return errorResponse(error);
  }
}
