import { expect, test } from "@playwright/test";

test("the credentials sign-in form is reachable", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: /^(Sign in|Войти)$/ }),
  ).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});
