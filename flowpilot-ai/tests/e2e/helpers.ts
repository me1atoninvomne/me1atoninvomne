import { test as base, expect, type Page } from "@playwright/test";
import { CONSENT_COOKIE, serializeConsent } from "../../src/legal/cookies";
import { LEGAL_VERSIONS } from "../../src/legal/versions";

/**
 * Test fixture with a stored "necessary only" cookie choice, so the cookie banner does not cover
 * the page in flows that are not about the banner (the banner has its own spec).
 */
export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    const value = serializeConsent({ v: LEGAL_VERSIONS.consent, id: "e2e-test", at: new Date().toISOString(), comfort: false });
    await context.addCookies([{ name: CONSENT_COOKIE, value, url: baseURL ?? "http://localhost:3100" }]);
    await use(context);
  },
});

export { expect };

export async function startDemo(page: Page, industry = "manufacturing") {
  const res = await page.request.post("/api/demo/start", { data: { industry, confirmAge: true } });
  expect(res.ok()).toBeTruthy();
  await page.request.post("/api/session/lang", { data: { lang: "de" } });
}
