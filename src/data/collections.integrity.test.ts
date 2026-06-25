import { describe, it, expect } from "vitest";
import { colorData } from "./palette.js";
import { CURATED_COLLECTIONS } from "./collections.js";

/**
 * Authoring guard for the editorial content model (E12, US12.2): every curated
 * collection must reference real, active SW numbers, have a unique kebab-case
 * slug, and (if a hero is named) feature that hero. A regenerated dataset or a
 * typo'd number is caught here rather than producing a half-empty landing page.
 */
const byNumber = new Map(
  colorData
    .filter((c) => !c.archived && !c.ignore)
    .map((c) => [c.colorNumber, c]),
);

describe("curated collections content", () => {
  it("has unique, kebab-case slugs", () => {
    const slugs = CURATED_COLLECTIONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("references only SW numbers that resolve to active colors", () => {
    for (const c of CURATED_COLLECTIONS) {
      expect(c.colorNumbers.length).toBeGreaterThan(0);
      for (const n of c.colorNumbers) {
        expect(byNumber.has(n), `${c.slug}: unknown SW ${n}`).toBe(true);
      }
    }
  });

  it("names a hero that is one of the featured colors (when set)", () => {
    for (const c of CURATED_COLLECTIONS) {
      if (c.heroNumber) {
        expect(
          c.colorNumbers.includes(c.heroNumber),
          `${c.slug}: hero SW ${c.heroNumber} not in colorNumbers`,
        ).toBe(true);
      }
    }
  });

  it("has a non-empty title + blurb for SEO", () => {
    for (const c of CURATED_COLLECTIONS) {
      expect(c.title.trim().length).toBeGreaterThan(0);
      expect(c.blurb.trim().length).toBeGreaterThan(20);
    }
  });
});
