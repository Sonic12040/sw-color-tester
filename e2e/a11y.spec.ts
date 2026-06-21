import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { colorSlugs } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Assert no serious/critical axe violations on the current page state. */
async function expectNoSeriousAxe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    .analyze();
  const serious = violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    serious,
    serious.map((v) => `${v.id}: ${v.help}`).join("\n"),
  ).toHaveLength(0);
}

// Scanning the full gallery (~1.7k tiles) with axe is slow — raise the timeout
// for every test in this file.
test.describe.configure({ timeout: 120_000 });

test("gallery has no serious axe violations", async ({ page }) => {
  await page.goto("");
  await expect(page.getByText(/\d[\d,]* of /).first()).toBeVisible();
  await expectNoSeriousAxe(page);
});

test("palette workspace (with colors + companions) is accessible", async ({
  page,
}) => {
  const [a, b] = colorSlugs(2);
  await page.goto(`palette?c=${a},${b}`);
  await page.getByRole("button", { name: /Load shared palette/ }).click();
  await page.getByRole("button", { name: "Suggest companions" }).click();
  await expect(
    page.getByRole("heading", { name: "Suggested companions" }),
  ).toBeVisible();
  await expectNoSeriousAxe(page);
});

test("compare workspace (with the contrast matrix) is accessible", async ({
  page,
}) => {
  const [a, b] = colorSlugs(2);
  for (const slug of [a, b]) {
    await page.goto(`colors/${slug}`);
    await page.getByRole("button", { name: "Add to compare" }).click();
  }
  await page.goto("compare");
  await expect(
    page.getByRole("heading", { name: "Contrast pairings" }),
  ).toBeVisible();
  await expectNoSeriousAxe(page);
});
