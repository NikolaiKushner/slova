import { expect, type Locator, type Page, test } from "@playwright/test";

async function focusByTab(page: Page, target: Locator) {
  for (let press = 0; press < 40; press += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
  }

  throw new Error("The target was not reachable with the Tab key");
}

test("a vocabulary choice can be answered and advanced by keyboard", async ({
  page,
}) => {
  await page.goto("/practice/word-translation?state=all");
  const options = page.locator('[data-slot="option-button"]');
  await expect(options.first()).toBeVisible();

  await page.keyboard.press("1");
  await expect(options.first()).toBeDisabled();

  const next = page.getByRole("button", { name: /^(Next|Дальше)$/ });
  await expect(next).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
});

test("a grammar lesson can enter and answer practice without a pointer", async ({
  page,
}) => {
  await page.goto("/courses/grammar/present-simple/forms");

  const start = page.getByRole("button", {
    name: /^(Start practice|Начать практику)/,
  });
  await expect(start).toBeVisible();
  await focusByTab(page, start);
  await page.keyboard.press("Enter");

  const answer = page.locator('[data-slot="focus-answer"]');
  await expect(answer).toBeVisible();
  const options = answer.locator('[data-slot="option-button"]');
  if ((await options.count()) > 0) {
    await page.keyboard.press("1");
    await expect(options.first()).toBeDisabled();
  } else {
    const input = answer.getByRole("textbox");
    await expect(input).toBeFocused();
    await page.keyboard.type("answer");
    await page.keyboard.press("Enter");
    await expect(input).toHaveCount(0);
  }

  await expect(
    page.getByRole("button", { name: /^(Next|Дальше)$/ }),
  ).toBeVisible();
});
