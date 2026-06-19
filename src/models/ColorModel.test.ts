import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import { ColorModel } from "./ColorModel.js";

/** Build a Color with sensible defaults overridden per test. */
function c(over: Partial<Color>): Color {
  return {
    id: "id",
    name: "Name",
    colorNumber: "0000",
    brandKey: "SW",
    hex: "#888888",
    red: 136,
    green: 136,
    blue: 136,
    hue: 0,
    saturation: 0.8,
    lightness: 0.5,
    lrv: 50,
    isDark: false,
    isInterior: false,
    isExterior: false,
    colorFamilyNames: ["Red"],
    brandedCollectionNames: [],
    similarColors: [],
    description: [],
    ...over,
  };
}

// Crimson(Dark/Warm/int), Ruby(Light/Warm/ext), Azure(Medium/Cool/int, Blue),
// Greige(Medium/Neutral/int+ext, Neutral, Historic Color),
// DesignerRed(Medium/Warm, designer pick + High Voltage), Archived(filtered out).
const DATA: Color[] = [
  c({
    id: "r1",
    name: "Crimson",
    colorNumber: "1001",
    lrv: 10,
    hue: 0,
    saturation: 0.8,
    isInterior: true,
  }),
  c({
    id: "r2",
    name: "Ruby",
    colorNumber: "1003",
    lrv: 90,
    hue: 0.99,
    saturation: 0.8,
    isExterior: true,
  }),
  c({
    id: "b1",
    name: "Azure",
    colorNumber: "2001",
    lrv: 55,
    hue: 0.6,
    saturation: 0.8,
    colorFamilyNames: ["Blue"],
    isInterior: true,
  }),
  c({
    id: "n1",
    name: "Greige",
    colorNumber: "3001",
    lrv: 50,
    hue: 0.1,
    saturation: 0.03,
    colorFamilyNames: ["Neutral"],
    isInterior: true,
    isExterior: true,
    brandedCollectionNames: ["Historic Color"],
  }),
  c({
    id: "d1",
    name: "Designer Red",
    colorNumber: "1009",
    lrv: 40,
    hue: 0.02,
    saturation: 0.7,
    brandedCollectionNames: [
      "Designer Color Collection - Pottery",
      "High Voltage",
    ],
  }),
  c({ id: "arch", name: "Archived", colorNumber: "9999", archived: true }),
];

const model = new ColorModel(DATA);
const names = (cs: Color[]) => cs.map((x) => x.name);

describe("ColorModel construction + indexes", () => {
  it("excludes archived/ignored colors", () => {
    expect(model.getActiveColors()).toHaveLength(5);
    expect(names(model.getActiveColors())).not.toContain("Archived");
  });

  it("indexes colors by canonical slug, one per active color", () => {
    expect(model.getAllSlugs()).toHaveLength(5);
    expect(model.getColorBySlug("sw-1001-crimson")?.name).toBe("Crimson");
    expect(model.getColorBySlug("nope")).toBeUndefined();
  });

  it("orders families by priority then alphabetically", () => {
    expect(model.getOrderedFamilies()).toEqual(["Red", "Blue", "Neutral"]);
  });

  it("lists non-designer collections, sorted", () => {
    expect(model.getCollectionNames()).toEqual([
      "High Voltage",
      "Historic Color",
    ]);
  });

  it("flags designer picks", () => {
    expect(model.isDesignerPick("d1")).toBe(true);
    expect(model.isDesignerPick("r1")).toBe(false);
  });
});

describe("getFilteredColors — facets", () => {
  it("returns all active colors (family order) with no criteria", () => {
    expect(names(model.getFilteredColors({}))).toEqual([
      "Crimson",
      "Designer Red",
      "Ruby",
      "Azure",
      "Greige",
    ]);
  });

  it("matches search against name / number / description", () => {
    expect(names(model.getFilteredColors({ search: "ruby" }))).toEqual([
      "Ruby",
    ]);
    expect(names(model.getFilteredColors({ search: "2001" }))).toEqual([
      "Azure",
    ]);
  });

  it("filters by family (OR)", () => {
    expect(names(model.getFilteredColors({ families: ["Blue"] }))).toEqual([
      "Azure",
    ]);
  });

  it("filters by undertone", () => {
    expect(names(model.getFilteredColors({ undertones: ["Cool"] }))).toEqual([
      "Azure",
    ]);
    expect(names(model.getFilteredColors({ undertones: ["Neutral"] }))).toEqual(
      ["Greige"],
    );
  });

  it("filters by lightness band", () => {
    expect(names(model.getFilteredColors({ lightness: ["Dark"] }))).toEqual([
      "Crimson",
    ]);
    expect(names(model.getFilteredColors({ lightness: ["Light"] }))).toEqual([
      "Ruby",
    ]);
  });

  it("filters by use type", () => {
    expect(names(model.getFilteredColors({ useType: "exterior" }))).toEqual([
      "Ruby",
      "Greige",
    ]);
  });

  it("filters by collection membership and designer picks", () => {
    expect(
      names(model.getFilteredColors({ collections: ["High Voltage"] })),
    ).toEqual(["Designer Red"]);
    expect(names(model.getFilteredColors({ designerOnly: true }))).toEqual([
      "Designer Red",
    ]);
  });

  it("respects the favorites / hidden / all views", () => {
    const favs = new Set(["r1"]);
    const hidden = new Set(["b1"]);
    expect(
      names(model.getFilteredColors({ view: "favorites" }, favs, hidden)),
    ).toEqual(["Crimson"]);
    expect(
      names(model.getFilteredColors({ view: "hidden" }, favs, hidden)),
    ).toEqual(["Azure"]);
    // "all" excludes hidden.
    expect(
      model
        .getFilteredColors({ view: "all" }, favs, hidden)
        .every((x) => x.id !== "b1"),
    ).toBe(true);
  });

  it("combines facets (AND across facet types)", () => {
    expect(
      names(
        model.getFilteredColors({ families: ["Red"], lightness: ["Dark"] }),
      ),
    ).toEqual(["Crimson"]);
  });
});

describe("getFilteredColors — sorting", () => {
  it("sorts by name, lrv, and hue", () => {
    expect(names(model.getFilteredColors({ sort: "name" }))).toEqual([
      "Azure",
      "Crimson",
      "Designer Red",
      "Greige",
      "Ruby",
    ]);
    expect(names(model.getFilteredColors({ sort: "lrv-asc" }))).toEqual([
      "Crimson",
      "Designer Red",
      "Greige",
      "Azure",
      "Ruby",
    ]);
    expect(names(model.getFilteredColors({ sort: "hue" }))).toEqual([
      "Crimson",
      "Designer Red",
      "Greige",
      "Azure",
      "Ruby",
    ]);
  });

  it("does not mutate the input order", () => {
    const before = names(model.getActiveColors());
    model.getFilteredColors({ sort: "name" });
    expect(names(model.getActiveColors())).toEqual(before);
  });
});
