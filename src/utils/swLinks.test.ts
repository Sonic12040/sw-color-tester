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
  it("includes the {family}-paint-colors segment + SW{number}-{name}", () => {
    expect(
      swColorUrl(
        color({
          name: "Softer Tan",
          colorNumber: "6141",
          colorFamilyNames: ["Yellow"],
        }),
      ),
    ).toBe(
      "https://www.sherwin-williams.com/en-us/color/color-family/yellow-paint-colors/SW6141-softer-tan",
    );
    expect(
      swColorUrl(
        color({
          name: "Lazy Gray",
          colorNumber: "6254",
          colorFamilyNames: ["Neutral"],
        }),
      ),
    ).toBe(
      "https://www.sherwin-williams.com/en-us/color/color-family/neutral-paint-colors/SW6254-lazy-gray",
    );
  });

  it("strips punctuation from multi-word names", () => {
    expect(
      swColorUrl(
        color({
          name: "Naval (Deep)",
          colorNumber: "6244",
          colorFamilyNames: ["Blue"],
        }),
      ),
    ).toBe(
      "https://www.sherwin-williams.com/en-us/color/color-family/blue-paint-colors/SW6244-naval-deep",
    );
  });

  it("falls back to the color-family landing page when family is unusable", () => {
    expect(swColorUrl(color({ colorFamilyNames: [] }))).toBe(
      "https://www.sherwin-williams.com/en-us/color/color-family",
    );
    expect(swColorUrl(color({ colorFamilyNames: ["NA"] }))).toBe(
      "https://www.sherwin-williams.com/en-us/color/color-family",
    );
  });
});

describe("static SW links", () => {
  it("point the store locator at www and samples at the samples subdomain", () => {
    expect(SW_STORE_LOCATOR_URL).toBe(
      "https://www.sherwin-williams.com/store-locator",
    );
    expect(SW_SAMPLES_URL).toBe("https://samples.sherwin-williams.com");
  });
});
