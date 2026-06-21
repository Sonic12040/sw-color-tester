import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist", "dist-server", "coverage", "src/data/palette.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Node scripts (prerender, bundle check).
  {
    files: ["**/*.mjs", "scripts/**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // We intentionally colocate each context + provider + hook in one file, which
      // this (dev-only fast-refresh) rule discourages. The pattern is deliberate.
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Test + e2e files also touch Node APIs (fs, process) — Playwright specs and
  // the build-output / index-shell checks read the filesystem.
  {
    files: [
      "**/*.test.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
      "e2e/**/*.ts",
      "playwright.config.ts",
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  // Must be last: turns off stylistic rules that conflict with Prettier.
  prettier,
);
