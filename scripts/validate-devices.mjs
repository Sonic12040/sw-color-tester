// Cross-device validation of the Color Atlas. Drives the built (SSG) app under
// `vite preview` across 6 device profiles, capturing screenshots + functional
// assertions: layout (drawer vs rail), no horizontal overflow, facet filtering,
// color detail (h1 + JSON-LD), and comparison. Also verifies the prerendered
// HTML carries real markup without JS (SEO proof).
//
// Usage: node scripts/validate-devices.mjs  (expects `vite preview` on :4173)
import { chromium, devices } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { readFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4173/sw-color-tester/";
const shotDir = resolve(root, "validation-screenshots");
mkdirSync(shotDir, { recursive: true });

const PROFILES = [
  {
    name: "iPhone",
    viewport: { width: 390, height: 844 },
    dsf: 3,
    mobile: true,
    rail: false,
  },
  {
    name: "Pixel",
    viewport: { width: 412, height: 915 },
    dsf: 2.625,
    mobile: true,
    rail: false,
  },
  {
    name: "iPad-portrait",
    viewport: { width: 820, height: 1180 },
    dsf: 2,
    mobile: true,
    rail: false,
  },
  {
    name: "iPad-landscape",
    viewport: { width: 1180, height: 820 },
    dsf: 2,
    mobile: true,
    rail: true,
  },
  {
    name: "Desktop",
    viewport: { width: 1440, height: 900 },
    dsf: 1,
    mobile: false,
    rail: true,
  },
  {
    name: "UltraHD",
    viewport: { width: 3840, height: 2160 },
    dsf: 1,
    mobile: false,
    rail: true,
  },
];

const results = [];
const fail = (profile, msg) => results.push({ profile, ok: false, msg });
const pass = (profile, msg) => results.push({ profile, ok: true, msg });

async function checkNoOverflow(page, profile) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  if (overflow > 2) fail(profile, `horizontal overflow: ${overflow}px`);
  else pass(profile, "no horizontal overflow");
}

async function run() {
  const browser = await chromium.launch();

  for (const p of PROFILES) {
    const context = await browser.newContext({
      ...devices["Desktop Chrome"],
      viewport: p.viewport,
      deviceScaleFactor: p.dsf,
      isMobile: p.mobile,
      hasTouch: p.mobile,
    });
    const page = await context.newPage();

    try {
      // 1. Gallery loads
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page
        .getByText(/\bof\b/)
        .first()
        .waitFor({ timeout: 15000 });
      await checkNoOverflow(page, p.name);
      await page.screenshot({
        path: resolve(shotDir, `${p.name}-1-gallery.png`),
      });

      // 2. Layout: rail persistent (≥1024) vs Filters button (<1024)
      const filtersBtn = page.getByRole("button", { name: "Open filters" });
      const filtersVisible = await filtersBtn.isVisible();
      if (p.rail && filtersVisible)
        fail(p.name, "Filters button should be hidden at rail breakpoint");
      else if (!p.rail && !filtersVisible)
        fail(p.name, "Filters button should be visible below rail breakpoint");
      else
        pass(
          p.name,
          p.rail
            ? "persistent rail (no Filters button)"
            : "drawer mode (Filters button shown)",
        );

      // 3. Facet filtering. On the rail (desktop/tablet-landscape) click a
      // family chip directly. On mobile, prove the drawer opens + closes, then
      // filter via the always-visible search box (robust, no overlay timing).
      if (p.rail) {
        await page.getByRole("checkbox", { name: "Red", exact: true }).click();
        await page.waitForTimeout(150);
      } else {
        await filtersBtn.click();
        await page.waitForTimeout(350);
        await page.screenshot({
          path: resolve(shotDir, `${p.name}-2-drawer.png`),
        });
        const done = page.getByRole("button", { name: "Done" });
        if (await done.isVisible().catch(() => false)) {
          await done.click();
          pass(p.name, "drawer opens and closes via Done");
        } else {
          fail(p.name, "drawer Done button not visible");
        }
        await page.waitForTimeout(300);
        await page.getByLabel("Search colors").fill("white");
        await page.waitForTimeout(150);
      }
      const countText = await page
        .getByText(/\bof\b/)
        .first()
        .textContent();
      if (countText && /^\s*\d/.test(countText))
        pass(p.name, `filter applied → "${countText.trim()}"`);
      else fail(p.name, "filter produced no count");
      await page.screenshot({
        path: resolve(shotDir, `${p.name}-3-filtered.png`),
      });

      // 4. Color detail page: h1 + JSON-LD present
      await page
        .getByRole("link", { name: /See color details/ })
        .first()
        .click();
      await page.waitForURL(/\/colors\//, { timeout: 10000 });
      await page.locator("h1").first().waitFor();
      const ld = await page
        .locator('script[type="application/ld+json"]')
        .count();
      if (ld > 0) pass(p.name, "detail page has JSON-LD");
      else fail(p.name, "detail page missing JSON-LD");
      await checkNoOverflow(page, p.name);
      await page.screenshot({
        path: resolve(shotDir, `${p.name}-4-detail.png`),
      });

      // 5. Compare: add from detail, open compare page
      const addCompare = page.getByRole("button", { name: /Add to compare/ });
      if (await addCompare.isVisible().catch(() => false)) {
        await addCompare.click();
        await page.goto(`${BASE}compare`, { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: "Compare colors" }).waitFor();
        await checkNoOverflow(page, p.name);
        await page.screenshot({
          path: resolve(shotDir, `${p.name}-5-compare.png`),
        });
        pass(p.name, "compare page renders");
      }
    } catch (err) {
      fail(p.name, `exception: ${err.message}`);
    } finally {
      await context.close();
    }
  }

  // Base path without a trailing slash should still render the gallery
  // (dev/preview redirect + 404.html fallback on static hosts).
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE.replace(/\/$/, ""), { waitUntil: "networkidle" });
    const endsWithSlash = page.url().endsWith("/");
    const count = await page
      .getByText(/\bof\b/)
      .first()
      .textContent()
      .catch(() => null);
    if (endsWithSlash && count && /\d/.test(count))
      pass("no-trailing-slash", `renders gallery (${count.trim()})`);
    else fail("no-trailing-slash", `url=${page.url()} count=${count}`);
    await ctx.close();
  } catch (err) {
    fail("no-trailing-slash", `exception: ${err.message}`);
  }

  // Skip link: the first Tab should land on the skip link.
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() =>
      (document.activeElement?.textContent || "").trim(),
    );
    if (/skip/i.test(focused))
      pass("skip-link", "first Tab focuses the skip link");
    else fail("skip-link", `first Tab focused "${focused}"`);
    await ctx.close();
  } catch (err) {
    fail("skip-link", `exception: ${err.message}`);
  }

  // Automated axe-core scan of the gallery (WCAG 2.0/2.1/2.2 A + AA).
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = result.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    if (serious.length === 0)
      pass("axe", `0 serious/critical (${result.violations.length} minor)`);
    else
      for (const v of serious)
        fail("axe", `${v.id} ×${v.nodes.length} — ${v.help}`);
    await ctx.close();
  } catch (err) {
    fail("axe", `exception: ${err.message}`);
  }

  // Axe scan of the palette workspace — its own light-card surfaces sit on the
  // gray canvas, so it needs its own contrast check (the gallery scan won't cover
  // it). Load a 2-color shared palette and reveal the companions panel so the
  // role badges, role selects, and suggestion text are all in the DOM.
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    const [s1, s2] = readdirSync(resolve(root, "dist", "colors")).slice(0, 2);
    await page.goto(`${BASE}palette?c=${s1},${s2}`, {
      waitUntil: "networkidle",
    });
    const load = page.getByRole("button", { name: /Load shared palette/ });
    if (await load.isVisible().catch(() => false)) await load.click();
    const suggest = page.getByRole("button", { name: "Suggest companions" });
    if (await suggest.isVisible().catch(() => false)) await suggest.click();
    await page.waitForTimeout(150);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = result.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    if (serious.length === 0)
      pass(
        "axe/palette",
        `0 serious/critical (${result.violations.length} minor)`,
      );
    else
      for (const v of serious)
        fail("axe/palette", `${v.id} ×${v.nodes.length} — ${v.help}`);
    await ctx.close();
  } catch (err) {
    fail("axe/palette", `exception: ${err.message}`);
  }

  await browser.close();

  // 6. SEO-without-JS: a prerendered color file has <h1> + JSON-LD on disk
  try {
    const colorsDir = resolve(root, "dist", "colors");
    const sample = readdirSync(colorsDir)[0];
    const html = readFileSync(resolve(colorsDir, sample, "index.html"), "utf8");
    const hasH1 = /<h1[\s>]/.test(html);
    const hasLd = /application\/ld\+json/.test(html);
    const hasTitleInHead = /<head>[\s\S]*?<title>[\s\S]*?<\/head>/.test(html);
    // Plain-language summary (F1) rendered server-side, in body + meta description.
    const hasSummary = /is a (deep|mid-tone|light) (warm|cool|neutral) /.test(
      html,
    );
    const hasSummaryMeta =
      /<meta name="description" content="[^"]*is a (deep|mid-tone|light)/.test(
        html,
      );
    if (hasH1 && hasLd && hasTitleInHead && hasSummary && hasSummaryMeta)
      pass(
        "SEO/static",
        `prerendered ${sample} has h1 + JSON-LD + head <title> + plain-language summary`,
      );
    else
      fail(
        "SEO/static",
        `prerendered markup incomplete (h1:${hasH1} ld:${hasLd} title:${hasTitleInHead} summary:${hasSummary} summaryMeta:${hasSummaryMeta})`,
      );

    // Open Graph image (F4): per-color PNG exists + og:image / twitter:image meta.
    const ogDir = resolve(root, "dist", "og");
    const hasOgFile = existsSync(resolve(ogDir, `${sample}.png`));
    const hasDefaultOg = existsSync(resolve(ogDir, "default.png"));
    const hasOgMeta = new RegExp(
      `<meta property="og:image" content="[^"]*/og/${sample}\\.png"`,
    ).test(html);
    const hasTwitterImg = /<meta name="twitter:image"/.test(html);
    if (hasOgFile && hasDefaultOg && hasOgMeta && hasTwitterImg)
      pass(
        "SEO/og",
        `OG image for ${sample} exists + og:image/twitter:image meta`,
      );
    else
      fail(
        "SEO/og",
        `OG incomplete (file:${hasOgFile} default:${hasDefaultOg} meta:${hasOgMeta} twitter:${hasTwitterImg})`,
      );
  } catch (err) {
    fail("SEO/static", `could not read prerendered file: ${err.message}`);
  }

  // Report
  console.log("\n=== Device validation ===");
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? "PASS" : "FAIL"}  [${r.profile}] ${r.msg}`);
  }
  console.log(
    `\n${results.length - failed}/${results.length} checks passed. Screenshots → validation-screenshots/`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

run();
