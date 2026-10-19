import { expect, test, type Page } from "@playwright/test";

async function startDemo(page: Page, industry = "manufacturing") {
  const res = await page.request.post("/api/demo/start", { data: { industry } });
  expect(res.ok()).toBeTruthy();
  await page.request.post("/api/session/lang", { data: { lang: "de" } });
}

async function processInbox(page: Page) {
  await page.goto("/app/inbox");
  await page.getByRole("button", { name: /Posteingang verarbeiten/ }).click();
  await expect(page.getByText("Verarbeitung abgeschlossen")).toBeVisible({ timeout: 45_000 });
}

test.describe("core flow: e-mail → document → review → decision → ERP", () => {
  test.skip(({ isMobile }) => isMobile, "covered by the responsive smoke test");

  test("price deviation is reviewed, accepted with reason and transferred as draft", async ({ page }) => {
    await startDemo(page);
    await processInbox(page);

    await page.goto("/app/review");
    await page.getByRole("link", { name: /NF-2026-1187/ }).first().click();
    await expect(page.getByRole("heading", { name: /Bestellung NF-2026-1187/ })).toBeVisible();
    await expect(page.getByText(/Preisabweichung Pos\. 10/)).toBeVisible();

    const approve = page.getByRole("button", { name: "Freigeben", exact: true });
    await expect(approve).toBeDisabled();

    await page.getByRole("button", { name: "Abweichung akzeptieren" }).click();
    await page.getByLabel("Begründung").fill("Sonderpreis telefonisch mit Herrn Petersen vereinbart");
    await page.getByRole("dialog").getByRole("button", { name: "Abweichung akzeptieren" }).click();

    await expect(approve).toBeEnabled({ timeout: 15_000 });
    await approve.click();
    await page.getByRole("dialog").getByRole("button", { name: "Freigeben" }).click();
    await expect(page.getByText(/an Demo-ERP übergeben \(DEMO-AE-\d{4}\)/).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/app/audit");
    await expect(page.getByText(/Abweichung akzeptiert/).first()).toBeVisible();
    await expect(page.getByText(/Auftragsentwurf DEMO-AE-/).first()).toBeVisible();
  });

  test("changed bank details require a second person (four-eyes principle)", async ({ page }) => {
    await startDemo(page);
    await processInbox(page);
    await page.goto("/app/review");
    await page.getByRole("link", { name: /RE-EKM-26-4471/ }).first().click();
    await expect(page.getByText("Bankverbindung weicht von den Stammdaten ab").first()).toBeVisible();

    await page.getByRole("button", { name: "Abweichung akzeptieren" }).click();
    await page.getByLabel("Begründung").fill("Rückruf über bekannte Nummer: Bankwechsel bestätigt");
    await page.getByRole("dialog").getByRole("button", { name: "Abweichung akzeptieren" }).click();
    await expect(page.getByText(/Vier-Augen-Prinzip/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Freigeben", exact: true })).toBeDisabled();

    // Second person (administrator) approves – switched via the demo user menu.
    await page.getByRole("button", { name: "Benutzer wechseln (Demo)" }).click();
    await page.getByRole("menuitem", { name: /Andrea Schulz/ }).click();
    await expect(page.getByRole("button", { name: "Benutzer wechseln (Demo)" })).toContainText("Andrea Schulz", { timeout: 15_000 });
    const approve = page.getByRole("button", { name: "Freigeben", exact: true });
    await expect(approve).toBeEnabled();
    await approve.click();
    await page.getByRole("dialog").getByRole("button", { name: "Freigeben" }).click();
    await expect(page.getByText(/DEMO-RV-\d{4}/).first()).toBeVisible({ timeout: 15_000 });
  });
});

const APP_PAGES = [
  "/app",
  "/app/inbox",
  "/app/review",
  "/app/tasks",
  "/app/exceptions",
  "/app/workflows",
  "/app/roi",
  "/app/pilot",
  "/app/integrations",
  "/app/audit",
  "/app/settings",
];
const PUBLIC_PAGES = ["/", "/preise", "/roi-rechner", "/demo", "/kontakt", "/impressum", "/datenschutz"];

test.describe("smoke: every page renders without errors", () => {
  test("public pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const path of PUBLIC_PAGES) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("app pages after processing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await startDemo(page, "wholesale");
    await processInbox(page);
    for (const path of APP_PAGES) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
    }
    expect(errors).toEqual([]);
  });

  test("english language switch", async ({ page }) => {
    await startDemo(page);
    await page.request.post("/api/session/lang", { data: { lang: "en" } });
    await page.goto("/app/inbox");
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    await page.request.post("/api/session/lang", { data: { lang: "de" } });
  });
});
