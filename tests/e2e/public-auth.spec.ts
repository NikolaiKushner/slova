import { expect, test } from "@playwright/test";

test("the credentials sign-in form is reachable", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: /^(Sign in|Войти)$/ }),
  ).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test("unknown routes use the branded not-found page", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: /^(Page not found|Страница не найдена)$/ }),
  ).toBeVisible();
});

test("the development kit is unavailable in production", async ({ page }) => {
  test.skip(!process.env.CI, "The local Playwright server runs in development");

  const response = await page.goto("/dev/kit");
  expect(response?.status()).toBe(404);
});
