// Smoke check of the in-browser PDF preview with source highlighting.
// Usage: BASE=http://localhost:3100 node scripts/pdfcheck.mjs <screenshot.png>
import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const logs = [];
page.on("console", (m) => m.type() !== "log" && m.type() !== "info" && logs.push(m.type() + ": " + m.text()));
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
await page.request.post(base + "/api/demo/start", { data: { industry: "manufacturing" } });
await page.goto(base + "/app/inbox");
await page.getByRole("button", { name: /Posteingang verarbeiten/ }).click();
await page.getByText("Verarbeitung abgeschlossen").waitFor({ timeout: 45000 });
await page.goto(base + "/app/review");
await page.getByRole("link", { name: /NF-2026-1187/ }).first().click();
await page.locator("canvas").waitFor({ timeout: 20000 });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /Fundstelle anzeigen/ }).first().click();
await page.waitForTimeout(800);
console.log("highlight boxes:", await page.locator("[data-hl]").count());
await page.screenshot({ path: process.argv[2] ?? "pdfcheck.png" });
console.log(logs.join("\n") || "no warnings/errors");
await browser.close();
