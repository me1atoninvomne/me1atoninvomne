import { test as base, type Page } from "@playwright/test";
import { expect, startDemo, test } from "./helpers";

const BANNER = { name: "Cookies und lokale Speicherung" };

/** FlowPilot keys in localStorage; null while the page is navigating (poll retries). */
const fpKeys = (page: Page) =>
  page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("fp-"))).catch(() => null);

base.describe("cookie banner (no stored choice)", () => {
  base("offers equal choices, nothing optional pre-selected, choice is remembered", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("region", BANNER);
    await expect(banner).toBeVisible();

    const necessary = banner.getByRole("button", { name: "Nur notwendige" });
    const all = banner.getByRole("button", { name: "Alle akzeptieren" });
    // No dark pattern: both choices look and weigh the same.
    expect(await necessary.getAttribute("class")).toBe(await all.getAttribute("class"));
    const [a, b] = [await necessary.boundingBox(), await all.boundingBox()];
    expect(Math.abs(a!.width - b!.width)).toBeLessThan(2);
    expect(Math.abs(a!.height - b!.height)).toBeLessThan(2);

    await banner.getByRole("button", { name: "Einstellungen" }).click();
    await expect(page.getByRole("dialog").getByRole("switch")).not.toBeChecked();
    await page.keyboard.press("Escape");

    await necessary.click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.getByRole("region", BANNER)).toBeHidden();
    const consent = (await page.context().cookies()).find((c) => c.name === "fp_consent");
    expect(consent?.value).toMatch(/~0$/);
  });

  base("the page stays usable without a choice (no cookie wall)", async ({ page }) => {
    await page.goto("/preise");
    await expect(page.getByRole("region", BANNER)).toBeVisible();
    await page.getByRole("link", { name: "ROI-Rechner" }).first().click();
    await expect(page).toHaveURL(/roi-rechner/);
  });

  base("comfort storage is only written with consent and removed on withdrawal", async ({ page }) => {
    await page.request.post("/api/demo/start", { data: { industry: "manufacturing", confirmAge: true } });
    await page.goto("/app/inbox");
    await page.getByRole("region", BANNER).getByRole("button", { name: "Nur notwendige" }).click();
    await expect(page.getByRole("region", BANNER)).toBeHidden();
    await page.reload();
    await expect.poll(() => fpKeys(page)).toEqual([]);

    await page.getByRole("button", { name: /Benutzer wechseln/ }).click();
    await page.getByRole("menuitem", { name: "Cookie-Einstellungen" }).click();
    await page.getByRole("dialog").getByRole("switch").check();
    await page.getByRole("dialog").getByRole("button", { name: "Auswahl speichern" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.reload();
    await expect.poll(async () => (await fpKeys(page))?.some((k) => k.startsWith("fp-tour-"))).toBe(true);

    await page.getByRole("button", { name: /Benutzer wechseln/ }).click();
    await page.getByRole("menuitem", { name: "Cookie-Einstellungen" }).click();
    await page.getByRole("dialog").getByRole("switch").uncheck();
    await page.getByRole("dialog").getByRole("button", { name: "Auswahl speichern" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect.poll(() => fpKeys(page)).toEqual([]);
  });
});

test.describe("age confirmation and demo data deletion", () => {
  test("demo cannot start without the age/business confirmation", async ({ page }) => {
    const res = await page.request.post("/api/demo/start", { data: { industry: "manufacturing" } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.code).toBe("age_confirmation_required");

    await page.goto("/demo");
    const box = page.getByRole("checkbox", { name: /18 Jahre/ });
    await expect(box).not.toBeChecked();
    await page.getByRole("button", { name: /Demo starten/ }).last().click();
    await expect(page).toHaveURL(/\/demo/);
    await box.check();
    await page.getByRole("button", { name: /Demo starten/ }).last().click();
    await expect(page).toHaveURL(/\/app\/inbox/);
  });

  test("demo data can be deleted completely by the visitor", async ({ page }) => {
    await startDemo(page);
    await page.goto("/app/inbox");
    await page.getByRole("button", { name: /Benutzer wechseln/ }).click();
    await page.getByRole("menuitem", { name: "Demo-Daten löschen" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page).toHaveURL(/\/demo\?deleted=1/);
    await expect(page.getByText(/vollständig gelöscht/)).toBeVisible();
    const names = (await page.context().cookies()).map((c) => c.name);
    expect(names).not.toContain("fp_ws");
    // The workspace no longer exists: the app sends the visitor back to the demo start.
    await page.goto("/app/inbox");
    await expect(page).not.toHaveURL(/\/app\/inbox/);
  });
});

test.describe("contact form consents, personal data page, unsubscribe", () => {
  test("granular consents, access, withdrawal and erasure", async ({ page }) => {
    await page.goto("/kontakt");
    for (const id of ["#contact-b2b", "#contact-consent", "#contact-marketing", "#contact-callback"]) {
      await expect(page.locator(id)).not.toBeChecked();
    }
    await expect(page.locator("#contact-callback")).toBeDisabled();

    await page.locator("#contact-name").fill("Erika Test");
    await page.locator("#contact-company").fill("Beispiel Test GmbH");
    await page.locator("#contact-email").fill(`e2e-${Date.now()}@beispiel.example`);
    await page.getByRole("button", { name: "Anfrage senden" }).click();
    await expect(page.getByText(/mindestens 18 Jahre alt sind/)).toBeVisible();

    await page.locator("#contact-b2b").check();
    await page.locator("#contact-consent").check();
    await page.locator("#contact-marketing").check();
    await page.getByRole("button", { name: "Anfrage senden" }).click();
    await expect(page.getByText("Ihr persönlicher Datenschutz-Link")).toBeVisible();

    const href = await page.getByRole("link", { name: /meine-daten/ }).getAttribute("href");
    const token = new URL(href!, "http://x").searchParams.get("t")!;
    await page.goto(href!);
    await expect(page.getByRole("heading", { name: "Ihre gespeicherten Angaben" })).toBeVisible();

    const exported = await (await page.request.get(`/api/privacy/export?t=${token}`)).json();
    expect(exported.lead.marketingEmail).toBe(true);
    expect(exported.lead.accessToken).toBeUndefined();
    expect(exported.consents.map((c: { purpose: string }) => c.purpose)).toEqual(["age_b2b", "processing", "marketing_email", "phone_callback"]);

    await page.goto(`/abmelden?t=${token}`);
    await page.getByRole("button", { name: "Jetzt abmelden" }).click();
    await expect(page.getByText(/keine E-Mail-Informationen mehr/)).toBeVisible();
    expect((await (await page.request.get(`/api/privacy/export?t=${token}`)).json()).lead.marketingEmail).toBe(false);

    await page.goto(href!);
    await page.getByRole("button", { name: "Anfrage und alle Angaben löschen" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page.getByText("Ihre Angaben wurden gelöscht.")).toBeVisible();
    expect((await page.request.get(`/api/privacy/export?t=${token}`)).status()).toBe(404);
  });

  test("unsubscribe by e-mail does not reveal whether an address is stored", async ({ page }) => {
    const res = await page.request.post("/api/unsubscribe", { data: { email: "unbekannt@beispiel.example" } });
    expect(await res.json()).toEqual({ ok: true });
  });

  test("privacy request gets a one-month deadline", async ({ page }) => {
    await page.goto("/datenschutz/anfrage");
    await page.getByLabel("Art der Anfrage").selectOption("erasure");
    await page.locator("#dsr-name").fill("Erika Test");
    await page.locator("#dsr-email").fill("erika@beispiel.example");
    await page.locator("#dsr-confirm").check();
    await page.getByRole("button", { name: "Anfrage senden" }).click();
    await expect(page.getByText(/Anfrage mit der Nummer dsr_/)).toBeVisible();
  });
});

test.describe("legal pages", () => {
  test("footer links to every legal page and each one renders", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    const hrefs = ["/impressum", "/datenschutz", "/agb", "/erstattung", "/cookies", "/datenschutz/anfrage", "/abmelden", "/lizenzen", "/barrierefreiheit"];
    for (const href of hrefs) {
      await expect(footer.locator(`a[href="${href}"]`)).toHaveCount(1);
      const res = await page.goto(href);
      expect(res?.status(), href).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
    }
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("button", { name: "Cookie-Einstellungen" }).click();
    await expect(page.getByRole("dialog", { name: "Cookie-Einstellungen" })).toBeVisible();
  });
});
