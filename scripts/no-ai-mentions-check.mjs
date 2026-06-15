#!/usr/bin/env node
// Drift defence: customer-visible copy must NEVER mention AI/LLM/Claude/etc.
// (CLAUDE.md "Don't" — drift-tested). Scans the UI surface (app/ + components/).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components"];
const SCAN_EXT = new Set([".tsx", ".ts", ".mdx"]);

// Whole-word, case-insensitive multi-char terms + case-sensitive bare "AI".
const FORBIDDEN = [
  [/\b(claude|anthropic|openai|chatgpt|gpt-?\d?|llm|copilot)\b/i, "AI/vendor mention in customer copy"],
  [/\b(artificial intelligence|machine learning|language model|neural network|large language)\b/i, "AI terminology in customer copy"],
  [/\bAI\b/, "bare 'AI' in customer copy"],
];

// Lines that are clearly not customer copy.
const SKIP_LINE = /^\s*(\/\/|\*|import |export \* |export \{)/;

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
    if (statSync(full).isDirectory()) {
      // Don't scan API route handlers — server code, not customer copy.
      if (full.includes(join("app", "api"))) continue;
      out.push(...walk(full));
    } else if (SCAN_EXT.has(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

let failures = 0;
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (SKIP_LINE.test(line)) return;
      for (const [re, why] of FORBIDDEN) {
        if (re.test(line)) {
          console.error(`${file}:${i + 1} — ${why}\n  ${line.trim().slice(0, 160)}`);
          failures++;
        }
      }
    });
  }
}

if (failures) {
  console.error(`\nno-ai-mentions: ${failures} violation(s).`);
  process.exit(1);
}
console.log("no-ai-mentions: OK");
