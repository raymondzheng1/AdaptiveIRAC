#!/usr/bin/env node
// Drift defence: a Citation can never exist without a pinpoint, and the
// renderer must surface it. Pins the "every rendered citation carries a
// pinpoint" invariant (TECHNICAL_SPEC §7).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let failures = 0;

function check(file, needle, why) {
  const path = join(ROOT, file);
  if (!existsSync(path)) {
    console.error(`citation-format: missing ${file}`);
    failures++;
    return;
  }
  if (!readFileSync(path, "utf8").includes(needle)) {
    console.error(`citation-format: ${file} — ${why} (expected: ${needle})`);
    failures++;
  }
}

// The schema must require a non-empty pinpoint on every citation.
check(
  "lib/schemas/practice.ts",
  "pinpoint: z.string().min(1)",
  "Citation.pinpoint must be required and non-empty",
);

// The verifier must run a pinpoint-binding gate.
check("lib/verification/index.ts", '"pinpoint-binding"', "verifier must include the pinpoint-binding gate");

// The presentation layer must bind each citation's pinpoint into its source.
check("components/answer/transform.ts", "pinpoint", "citation source must carry the pinpoint");
// The source panel must surface the pinpoint (rendered as the corpus location).
check("components/answer/SourcePanel.tsx", "where", "source panel must show the pinpoint location");

if (failures) {
  console.error(`\ncitation-format: ${failures} violation(s).`);
  process.exit(1);
}
console.log("citation-format: OK");
