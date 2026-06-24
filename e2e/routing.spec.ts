import { test, expect } from "@playwright/test";

test("serves the gallery for the base path without a trailing slash", async ({
  page,
}) => {
  await page.goto("http://localhost:4173/sw-color-tester");
  await expect(page).toHaveURL(/\/sw-color-tester\/$/);
  await expect(
    page.getByRole("link", { name: /See color details/ }).first(),
  ).toBeVisible();
});

test("first Tab focuses the skip link", async ({ page }) => {
  await page.goto("");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(
    () => document.activeElement?.textContent?.trim() ?? "",
  );
  expect(focused).toMatch(/skip/i);
});
