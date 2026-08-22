import { spawn } from "node:child_process";

import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.test.local", ".env.local", ".env"] });

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  console.error("TEST_DATABASE_URL is required to serve the E2E fixture.");
  process.exit(1);
}

// next dev keeps variables already in the environment, so this wins over .env.
const child = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DATABASE_URL_UNPOOLED:
      process.env.TEST_DATABASE_URL_UNPOOLED ?? databaseUrl,
  },
});
child.on("exit", (code) => process.exit(code ?? 0));
