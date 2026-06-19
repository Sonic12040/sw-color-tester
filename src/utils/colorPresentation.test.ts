import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import {
  contrastText,
  describeLrv,
  designerCollections,
  formatUseTypes,
  similarityRole,
} from "./colorPresentation.js";

function make(over: Partial<Color>): Color {
  return {
    id: "x",
    name: "X",
    colorNumber: "0000",
    brandKey: "SW",
    hex: "#888888",
    red: 136,
    green: 136,
    blue: 136,
    hue: 0.5,
    saturation: 0.5,
    lightness: 0.5,
    lrv: 50,
    isDark: false,
    isInterior: false,
    isExterior: false,
    colorFamilyNames: [],
    brandedCollectionNames: [],
    similarColors: [],
    description: [],
    ...over,
  };
}

describe("contrastText", () => {
  it("returns white below the contrast threshold and black above", () => {
    expect(contrastText(10)).toBe("white");
    expect(contrastText(80)).toBe("black");
  });
});

describe("describeLrv", () => {
  it("classifies dark / medium / light with a formatted percentage", () => {
    expect(describeLrv(10).label).toBe("Dark");
    expect(describeLrv(50).label).toBe("Medium");
    expect(describeLrv(80).label).toBe("Light");
    expect(describeLrv(10).context).toContain("10.0%");
  });
});

describe("designerCollections", () => {
  it("keeps only designer collections and strips the prefix", () => {
    const color = make({
      brandedCollectionNames: [
        "Designer Color Collection - Classic",
        "Some Other Collection",
      ],
    });
    expect(designerCollections(color)).toEqual(["Classic"]);
  });
});

describe("formatUseTypes", () => {
  it("joins the applicable use types", () => {
    expect(formatUseTypes(make({ isInterior: true }))).toBe("Interior");
    expect(formatUseTypes(make({ isInterior: true, isExterior: true }))).toBe(
      "Interior & Exterior",
    );
    expect(formatUseTypes(make({}))).toBe("");
  });
});

describe("similarityRole", () => {
  const base = make({ hue: 0.5, lightness: 0.5 });

  it("labels by hue first, factoring in lightness", () => {
    expect(similarityRole(base, make({ hue: 0.7, lightness: 0.5 }), 0)).toBe(
      "Warmer",
    );
    expect(similarityRole(base, make({ hue: 0.7, lightness: 0.9 }), 0)).toBe(
      "Warmer & Lighter",
    );
    expect(similarityRole(base, make({ hue: 0.3, lightness: 0.5 }), 0)).toBe(
      "Cooler",
    );
  });

  it("falls back to lightness, then to a positional differentiator", () => {
    expect(similarityRole(base, make({ hue: 0.5, lightness: 0.9 }), 0)).toBe(
      "Lighter",
    );
    expect(similarityRole(base, make({ hue: 0.5, lightness: 0.1 }), 0)).toBe(
      "Darker",
    );
    // Same hue & lightness → positional label by index.
    expect(similarityRole(base, make({ hue: 0.5, lightness: 0.5 }), 4)).toBe(
      "Similar Tone",
    );
  });
});
