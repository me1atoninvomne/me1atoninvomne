import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./helpers";

/**
 * Keyboard-only walkthrough of the core journey: skip link, starting the demo (incl. the age
 * confirmation), processing the inbox and opening a document from the review queue.
 * Every target is reached with Tab only – never clicked or focused programmatically.
 */
test.skip(({ isMobile }) => isMobile, "keyboard flow is checked on desktop");

async function isFocused(locator: Locator) {
  return locator.evaluate((el) => el === document.activeElement).catch(() => false);
}

/** Presses Tab until `target` has focus; fails if it is not reachable. */
async function tabTo(page: Page, target: Locator, max = 120) {
  for (let i = 0; i < max; i++) {
    if (await isFocused(target)) return;
    await page.keyboard.press("Tab");
  }
  expect(await isFocused(target), "element not reachable with Tab").toBeTruthy();
}

/** The focused element (or, for visually hidden inputs, its label) shows a visible focus indicator. */
async function expectVisibleFocus(page: Page) {
  const visible = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return false;
    const shows = (node: Element) => {
      const s = getComputedStyle(node);
      const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
      return outline || s.boxShadow !== "none";
    };
    return shows(el) || (el.closest("label") ? shows(el.closest("label")!) : false);
  });
  expect(visible, "focused element has no visible focus indicator").toBeTruthy();
}

test("keyboard only: skip link, demo start, inbox processing, review", async ({ page }) => {
  test.setTimeout(120_000);

  // 1. Skip link is the first stop and moves focus to the main content.
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Zum Inhalt springen" });
  expect(await isFocused(skip)).toBeTruthy();
  await expect(skip).toBeVisible();
  await expectVisibleFocus(page);
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("main");

  // 2. Start the demo – the age/business confirmation is required and reachable.
  await page.goto("/demo");
  const age = page.getByRole("checkbox", { name: /18 Jahre/ });
  await tabTo(page, age);
  await expectVisibleFocus(page);
  await page.keyboard.press("Space");
  await expect(age).toBeChecked();
  const submit = page.locator('form[action="/api/demo/start"] button[type="submit"]');
  await tabTo(page, submit);
  await expectVisibleFocus(page);
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/app\/inbox/);

  // 3. Process the inbox.
  const process = page.getByRole("button", { name: /Posteingang verarbeiten/ });
  await expect(process).toBeVisible();
  await tabTo(page, process);
  await expectVisibleFocus(page);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Verarbeitung abgeschlossen")).toBeVisible({ timeout: 45_000 });

  // 4. Open a document from the review queue.
  await page.goto("/app/review");
  const doc = page.getByRole("link", { name: /NF-2026-1187/ }).first();
  await tabTo(page, doc, 200);
  await expectVisibleFocus(page);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /Bestellung NF-2026-1187/ })).toBeVisible();

  // 5. The deviation dialog opens and closes with the keyboard; focus returns to the trigger.
  const accept = page.getByRole("button", { name: "Abweichung akzeptieren" });
  await tabTo(page, accept, 200);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(() => isFocused(accept), { message: "focus returns to the dialog trigger" }).toBeTruthy();
});

test("mobile menu of the website closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.locator('button[aria-controls="mobile-nav"]');
  await tabTo(page, toggle);
  await page.keyboard.press("Enter");
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-nav")).toBeHidden();
  expect(await isFocused(toggle)).toBeTruthy();
  await expect(toggle).toHaveAccessibleName("Menü öffnen");
});
