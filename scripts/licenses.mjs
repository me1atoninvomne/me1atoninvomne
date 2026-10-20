#!/usr/bin/env node
/**
 * Generates the third-party licence inventory for the production dependency tree.
 *
 *   npm run licenses
 *
 * Input:  package-lock.json (every package not marked `dev: true`) and node_modules/<pkg>/.
 * Output: src/legal/third-party-licenses.json   – list shown on /lizenzen (and checked by tests)
 *         public/licenses/THIRD-PARTY-NOTICES.txt – full licence texts, identical texts merged
 *
 * Platform-specific optional packages that are not installed on this machine (e.g. macOS or
 * Windows binaries) are listed with `installed: false`; their licence comes from the lockfile.
 * Re-run after every dependency change – tests/unit/licenses.test.ts fails otherwise.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));

const LICENSE_FILE = /^(licen[cs]e|copying|notice)([.-].*)?$/i;

function normaliseRepository(repo) {
  if (!repo) return null;
  let url = typeof repo === "string" ? repo : repo.url;
  if (!url) return null;
  if (/^[\w-]+\/[\w.-]+$/.test(url)) url = `https://github.com/${url}`;
  url = url.replace(/^git\+/, "").replace(/^git:\/\//, "https://").replace(/^ssh:\/\/git@/, "https://").replace(/^git@github\.com:/, "https://github.com/");
  url = url.replace(/^github:/, "https://github.com/").replace(/\.git$/, "");
  return url;
}

function licenseOf(pkgJson, lockEntry) {
  const l = pkgJson?.license ?? lockEntry.license;
  if (typeof l === "string") return l;
  if (l && typeof l === "object" && l.type) return l.type;
  if (Array.isArray(pkgJson?.licenses)) return pkgJson.licenses.map((x) => x.type ?? x).join(" OR ");
  return "UNKNOWN";
}

function authorOf(pkgJson) {
  const a = pkgJson?.author;
  if (!a) return null;
  return typeof a === "string" ? a : a.name ?? null;
}

const entries = [];
const texts = new Map(); // hash -> { text, packages: [] }

for (const [path, meta] of Object.entries(lock.packages)) {
  if (!path || meta.dev) continue;
  const name = path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
  const dir = join(root, path);
  const installed = existsSync(join(dir, "package.json"));
  const pkgJson = installed ? JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) : null;
  const entry = {
    name,
    version: pkgJson?.version ?? meta.version ?? null,
    license: licenseOf(pkgJson, meta),
    repository: normaliseRepository(pkgJson?.repository) ?? (pkgJson?.homepage || null),
    author: authorOf(pkgJson),
    installed,
    ...(meta.optional ? { optional: true } : {}),
  };
  entries.push(entry);
  if (!installed) continue;
  const files = readdirSync(dir).filter((f) => LICENSE_FILE.test(f)).sort();
  if (files.length === 0) {
    const key = `missing:${entry.license}`;
    const bucket = texts.get(key) ?? {
      text: [
        `No licence file is shipped with these packages. Declared licence: ${entry.license}. See the package repository for the full text.`,
        ...(/LGPL-3\.0/.test(entry.license)
          ? [
              "GNU LGPL 3.0: https://www.gnu.org/licenses/lgpl-3.0.txt (supplements the GNU GPL 3.0: https://www.gnu.org/licenses/gpl-3.0.txt).",
              "The libraries are used unmodified as dynamically loaded binaries; their source code is available from the repository named above.",
            ]
          : []),
      ].join("\n"),
      packages: [],
    };
    bucket.packages.push(`${entry.name}@${entry.version}${entry.repository ? ` <${entry.repository}>` : ""}`);
    texts.set(key, bucket);
    continue;
  }
  for (const f of files) {
    const text = readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n").trim();
    const key = createHash("sha256").update(text).digest("hex");
    const bucket = texts.get(key) ?? { text, packages: [] };
    bucket.packages.push(`${entry.name}@${entry.version}${files.length > 1 ? ` (${f})` : ""}`);
    texts.set(key, bucket);
  }
}

entries.sort((a, b) => a.name.localeCompare(b.name) || String(a.version).localeCompare(String(b.version)));

const jsonPath = join(root, "src/legal/third-party-licenses.json");
writeFileSync(jsonPath, `${JSON.stringify(entries, null, 2)}\n`);

/**
 * Components that are bundled inside another package without their own licence file.
 * Their licences still apply to the distributed code, so they are named explicitly.
 */
const bundled = [];
const unpdfReadme = join(root, "node_modules/unpdf/README.md");
if (existsSync(unpdfReadme)) {
  const version = /built from PDF\.js v(\d+(?:\.\d+)*)/.exec(readFileSync(unpdfReadme, "utf8"))?.[1] ?? "unknown";
  bundled.push(
    `PDF.js ${version} (Copyright Mozilla Foundation and contributors), bundled in unpdf.`,
    "Licence: Apache License, Version 2.0 – the full text is reproduced in this file (see the",
    "packages listed with the Apache License above) and at https://github.com/mozilla/pdf.js/blob/master/LICENSE",
  );
}

const rule = "=".repeat(78);
const notices = [
  "FlowPilot AI – third-party software notices",
  "",
  "This file lists the licence texts of all third-party packages in the production dependency",
  "tree of this application (generated by scripts/licenses.mjs from package-lock.json).",
  "Packages whose licence texts are identical are grouped under one text.",
  "",
  ...[...texts.values()]
    .sort((a, b) => a.packages[0].localeCompare(b.packages[0]))
    .flatMap((t) => [rule, `Used by: ${t.packages.sort().join(", ")}`, rule, "", t.text, ""]),
  ...(bundled.length > 0 ? [rule, "Bundled components without a separate licence file", rule, "", ...bundled, ""] : []),
].join("\n");
mkdirSync(join(root, "public/licenses"), { recursive: true });
writeFileSync(join(root, "public/licenses/THIRD-PARTY-NOTICES.txt"), `${notices}\n`);

const installedCount = entries.filter((e) => e.installed).length;
console.log(`${entries.length} packages (${installedCount} installed), ${texts.size} distinct licence texts`);
console.log(`→ ${jsonPath}`);
console.log("→ public/licenses/THIRD-PARTY-NOTICES.txt");
