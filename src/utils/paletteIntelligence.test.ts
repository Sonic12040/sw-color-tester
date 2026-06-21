import { describe, it, expect } from "vitest";
import { TEST_COLORS } from "../test/fixtures.js";
import {
  schemeFromColor,
  suggestCompanions,
  assignRoles,
  SCHEME_TYPES,
} from "./paletteIntelligence.js";

// Active catalog (ColorModel filters archived, but the fixtures' archived entry
// has no usable channels — exclude it the same way for honest scheme/companion math).
const CATALOG = TEST_COLORS.filter((c) => !c.archived);
const byId = (id: string) => CATALOG.find((c) => c.id === id)!;

describe("schemeFromColor", () => {
  it("returns real catalog colors, never the base, for a colorful base", () => {
    const cherry = byId("cherry"); // saturated red
    for (const type of SCHEME_TYPES) {
      const result = schemeFromColor(cherry, type, CATALOG);
      expect(result.every((c) => CATALOG.includes(c))).toBe(true);
      expect(result.some((c) => c.id === cherry.id)).toBe(false);
      // No duplicates within a scheme.
      expect(new Set(result.map((c) => c.id)).size).toBe(result.length);
    }
  });

  it("skips hue-based schemes for a near-neutral base but allows monochromatic", () => {
    const tricorn = byId("tricorn"); // saturation 0.01 → near-neutral
    expect(schemeFromColor(tricorn, "complementary", CATALOG)).toEqual([]);
    expect(schemeFromColor(tricorn, "analogous", CATALOG)).toEqual([]);
    // Monochromatic varies lightness, so it still returns matches.
    expect(
      schemeFromColor(tricorn, "monochromatic", CATALOG).length,
    ).toBeGreaterThan(0);
  });

  it("picks an opposing hue for a complementary scheme", () => {
    // Naval is blue (hue 0.58); its complement is warm (orange/red ~0.08).
    const naval = byId("naval");
    const [first] = schemeFromColor(naval, "complementary", CATALOG);
    expect(first).toBeDefined();
    // The match should be warmer than the cool base.
    expect(first.id).not.toBe(naval.id);
  });
});

describe("suggestCompanions", () => {
  it("never suggests palette members and is deterministic", () => {
    const palette = [byId("naval"), byId("tradewind")];
    const a = suggestCompanions(palette, CATALOG, 3);
    const b = suggestCompanions(palette, CATALOG, 3);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect(a.some((c) => c.id === "naval" || c.id === "tradewind")).toBe(false);
    expect(a.length).toBeLessThanOrEqual(3);
  });

  it("suggests a colorful accent for an all-neutral palette", () => {
    const neutrals = [byId("tricorn"), byId("repose"), byId("accessible")];
    const [top] = suggestCompanions(neutrals, CATALOG, 1);
    // Cherry/Forsythia are the only Low-neutrality (colorful) options.
    expect(["cherry", "forsythia"]).toContain(top.id);
  });

  it("returns nothing for an empty palette", () => {
    expect(suggestCompanions([], CATALOG)).toEqual([]);
  });
});

describe("assignRoles", () => {
  it("makes the calmest color Dominant and the most colorful Accent", () => {
    // repose (neutral, light) vs cherry (colorful) vs tradewind (mid).
    const colors = [byId("cherry"), byId("repose"), byId("tradewind")];
    const roles = assignRoles(colors);
    const roleOf = (id: string) => roles.find((r) => r.id === id)!.role;
    expect(roleOf("repose")).toBe("Dominant");
    expect(roleOf("cherry")).toBe("Accent");
    expect(roleOf("tradewind")).toBe("Secondary");
  });

  it("produces proportions that sum to 100", () => {
    const colors = [byId("cherry"), byId("repose"), byId("tradewind")];
    const sum = assignRoles(colors).reduce((s, r) => s + r.proportion, 0);
    expect(sum).toBe(100);
  });

  it("honors a manual role override", () => {
    const colors = [byId("cherry"), byId("repose")];
    const roles = assignRoles(colors, { cherry: "Dominant" });
    expect(roles.find((r) => r.id === "cherry")!.role).toBe("Dominant");
    expect(roles.reduce((s, r) => s + r.proportion, 0)).toBe(100);
  });

  it("assigns a single color 100% Dominant", () => {
    const roles = assignRoles([byId("repose")]);
    expect(roles).toEqual([
      { id: "repose", role: "Dominant", proportion: 100 },
    ]);
  });

  it("returns [] for an empty palette", () => {
    expect(assignRoles([])).toEqual([]);
  });
});
