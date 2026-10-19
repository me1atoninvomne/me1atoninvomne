// Usage: node scripts-shot.mjs <outPrefix> <path1> [path2 ...]   env: WIDTH, PROCESS=1, LANG=en, NEWDEMO=1
import { chromium } from "@playwright/test";
import fs from "node:fs";
const out = process.argv[2];
const paths = process.argv.slice(3);
const base = process.env.BASE ?? "http://localhost:3000";
const width = Number(process.env.WIDTH ?? 1440);
const stateFile = process.env.STATE ?? "/tmp/claude-0/-home-user/39a1dc46-295c-5084-a024-f089e0de5709/scratchpad/state.json";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({
  viewport: { width, height: Number(process.env.HEIGHT ?? 900) },
  deviceScaleFactor: 1,
  storageState: !process.env.NEWDEMO && fs.existsSync(stateFile) ? stateFile : undefined,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
if (process.env.NEWDEMO) {
  const r = await page.request.post(base + "/api/demo/start", { data: { industry: process.env.INDUSTRY ?? "manufacturing" } });
  console.log("demo start", r.status());
}
if (process.env.LANG_EN) await page.request.post(base + "/api/session/lang", { data: { lang: "en" } });
if (process.env.PROCESS) {
  await page.goto(base + "/app/inbox");
  const html = await page.content();
  const ids = [...new Set([...html.matchAll(/eml_[a-z0-9]{12}/g)].map((m) => m[0]))];
  for (const id of ids) await page.request.post(base + `/api/emails/${id}/process`, { data: {} });
  console.log("processed", ids.length);
}
for (const [i, p] of paths.entries()) {
  await page.goto(base + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(Number(process.env.WAIT ?? 300));
  const file = `${out}-${i}.png`;
  await page.screenshot({ path: file, fullPage: process.env.FULL !== "0" });
  console.log("shot", p, "->", file);
}
await ctx.storageState({ path: stateFile });
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
