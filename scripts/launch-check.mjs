#!/usr/bin/env node
// Launch gate as a MACHINE check (harness §4.7): assert the Appendix-A launch
// deliverables are present, so an unread harness section can't silently drop
// one (as happened pre-launch: no PWA, no Vercel Analytics, the §15 KV bug).
// Checks presence/markers, not behaviour — cheap and fast; runs inside `verify`.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const fails = [];

function mustExist(rel, why) {
  if (!existsSync(join(ROOT, rel))) fails.push(`missing file ${rel} — ${why}`);
}
function mustContain(rel, needle, why) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) {
    fails.push(`missing file ${rel} — ${why}`);
    return;
  }
  if (!readFileSync(path, "utf8").includes(needle)) {
    fails.push(`${rel} must contain "${needle}" — ${why}`);
  }
}

// §19 — installable PWA + icon set
mustExist("app/manifest.ts", "web manifest makes the app installable (§19.2)");
mustExist("app/icon.svg", "SVG tab favicon (§19.1)");
mustExist("app/favicon.ico", "favicon fallback (§19.1)");
mustExist("app/apple-icon.png", "iOS home-screen icon (§19.1)");
mustExist("public/icon-192.png", "maskable PWA icon (§19.2)");
mustExist("public/icon-512.png", "maskable PWA icon — installability needs a 512 (§19.2)");
mustContain("components/InstallPrompt.tsx", "beforeinstallprompt", "install affordance (§19.2)");
mustContain("app/page.tsx", "InstallPrompt", "install affordance must be mounted on the primary surface (§19.2)");

// §8.5 — Vercel Analytics + §8.2 GA4
mustContain("app/layout.tsx", "@vercel/analytics", "Vercel Analytics is a day-one default (§8.5)");
mustContain("app/layout.tsx", "<Analytics", "Vercel <Analytics/> must be mounted in the root layout (§8.5)");
mustContain("app/layout.tsx", "GA4_ID", "GA4 loader (§8.2)");

// §8 — SEO baseline
mustExist("app/sitemap.ts", "sitemap (§8)");
mustExist("app/robots.ts", "robots (§8)");
mustContain("app/page.tsx", "application/ld+json", "JSON-LD structured data (§8)");
mustContain("app/robots.ts", "APP_BASE_URL", "env-driven base URL (§8)");

// §15 — platform gotchas this project is exposed to
mustContain("lib/kv/index.ts", "KV_REST_API_URL", "accept the Vercel Upstash env names, not just legacy (§15)");

if (fails.length) {
  console.error("launch:check — missing launch deliverables:");
  for (const f of fails) console.error(`  - ${f}`);
  console.error(`\n${fails.length} item(s) missing. See harness §4.7 / Appendix A step 10.`);
  process.exit(1);
}
console.log("launch:check: OK");
