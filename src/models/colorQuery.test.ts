import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import { TEST_COLORS } from "../test/fixtures.js";
import { orderFamilies, queryColors, sortColors } from "./colorQuery.js";

// Active colors only (the pure functions don't filter archived — ColorModel does).
const ACTIVE = TEST_COLORS.filter((c) => !c.archived && !c.ignore);
const names = (cs: Color[]) => cs.map((c) => c.name);

describe("orderFamilies", () => {
  it("orders by configured priority then alphabetically", () => {
    expect(
      orderFamilies(["Neutral", "Blue", "Red", "Yellow", "Green"]),
    ).toEqual(["Red", "Yellow", "Green", "Blue", "Neutral"]);
  });

  it("pushes unknown families to the end, sorted", () => {
    expect(orderFamilies(["Zebra", "Blue", "Aardvark"])).toEqual([
      "Blue",
      "Aardvark",
      "Zebra",
    ]);
  });
});

describe("queryColors", () => {
  it("returns a fresh array and never mutates the input", () => {
    const input = [...ACTIVE];
    const before = names(input);
    const out = queryColors(input, { sort: "name" });
    expect(out).not.toBe(input);
    expect(names(input)).toEqual(before);
  });

  it("filters by facet and honors the designerPickIds context", () => {
    const designerPickIds = new Set(["accessible"]);
    expect(names(queryColors(ACTIVE, { designerOnly: true }))).toEqual([]);
    expect(
      names(queryColors(ACTIVE, { designerOnly: true }, { designerPickIds })),
    ).toEqual(["Accessible Beige"]);
  });

  it("draws the base set from the view + favorites/hidden context", () => {
    const favorites = new Set(["cherry"]);
    const hidden = new Set(["naval"]);
    expect(
      names(queryColors(ACTIVE, { view: "favorites" }, { favorites, hidden })),
    ).toEqual(["Cherry Tomato"]);
    expect(
      queryColors(ACTIVE, { view: "all" }, { favorites, hidden }).some(
        (c) => c.id === "naval",
      ),
    ).toBe(false);
  });
});

describe("sortColors", () => {
  it("sorts by lrv ascending without mutating input", () => {
    const input = [...ACTIVE];
    const out = sortColors(input, "lrv-asc");
    expect(names(out)[0]).toBe("Tricorn Black");
    expect(out).not.toBe(input);
  });

  it("sorts most-neutral first for neutral-high", () => {
    expect(names(sortColors(ACTIVE, "neutral-high"))[0]).toBe("Tricorn Black");
  });
});
