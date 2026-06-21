import { test, expect, type Page } from "@playwright/test";

/** Fail if the document scrolls horizontally (a layout-overflow regression). */
async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow (px)").toBeLessThanOrEqual(2);
}

test("gallery loads, lays out, filters, and reaches detail + compare", async ({
  page,
}) => {
  const rail = (page.viewportSize()?.width ?? 0) >= 1024;

  // 1. Gallery renders with a live count.
  await page.goto("");
  await expect(page.getByText(/\d[\d,]* of /).first()).toBeVisible();
  await expectNoOverflow(page);

  // 2. Layout + 3. faceting: persistent rail (≥1024) filters via a chip;
  //    below it, prove the drawer opens/closes, then filter via search.
  const filtersBtn = page.getByRole("button", { name: "Open filters" });
  if (rail) {
    await expect(filtersBtn).toBeHidden();
    await page.getByRole("checkbox", { name: "Red", exact: true }).check();
  } else {
    await expect(filtersBtn).toBeVisible();
    await filtersBtn.click();
    const done = page.getByRole("button", { name: "Done" });
    await expect(done).toBeVisible();
    await done.click();
    await page.getByLabel("Search colors").fill("white");
  }
  await expect(page.getByText(/\d[\d,]* of /).first()).toBeVisible();

  // 4. Color detail: h1 + JSON-LD.
  await page
    .getByRole("link", { name: /See color details/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/colors\//);
  await expect(page.locator("h1").first()).toBeVisible();
  expect(
    await page.locator('script[type="application/ld+json"]').count(),
  ).toBeGreaterThan(0);
  await expectNoOverflow(page);

  // 5. Compare: add from detail, open the compare page.
  const addCompare = page.getByRole("button", { name: /Add to compare/ });
  if (await addCompare.isVisible()) {
    await addCompare.click();
    await page.goto("compare");
    await expect(
      page.getByRole("heading", { name: "Compare colors" }),
    ).toBeVisible();
    await expectNoOverflow(page);
  }
});
