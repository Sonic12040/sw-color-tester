import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Use raw CSS-module class names (e.g. "overlay") instead of content-hashed
    // ones, so DOM snapshots stay readable and don't churn on CSS-only edits.
    css: { modules: { classNameStrategy: "non-scoped" } },
  },
});
