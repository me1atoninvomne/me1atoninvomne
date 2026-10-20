import type { Page } from "@playwright/test";
import { expect, startDemo, test } from "./helpers";


/** Waits until the page is quiet; pages with a live event stream (audit log) never become fully idle. */
async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
}

/**
 * Proof for "no third-party SDKs in the browser": every request the browser makes while using the
 * website and the demo goes to the application's own origin – no CDNs, web fonts, analytics,
 * tag managers, chat widgets or embedded content. The Content-Security-Policy enforces the same.
 */
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

function recordForeignRequests(page: Page, origin: string) {
  const foreign = new Set<string>();
  page.on("request", (req) => {
    const url = req.url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return;
    if (new URL(url).origin !== origin) foreign.add(url);
  });
  return foreign;
}

test("no requests to third parties on public pages and in the demo", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  const origin = new URL(baseURL!).origin;
  const foreign = recordForeignRequests(page, origin);
  const cspViolations: string[] = [];
  page.on("console", (msg) => {
    if (/Content Security Policy/i.test(msg.text())) cspViolations.push(msg.text());
  });

  for (const path of PUBLIC_PAGES) {
    await page.goto(path);
    await settle(page);
  }
  // The live sample on the landing page runs the real processing chain on the server.
  await page.goto("/");
  await page.locator("#beispiel").scrollIntoViewIfNeeded();
  await settle(page);

  await startDemo(page);
  await page.goto("/app/inbox");
  await page.getByRole("button", { name: /Posteingang verarbeiten/ }).click();
  await expect(page.getByText("Verarbeitung abgeschlossen")).toBeVisible({ timeout: 45_000 });
  for (const path of ["/app", "/app/review", "/app/exceptions", "/app/roi", "/app/integrations", "/app/settings"]) {
    await page.goto(path);
    await settle(page);
  }
  // Document detail incl. the PDF preview (pdf.js runs locally, no worker or font from a CDN).
  await page.goto("/app/review");
  await page.getByRole("link", { name: /NF-2026-1187/ }).first().click();
  const canvas = page.locator("canvas[role='img']");
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  // The page was actually drawn under the CSP (dark text pixels on the canvas).
  await expect
    .poll(
      () =>
        canvas.evaluate((c: HTMLCanvasElement) => {
          const data = c.getContext("2d")?.getImageData(0, 0, c.width, c.height).data;
          if (!data) return false;
          for (let i = 0; i < data.length; i += 16) if (data[i + 3] > 0 && data[i] < 120) return true;
          return false;
        }),
      { timeout: 20_000 },
    )
    .toBeTruthy();
  await settle(page);

  expect([...foreign], "requests to other origins").toEqual([]);
  expect(cspViolations, "CSP violations").toEqual([]);
});

test("security headers incl. Content-Security-Policy are sent", async ({ page }) => {
  const res = await page.goto("/");
  const csp = res?.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("connect-src 'self'");
  expect(csp).toContain("frame-ancestors 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(res?.headers()["x-content-type-options"]).toBe("nosniff");
});
