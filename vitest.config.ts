import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Three projects, run by name:
//   • unit         — pure logic, Node env, no DOM (fast). `vitest --project unit`
//   • integration  — components/hooks/flows, jsdom env + RTL setup.
//   • build-output — asserts the prerendered dist/ (SEO, OG). Runs only AFTER a
//     build, so it's excluded from the default `npm test` (see package.json).
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          // Pure `.ts` logic. `.tsx` (React) and DOM-touching specs live in the
          // integration project; carve out the few `.ts` specs that need a DOM.
          include: ["src/**/*.test.ts"],
          exclude: [
            "src/hooks/**",
            "src/utils/ExportService.test.ts",
            "src/test/build-output.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          css: { modules: { classNameStrategy: "non-scoped" } },
          include: [
            "src/**/*.test.tsx",
            "src/hooks/**/*.test.{ts,tsx}",
            "src/utils/ExportService.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "build-output",
          environment: "node",
          include: ["src/test/build-output.test.ts"],
        },
      },
    ],
  },
});
