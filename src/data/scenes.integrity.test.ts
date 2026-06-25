import { describe, it, expect } from "vitest";
import { SCENES } from "./scenes.js";

/**
 * Authoring guard for the Room Visualizer scenes (E9): unique slugs, sane
 * dimensions, at least one wall to recolor, and every wall rect inside the
 * scene's viewBox (so a typo can't push the paintable region off-canvas).
 */
describe("visualizer scenes content", () => {
  it("has unique, kebab-case slugs and names", () => {
    const slugs = SCENES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of SCENES) {
      expect(s.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(s.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("has positive dimensions and at least one wall", () => {
    for (const s of SCENES) {
      expect(s.width).toBeGreaterThan(0);
      expect(s.height).toBeGreaterThan(0);
      expect(s.walls.length).toBeGreaterThan(0);
      expect(s.foreground.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps every wall rect within the scene bounds", () => {
    for (const s of SCENES) {
      for (const w of s.walls) {
        expect(w.x).toBeGreaterThanOrEqual(0);
        expect(w.y).toBeGreaterThanOrEqual(0);
        expect(w.x + w.w).toBeLessThanOrEqual(s.width);
        expect(w.y + w.h).toBeLessThanOrEqual(s.height);
      }
    }
  });
});
