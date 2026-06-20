import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import { ColorModel } from "./ColorModel.js";
import { TEST_COLORS } from "../test/fixtures.js";

const model = new ColorModel(TEST_COLORS);
const names = (cs: Color[]) => cs.map((c) => c.name);
const sorted = (cs: Color[]) => names(cs).sort();

describe("ColorModel construction + indexes", () => {
  it("excludes archived/ignored colors", () => {
    expect(model.getActiveColors()).toHaveLength(8);
    expect(names(model.getActiveColors())).not.toContain("Archived One");
  });

  it("indexes colors by canonical slug, one per active color", () => {
    expect(model.getAllSlugs()).toHaveLength(8);
    expect(model.getColorBySlug("sw-6258-tricorn-black")?.name).toBe(
      "Tricorn Black",
    );
    expect(model.getColorBySlug("nope")).toBeUndefined();
  });

  it("orders families by priority then alphabetically", () => {
    expect(model.getOrderedFamilies()).toEqual([
      "Red",
      "Yellow",
      "Green",
      "Blue",
      "Neutral",
    ]);
  });

  it("lists non-designer collections, sorted", () => {
    expect(model.getCollectionNames()).toEqual(["Timeless Color"]);
  });

  it("flags designer picks", () => {
    expect(model.isDesignerPick("accessible")).toBe(true);
    expect(model.isDesignerPick("tricorn")).toBe(false);
  });
});

describe("getFilteredColors — facets", () => {
  it("returns all active colors in family order with no criteria", () => {
    expect(names(model.getFilteredColors({}))).toEqual([
      "Cherry Tomato", // Red
      "Forsythia", // Yellow
      "Quietude", // Green
      "Naval", // Blue
      "Tradewind", // Blue
      "Accessible Beige", // Neutral
      "Repose Gray",
      "Tricorn Black",
    ]);
  });

  it("matches search against name / number / description", () => {
    expect(names(model.getFilteredColors({ search: "naval" }))).toEqual([
      "Naval",
    ]);
    expect(names(model.getFilteredColors({ search: "6258" }))).toEqual([
      "Tricorn Black",
    ]);
  });

  it("filters by family", () => {
    expect(names(model.getFilteredColors({ families: ["Blue"] }))).toEqual([
      "Naval",
      "Tradewind",
    ]);
  });

  it("filters by undertone", () => {
    expect(sorted(model.getFilteredColors({ undertones: ["Cool"] }))).toEqual([
      "Naval",
      "Quietude",
      "Tradewind",
    ]);
    expect(
      sorted(model.getFilteredColors({ undertones: ["Neutral"] })),
    ).toEqual(["Repose Gray", "Tricorn Black"]);
  });

  it("filters by lightness band", () => {
    expect(sorted(model.getFilteredColors({ lightness: ["Dark"] }))).toEqual([
      "Cherry Tomato",
      "Naval",
      "Tricorn Black",
    ]);
    expect(names(model.getFilteredColors({ lightness: ["Light"] }))).toEqual([
      "Forsythia",
    ]);
  });

  it("filters by neutrality band", () => {
    expect(sorted(model.getFilteredColors({ neutrality: ["High"] }))).toEqual([
      "Accessible Beige",
      "Repose Gray",
      "Tricorn Black",
    ]);
    expect(sorted(model.getFilteredColors({ neutrality: ["Low"] }))).toEqual([
      "Cherry Tomato",
      "Forsythia",
    ]);
  });

  it("filters by use type", () => {
    const ext = model.getFilteredColors({ useType: "exterior" });
    expect(names(ext)).not.toContain("Naval"); // interior-only
    expect(names(ext)).toContain("Forsythia");
  });

  it("filters by collection membership and designer picks", () => {
    expect(
      sorted(model.getFilteredColors({ collections: ["Timeless Color"] })),
    ).toEqual(["Accessible Beige", "Repose Gray"]);
    expect(names(model.getFilteredColors({ designerOnly: true }))).toEqual([
      "Accessible Beige",
    ]);
  });

  it("respects favorites / hidden / all views", () => {
    const favs = new Set(["cherry"]);
    const hidden = new Set(["naval"]);
    expect(
      names(model.getFilteredColors({ view: "favorites" }, favs, hidden)),
    ).toEqual(["Cherry Tomato"]);
    expect(
      names(model.getFilteredColors({ view: "hidden" }, favs, hidden)),
    ).toEqual(["Naval"]);
    expect(
      model
        .getFilteredColors({ view: "all" }, favs, hidden)
        .every((c) => c.id !== "naval"),
    ).toBe(true);
  });

  it("combines facets (AND across facet types)", () => {
    expect(
      names(
        model.getFilteredColors({ families: ["Red"], lightness: ["Dark"] }),
      ),
    ).toEqual(["Cherry Tomato"]);
  });
});

describe("getFilteredColors — sorting", () => {
  it("sorts by name", () => {
    expect(names(model.getFilteredColors({ sort: "name" }))[0]).toBe(
      "Accessible Beige",
    );
  });

  it("sorts by lrv ascending/descending", () => {
    const asc = names(model.getFilteredColors({ sort: "lrv-asc" }));
    expect(asc[0]).toBe("Tricorn Black"); // lrv 3
    expect(asc[asc.length - 1]).toBe("Forsythia"); // lrv 78
  });

  it("sorts by neutrality (most neutral / most colorful first)", () => {
    const high = names(model.getFilteredColors({ sort: "neutral-high" }));
    expect(high[0]).toBe("Tricorn Black");
    expect(high[high.length - 1]).toBe("Forsythia");
    const low = names(model.getFilteredColors({ sort: "neutral-low" }));
    expect(low[0]).toBe("Forsythia");
  });

  it("does not mutate the input order", () => {
    const before = names(model.getActiveColors());
    model.getFilteredColors({ sort: "name" });
    expect(names(model.getActiveColors())).toEqual(before);
  });
});
