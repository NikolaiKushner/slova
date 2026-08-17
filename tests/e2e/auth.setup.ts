import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test as setup } from "@playwright/test";

import { AUTH_STATE_PATH } from "@/tests/e2e/auth-state";

function credential(name: "E2E_TEST_USER_EMAIL" | "E2E_TEST_USER_PASSWORD") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for authenticated E2E tests.`);
  }
  return value;
}

setup("sign in through the credentials form", async ({ page }) => {
  await page.goto("/login");
  await page
    .locator('input[name="email"]')
    .fill(credential("E2E_TEST_USER_EMAIL"));
  await page
    .locator('input[name="password"]')
    .fill(credential("E2E_TEST_USER_PASSWORD"));

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/practice"),
    page.locator('button[type="submit"]').click(),
  ]);
  await expect(
    page.getByRole("heading", { name: /^(Trainings|Тренировки)$/ }),
  ).toBeVisible();

  await mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
