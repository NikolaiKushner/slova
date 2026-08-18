import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const VIEWPORT_WIDTHS = [390, 768, 834, 1024, 1194] as const;

async function waitForSettledPage(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, {
    timeout: 15_000,
  });
}

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical",
  );
  expect(
    violations,
    JSON.stringify(
      violations.map(({ id, impact, help, nodes }) => ({
        id,
        impact,
        help,
        targets: nodes.map((node) => node.target),
      })),
      null,
      2,
    ),
  ).toEqual([]);
}

for (const width of VIEWPORT_WIDTHS) {
  test(`training has no serious accessibility violations at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/practice/word-translation?state=all");
    await waitForSettledPage(page);
    await expect(page.locator('[data-slot="option-button"]').first()).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  });

  test(`lesson has no serious accessibility violations at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/courses/grammar/present-simple/forms");
    await waitForSettledPage(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  });
}

test("training exposes a useful screen-reader structure", async ({ page }) => {
  await page.goto("/practice/word-translation?state=all");
  await waitForSettledPage(page);

  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAccessibleName(/.+/);
  await expect(page.locator('[data-slot="option-button"]').first()).toHaveAccessibleName(
    /.+/,
  );
  await expect(page.locator('[aria-live="polite"]')).not.toHaveCount(0);
});

test("lesson exposes a useful screen-reader structure", async ({ page }) => {
  await page.goto("/courses/grammar/present-simple/forms");
  await waitForSettledPage(page);

  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAccessibleName(/.+/);
  await expect(
    page.getByRole("button", {
      name: /^(Start practice|Начать практику)/,
    }),
  ).toBeVisible();
});

for (const width of VIEWPORT_WIDTHS) {
  test(`progress has no serious accessibility violations at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/progress");
    await waitForSettledPage(page);
    await expect(
      page.getByRole("heading", { level: 1, name: /^(Your progress|Ваш прогресс)$/ }),
    ).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  });
}

test("progress exposes a useful screen-reader structure", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/progress");
  await waitForSettledPage(page);

  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 1, name: /^(Your progress|Ваш прогресс)$/ }),
  ).toBeVisible();

  const progressNav = page.getByRole("link", {
    name: /^(My progress|Мой прогресс)$/,
  });
  await expect(progressNav).toBeVisible();
  await expect(progressNav).toHaveAttribute("aria-current", "page");

  await expect(page.getByText(/^(Current run|Текущая серия)$/)).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAccessibleName(/.+/);
  await expect(
    page.getByRole("link", {
      name: /^(Open Present Simple course|Открыть курс Простое настоящее)$/,
    }),
  ).toBeVisible();
});

test("progress is absent from the account menu", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/progress");
  await waitForSettledPage(page);

  await page.getByRole("button", { name: /E2E Learner/ }).click();
  await expect(
    page.getByRole("menuitem", { name: /^(Log out|Выйти)$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: /^(My progress|Мой прогресс)$/ }),
  ).toHaveCount(0);
});
