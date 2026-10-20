import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSETS, NON_ASSET_PUBLIC_FILES } from "@/legal/assets";
import thirdParty from "@/legal/third-party-licenses.json";

const root = join(__dirname, "../..");
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")) as {
  packages: Record<string, { dev?: boolean; version?: string; license?: string }>;
};

/** Permissive licences that only require attribution / keeping the notice. */
const PERMISSIVE = new Set([
  "MIT",
  "MIT-0",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "OFL-1.1",
  "BlueOak-1.0.0",
  "CC0-1.0",
  "CC-BY-4.0",
  "Unlicense",
  "Zlib",
  "Python-2.0",
]);

/**
 * Reviewed exceptions (weak copyleft). Only these packages may carry a non-permissive licence:
 * libvips (LGPL-3.0-or-later) ships as optional, unmodified, dynamically loaded binaries of
 * `sharp`, an optional dependency of Next.js for image optimisation. The application does not use
 * next/image; the licence text reference is part of public/licenses/THIRD-PARTY-NOTICES.txt.
 */
const REVIEWED_LGPL = /^@img\/sharp-(libvips-.+|wasm32|win32-.+)$/;

function licenceIds(expr: string): string[] {
  return expr
    .replace(/[()]/g, " ")
    .split(/\s+(?:AND|OR|WITH)\s+|\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

describe("third-party licences", () => {
  const listed = new Map(thirdParty.map((e) => [`${e.name}@${e.version}`, e]));

  it("lists every production package from package-lock.json (run `npm run licenses` after dependency changes)", () => {
    const missing: string[] = [];
    for (const [path, meta] of Object.entries(lock.packages)) {
      if (!path || meta.dev) continue;
      const name = path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
      if (!listed.has(`${name}@${meta.version}`)) missing.push(`${name}@${meta.version}`);
    }
    expect(missing).toEqual([]);
  });

  it("only uses permissive licences, apart from the reviewed LGPL exception", () => {
    const offending = thirdParty
      .filter((e) => !licenceIds(e.license).every((id) => PERMISSIVE.has(id) || (REVIEWED_LGPL.test(e.name) && /^LGPL-3\.0/.test(id))))
      .map((e) => `${e.name}: ${e.license}`);
    expect(offending).toEqual([]);
  });

  it("ships the notices file and the Inter font licence", () => {
    const notices = readFileSync(join(root, "public/licenses/THIRD-PARTY-NOTICES.txt"), "utf8");
    expect(notices).toContain("PDF.js");
    for (const e of thirdParty.filter((p) => p.installed)) expect(notices).toContain(`${e.name}@${e.version}`);
    expect(readFileSync(join(root, "public/licenses/Inter-OFL-1.1.txt"), "utf8")).toContain("SIL Open Font License");
  });
});

describe("image and asset licences", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  }

  it("documents every file in public/ and the app icon in src/legal/assets.ts", () => {
    const sources = new Set(ASSETS.map((a) => a.source));
    const files = walk(join(root, "public"))
      .map((p) => relative(join(root, "public"), p))
      .filter((p) => !NON_ASSET_PUBLIC_FILES.some((x) => (x.endsWith("/") ? p.startsWith(x) : p === x)))
      .map((p) => `public/${p}`);
    const undocumented = [...files, "src/app/icon.svg"].filter((f) => !sources.has(f));
    expect(undocumented).toEqual([]);
  });

  it("points to files that exist", () => {
    for (const a of ASSETS.filter((x) => x.source.startsWith("src/") || x.source.startsWith("public/"))) {
      expect(existsSync(join(root, a.source)), a.source).toBe(true);
    }
  });

  it("contains no raster images or fonts outside the documented packages", () => {
    const binaries = walk(join(root, "src"))
      .concat(walk(join(root, "public")))
      .filter((p) => /\.(png|jpe?g|gif|webp|avif|bmp|tiff?|woff2?|ttf|otf)$/i.test(p));
    expect(binaries).toEqual([]);
  });
});
