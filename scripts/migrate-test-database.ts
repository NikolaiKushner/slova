import { spawn } from "node:child_process";
import path from "node:path";
import { config as loadEnv } from "dotenv";

import { resolveTestDatabaseEnvironment } from "@/scripts/test-user-env";

loadEnv({ path: [".env.test.local", ".env.local", ".env"] });

async function main() {
  const environment = resolveTestDatabaseEnvironment(process.env);
  if (!environment.databaseUrlUnpooled) {
    throw new Error(
      "TEST_DATABASE_URL_UNPOOLED is required for test database migrations.",
    );
  }

  const prismaCli = path.join(
    process.cwd(),
    "node_modules/prisma/build/index.js",
  );
  const child = spawn(process.execPath, [prismaCli, "migrate", "deploy"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: environment.databaseUrl,
      DATABASE_URL_UNPOOLED: environment.databaseUrlUnpooled,
    },
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Prisma migrate exited on signal ${signal}.`));
        return;
      }
      resolve(code ?? 1);
    });
  });
  if (exitCode !== 0) {
    throw new Error(`Prisma migrate deploy exited with code ${exitCode}.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
