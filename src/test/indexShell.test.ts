import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { STORAGE_KEYS } from "../utils/storage.js";

// The shell HTML carries the anti-flash inline script (a build/source artifact,
// not DOM behavior) — assert its presence here in the Node unit project rather
// than from a jsdom integration test.
const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

describe("index.html anti-flash shell", () => {
  it("ships the inline pre-paint script and hiding style", () => {
    expect(indexHtml).toContain("html[data-presort] [data-color-grid]");
    expect(indexHtml).toContain(STORAGE_KEYS.sort);
    expect(indexHtml).toContain("dataset.presort");
  });
});
