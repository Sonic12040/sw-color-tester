import { test, expect } from "@playwright/test";
import { colorSlugs } from "./helpers";

test.describe("palette build + export", () => {
  test("loads a shared palette and downloads PDF + PNG", async ({ page }) => {
    const [a, b] = colorSlugs(2);
    await page.goto(`palette?c=${a},${b}`);
    await page.getByRole("button", { name: /Load shared palette/ }).click();
    await expect(
      page.getByRole("heading", { name: "My palette" }),
    ).toBeVisible();

    // Real browser export paths (pdf-lib / canvas.toBlob) — only mocked in unit.
    const [pdf] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export PDF" }).click(),
    ]);
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);

    const [png] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export PNG" }).click(),
    ]);
    expect(png.suggestedFilename()).toMatch(/\.png$/);
  });

  test("copies a share link to the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const [a, b] = colorSlugs(2);
    await page.goto(`palette?c=${a},${b}`);
    await page.getByRole("button", { name: /Load shared palette/ }).click();
    await page.getByRole("button", { name: "Copy share link" }).click();
    await expect(page.getByText(/Share link copied/)).toBeVisible();
  });
});

test("field mode: build a work order, check off offline, look up by SW number", async ({
  page,
  context,
}) => {
  const [a] = colorSlugs(1);
  await page.goto(`palette?c=${a}`);
  await page.getByRole("button", { name: /Load shared palette/ }).click();
  await page.getByRole("button", { name: "Work Order" }).click();
  await page.getByRole("button", { name: "Add room" }).click();
  await page.getByRole("button", { name: "Add surface" }).click();

  // Assign the one palette color + an area so the surface is real.
  const optionText =
    (await page
      .getByLabel(/^Color for/)
      .locator("option")
      .nth(1)
      .textContent()) ?? "";
  const swNumber = optionText.match(/SW (\d+)/)?.[1] ?? "";
  await page.getByLabel(/^Color for/).selectOption({ index: 1 });
  await page.getByLabel(/^Area for/).fill("200");

  await page.getByRole("button", { name: "Field mode" }).click();
  await expect(
    page.getByRole("button", { name: "Exit field mode" }),
  ).toBeVisible();

  // Check-offs are local-first — they work with no network.
  await context.setOffline(true);
  await expect(page.getByText(/0\/1 surfaces done/)).toBeVisible();
  await page.getByLabel(/^Mark .* done$/).check();
  await expect(page.getByText(/1\/1 surfaces done · 100%/)).toBeVisible();
  await context.setOffline(false);

  // Jump to the assigned color by its SW number.
  await page.getByLabel("Look up a color by SW number").fill(swNumber);
  await page.getByRole("button", { name: "Go" }).click();
  await expect(page).toHaveURL(new RegExp(`/colors/sw-${swNumber}-`));
});

test("generates a scheme from a color and adds it to the palette", async ({
  page,
}) => {
  const [a] = colorSlugs(1);
  await page.goto(`colors/${a}`);
  // Monochromatic works for any base (it varies lightness), so this is robust
  // regardless of which color is first in the dataset.
  await page.getByLabel("Scheme type").selectOption("monochromatic");
  await page.getByRole("button", { name: "Add all to palette" }).click();
  await expect(page.getByText(/Added \d+ to palette/)).toBeVisible();

  await page.goto("palette");
  await expect(page.getByRole("heading", { name: "My palette" })).toBeVisible();
  await expect(
    page.getByRole("list").getByRole("listitem").first(),
  ).toBeVisible();
});

test("copies the hex code from a color page", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const [a] = colorSlugs(1);
  await page.goto(`colors/${a}`);
  await page.getByRole("button", { name: "Copy Code" }).click();
  await expect(page.getByText(/^Copied #/)).toBeVisible();
});

test("persists the chosen sort across a reload", async ({ page }) => {
  await page.goto("");
  await page.getByLabel("Sort colors").selectOption("name");
  await page.reload();
  await expect(page.getByLabel("Sort colors")).toHaveValue("name");
});

test("renders NotFound (noindex) for a bogus color slug", async ({ page }) => {
  // SPA fallback: an unprerendered path boots index.html and the client router
  // resolves the unknown slug to the NotFound view.
  await page.goto("colors/sw-9999-definitely-not-real");
  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
});
