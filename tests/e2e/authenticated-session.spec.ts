import { expect, test } from "@playwright/test";

test("the saved credentials session opens a protected page", async ({ page }) => {
  await page.goto("/practice");

  await expect(page).toHaveURL(/\/practice$/);
  await expect(
    page.getByRole("heading", { name: /^(Trainings|Тренировки)$/ }),
  ).toBeVisible();
});
