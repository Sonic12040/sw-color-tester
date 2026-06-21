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

// axe + page setup can be slow on CI — give these headroom over the 30s default.
test.describe.configure({ timeout: 60_000 });

test("gallery (chrome + a tile) has no serious axe violations", async ({
  page,
}) => {
  // Scanning all ~1.7k tiles times out and is redundant — every tile is the same
  // ColorCard (no per-tile DOM ids). Narrow to a handful via search so axe still
  // covers the full chrome (header, toolbar, rail, active filters) + a real tile.
  const term = colorSlugs(1)[0].split("-").slice(2).join(" ");
  await page.goto("");
  await page.getByLabel("Search colors").fill(term);
  await expect(page.getByText(/\d[\d,]* of /).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: /See color details/ }).first(),
  ).toBeVisible();
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

test("color detail page is accessible", async ({ page }) => {
  const [slug] = colorSlugs(1);
  await page.goto(`colors/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
