import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import { swColorUrl, SW_STORE_LOCATOR_URL, SW_SAMPLES_URL } from "./swLinks.js";

const color = (over: Partial<Color>): Color =>
  ({
    id: "x",
    name: "Cherry Tomato",
    colorNumber: "6864",
    brandKey: "SW",
    hex: "#c83729",
    red: 200,
    green: 55,
    blue: 41,
    hue: 0.01,
    saturation: 0.66,
    lightness: 0.47,
    lrv: 18,
    isDark: true,
    isInterior: true,
    isExterior: true,
    colorFamilyNames: ["Red"],
    brandedCollectionNames: [],
    similarColors: [],
    description: [],
    ...over,
  }) as Color;

describe("swColorUrl", () => {
  it("builds an absolute SW url from the number + kebab-cased name", () => {
    expect(swColorUrl(color({}))).toBe(
      "https://www.sherwin-williams.com/en-us/color/color-family/SW6864-cherry-tomato",
    );
  });

  it("strips punctuation from multi-word names", () => {
    expect(
      swColorUrl(color({ name: "Naval (Deep)", colorNumber: "6244" })),
    ).toBe(
      "https://www.sherwin-williams.com/en-us/color/color-family/SW6244-naval-deep",
    );
  });
});

describe("static SW links", () => {
  it("are absolute https URLs on the SW origin", () => {
    for (const url of [SW_STORE_LOCATOR_URL, SW_SAMPLES_URL]) {
      expect(url).toMatch(/^https:\/\/www\.sherwin-williams\.com\//);
    }
  });
});
