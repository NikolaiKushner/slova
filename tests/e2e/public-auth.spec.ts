import { expect, test } from "@playwright/test";

test("the landing offers stories and depicts the live sidebar", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("heading", {
      name: /^(Familiar words, in connected English\.|Знакомые слова — в связном тексте\.)$/,
    }),
  ).toBeVisible();
  // Derived from content/stories/stories/bus-is-gone.json, not written here.
  await expect(page.getByText("The Bus Is Gone")).toBeAttached();

  // The one <aside> on the page is the mockup's sidebar.
  const shell = page.locator("aside");
  for (const label of [
    /^(Trainings|Тренировки)$/,
    /^(Grammar|Грамматика)$/,
    /^(Stories|Истории)$/,
    /^(My progress|Мой прогресс)$/,
    /^(My words|Мои слова)$/,
    /^(My sets|Мои наборы)$/,
  ]) {
    await expect(shell.getByText(label)).toBeVisible();
  }
  // The Today screen and the Tasks/Courses sections left the app.
  for (const gone of [/^(Today|Сегодня)$/, /^(Tasks|Задания)$/, /^(Courses|Курсы)$/]) {
    await expect(page.getByText(gone)).toHaveCount(0);
  }

  // One unauthenticated next step, at the top and at the close.
  await expect(page.locator('a[href="/register"]')).toHaveCount(2);
  await expect(page.locator('a[href="/login"]')).toHaveCount(2);
});

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
