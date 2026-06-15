#!/usr/bin/env node
// Drift defence: colours come from design tokens, not hardcoded hex in
// components (harness §3.2/§3.3). The tokens SoT (app/globals.css) is exempt.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components"];
const SCAN_EXT = new Set([".tsx", ".module.css"]);
const TOKENS_FILE = join(ROOT, "app", "globals.css"); // the single source of colour truth
const HEX = /#[0-9a-fA-F]{3,8}\b/;

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".module.css") || SCAN_EXT.has(extname(full))) out.push(full);
  }
  return out;
}

let failures = 0;
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    if (file === TOKENS_FILE) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith("//") || t.startsWith("*")) return;
      if (HEX.test(line)) {
        console.error(`${file}:${i + 1} — hardcoded hex colour; use a var(--token) instead\n  ${t.slice(0, 160)}`);
        failures++;
      }
    });
  }
}

if (failures) {
  console.error(`\ntokens: ${failures} violation(s).`);
  process.exit(1);
}
console.log("tokens: OK");
