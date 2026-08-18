import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

import { AUTH_STATE_PATH } from "@/tests/e2e/auth-state";

loadEnv({ path: [".env.test.local", ".env.local", ".env"] });

const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl ?? "http://localhost:3000";
const testDatabaseEnv = process.env.TEST_DATABASE_URL
  ? {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      ...(process.env.TEST_DATABASE_URL_UNPOOLED
        ? { DATABASE_URL_UNPOOLED: process.env.TEST_DATABASE_URL_UNPOOLED }
        : {}),
    }
  : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Authenticated specs share one seeded learner, so mutations must stay serial.
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "public-chromium",
      testMatch: /public-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated-chromium",
      testIgnore: [/public-.*\.spec\.ts/, /.*\.setup\.ts/],
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STATE_PATH,
      },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: process.env.CI
          ? "npm run build && npm run start"
          : "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: testDatabaseEnv,
      },
});
