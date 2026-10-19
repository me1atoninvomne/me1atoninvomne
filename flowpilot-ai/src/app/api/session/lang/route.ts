import { cookies } from "next/headers";
import { z } from "zod";
import { LANG_COOKIE, LANGS } from "@/i18n/core";
import { api, readJson } from "@/server/http";

const Input = z.object({ lang: z.enum(LANGS) });

export const POST = api(async (req) => {
  const { lang } = await readJson(req, Input);
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return { ok: true };
});
