import { defineConfig, devices } from "@playwright/test";

// The built app is served by `vite preview` under the deploy base path.
const BASE_URL = "http://localhost:4173/sw-color-tester/";
const desktop = devices["Desktop Chrome"];

/**
 * Playwright Test config for the Color Atlas e2e suite.
 *
 * - `responsive.spec.ts` runs across the device matrix below.
 * - `a11y` / `routing` / `flows` specs run once, on the Desktop project.
 * - `webServer` builds-and-serves expectations: run `npm run build` first
 *   (`test:e2e:ci` does), then this starts `vite preview` and tears it down.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "vite preview --port 4173 --strictPort",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    // Responsive matrix — chromium-emulated at each profile's viewport (matching
    // the prior device suite). Rail vs. drawer is decided in-test from the
    // viewport width (≥1024 = persistent rail).
    {
      name: "iPhone",
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...desktop,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
    {
      name: "Pixel",
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...desktop,
        viewport: { width: 412, height: 915 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2.625,
      },
    },
    {
      name: "iPad-portrait",
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...desktop,
        viewport: { width: 820, height: 1180 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "iPad-landscape",
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...desktop,
        viewport: { width: 1180, height: 820 },
        deviceScaleFactor: 2,
      },
    },
    {
      name: "UltraHD",
      testMatch: /responsive\.spec\.ts/,
      use: { ...desktop, viewport: { width: 3840, height: 2160 } },
    },
    // Desktop runs the full suite (responsive + a11y + routing + flows).
    {
      name: "Desktop",
      use: { ...desktop, viewport: { width: 1440, height: 900 } },
    },
  ],
});
