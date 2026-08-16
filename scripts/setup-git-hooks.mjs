#!/usr/bin/env node
/**
 * Point this clone at `.githooks/` so `pre-commit` runs. Skips quietly when
 * we are not in a git checkout (Vercel, `npm ci` in CI).
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync(".git")) process.exit(0);

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    stdio: "ignore",
  });
} catch {
  // Not fatal: a read-only checkout or a missing git binary.
}
