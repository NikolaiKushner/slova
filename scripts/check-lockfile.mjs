#!/usr/bin/env node
/**
 * CI (Node 22) ships npm 10. Local machines often have npm 11, which writes a
 * lockfile that npm 10's `npm ci` rejects — last time it was
 * `@swc/helpers@0.5.23` as an optional peer of `@swc/core`. This check runs
 * `npm ci --dry-run` under npm 10, so a green commit is a green CI install.
 */

import { spawnSync } from "node:child_process";

const local = spawnSync("npm", ["--version"], { encoding: "utf8" });
if (local.status !== 0) {
  process.stderr.write(local.stderr || "npm is not on PATH\n");
  process.exit(local.status ?? 1);
}

const version = local.stdout.trim();
const args = ["ci", "--dry-run", "--ignore-scripts"];
const useNpm10 = !version.startsWith("10.");
const cmd = useNpm10 ? "npx" : "npm";
const cmdArgs = useNpm10 ? ["--yes", "npm@10.9.9", ...args] : args;

process.stdout.write(
  `check:lockfile — local npm ${version}` +
    (useNpm10 ? ", verifying with npm 10.9.9\n" : "\n"),
);

const result = spawnSync(cmd, cmdArgs, { stdio: "inherit" });
process.exit(result.status ?? 1);
