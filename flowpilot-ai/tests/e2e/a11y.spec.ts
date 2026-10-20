import AxeBuilder from "@axe-core/playwright";
import { test as baseTest, type Page } from "@playwright/test";
import { expect, startDemo, test } from "./helpers";


/** Waits until the page is quiet; pages with a live event stream (audit log) never become fully idle. */
async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
}

/**
 * Automated accessibility checks (axe-core, WCAG 2.1 A/AA) on every public and app page.
 * Automated checks find a subset of barriers only – keyboard flows are covered in keyboard.spec.ts.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const PUBLIC_PAGES = [
  "/",
  "/preise",
  "/roi-rechner",
  "/demo",
  "/kontakt",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/erstattung",
  "/cookies",
  "/lizenzen",
  "/barrierefreiheit",
  "/datenschutz/anfrage",
  "/abmelden",
];

const APP_PAGES = [
  "/app",
  "/app/inbox",
  "/app/review",
  "/app/exceptions",
  "/app/tasks",
  "/app/workflows",
  "/app/roi",
  "/app/pilot",
  "/app/integrations",
  "/app/audit",
  "/app/settings",
];

async function scan(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(TAGS);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  return violations.map((v) => {
    const nodes = v.nodes
      .slice(0, 5)
      .map((n) => `    ${n.target.join(" ")}\n      ${n.failureSummary?.split("\n").slice(1, 2).join(" ").trim() ?? ""}`)
      .join("\n");
    return `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}×)\n${nodes}`;
  });
}

/** Visits a page and returns axe violations; null when the page does not exist (yet). */
async function check(page: Page, path: string): Promise<string[] | null> {
  const res = await page.goto(path);
  if (res?.status() === 404) return null;
  expect(res?.ok(), `${path} responded with ${res?.status()}`).toBeTruthy();
  await settle(page);
  return scan(page);
}

function report(results: Record<string, string[]>) {
  return Object.entries(results)
    .filter(([, v]) => v.length > 0)
    .map(([path, v]) => `${path}\n${v.join("\n")}`)
    .join("\n\n");
}

test.describe("accessibility (axe, WCAG 2.1 AA)", () => {
  test("public pages", async ({ page }) => {
    test.setTimeout(180_000);
    const results: Record<string, string[]> = {};
    const missing: string[] = [];
    for (const path of PUBLIC_PAGES) {
      const v = await check(page, path);
      if (v === null) missing.push(path);
      else results[path] = v;
    }
    if (missing.length) test.info().annotations.push({ type: "skipped pages (404)", description: missing.join(", ") });
    expect(report(results), "axe violations").toBe("");
  });

  test("app pages after processing the inbox", async ({ page }) => {
    test.setTimeout(240_000);
    await startDemo(page);
    await page.goto("/app/inbox");
    await page.getByRole("button", { name: /Posteingang verarbeiten/ }).click();
    await expect(page.getByText("Verarbeitung abgeschlossen")).toBeVisible({ timeout: 45_000 });

    const results: Record<string, string[]> = {};
    for (const path of APP_PAGES) results[path] = (await check(page, path)) ?? [`${path} not found`];

    // A document detail page (PDF preview, extracted fields, findings).
    await page.goto("/app/review");
    await page.getByRole("link", { name: /NF-2026-1187/ }).first().click();
    await expect(page.getByRole("heading", { name: /Bestellung NF-2026-1187/ })).toBeVisible();
    await settle(page);
    results["/app/documents/[id]"] = await scan(page);

    // An open dialog (Radix) – focus trap and labelling.
    await page.getByRole("button", { name: "Abweichung akzeptieren" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    results["/app/documents/[id] (dialog)"] = await scan(page, '[role="dialog"]');

    expect(report(results), "axe violations").toBe("");
  });

  test("english pages", async ({ page }) => {
    await page.request.post("/api/session/lang", { data: { lang: "en" } });
    const results: Record<string, string[]> = {};
    for (const path of ["/", "/preise", "/demo"]) results[path] = (await check(page, path)) ?? [];
    await page.request.post("/api/session/lang", { data: { lang: "de" } });
    expect(report(results), "axe violations").toBe("");
  });
});

// Without the consent fixture: the cookie banner itself must be accessible.
baseTest("cookie banner", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("region", { name: /Cookies/ });
  baseTest.skip((await banner.count()) === 0, "cookie banner not present yet");
  await expect(banner).toBeVisible();
  const violations = await scan(page);
  expect(violations.join("\n"), "axe violations").toBe("");
});
