// Vitest global setup. Pin a deterministic environment for tests.
import { beforeEach } from "vitest";

process.env.SESSION_CAP_USD ??= "5";
process.env.GLOBAL_DAILY_BUDGET_USD ??= "50";
// Tests inject an in-memory KV via __setKvForTests; this flag keeps any
// accidental real-KV path from engaging.
process.env.ALLOW_INSECURE_DEV_KV = "true";
(process.env as Record<string, string>).NODE_ENV ??= "test";

beforeEach(() => {
  // Each test file is responsible for injecting its own KV / clock / sender.
});
