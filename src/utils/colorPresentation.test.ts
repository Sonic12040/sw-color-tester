import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import {
  classifyLrv,
  contrastText,
  describeLrv,
  designerCollections,
  formatUseTypes,
  similarityRole,
  undertone,
  UNDERTONES,
  LRV_CLASSES,
  neutrality,
  neutralityBand,
  NEUTRAL_CLASSES,
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

describe("classifyLrv", () => {
  it("buckets by the dark/light thresholds", () => {
    expect(classifyLrv(10)).toBe("Dark");
    expect(classifyLrv(50)).toBe("Medium");
    expect(classifyLrv(80)).toBe("Light");
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

describe("undertone", () => {
  it("treats low-saturation colors as Neutral regardless of hue", () => {
    expect(undertone(make({ hue: 0, saturation: 0.05 }))).toBe("Neutral");
    expect(undertone(make({ hue: 0.6, saturation: 0.08 }))).toBe("Neutral");
  });

  it("classifies reds/oranges/yellows/magentas as Warm", () => {
    expect(undertone(make({ hue: 0, saturation: 0.8 }))).toBe("Warm"); // 0°
    expect(undertone(make({ hue: 0.13, saturation: 0.8 }))).toBe("Warm"); // ~47°
    expect(undertone(make({ hue: 0.95, saturation: 0.8 }))).toBe("Warm"); // ~342°
  });

  it("classifies greens/blues/purples as Cool", () => {
    expect(undertone(make({ hue: 0.45, saturation: 0.8 }))).toBe("Cool"); // 162°
    expect(undertone(make({ hue: 0.6, saturation: 0.8 }))).toBe("Cool"); // 216°
    expect(undertone(make({ hue: 0.78, saturation: 0.8 }))).toBe("Cool"); // ~281°
  });

  it("exposes the canonical undertone + lightness lists", () => {
    expect(UNDERTONES).toEqual(["Warm", "Cool", "Neutral"]);
    expect(LRV_CLASSES).toEqual(["Dark", "Medium", "Light"]);
  });
});

describe("neutrality", () => {
  it("scores a perfect gray at 100 (High band)", () => {
    const gray = make({
      red: 128,
      green: 128,
      blue: 128,
      saturation: 0,
      lab: { L: 54, A: 0, B: 0 },
    });
    expect(neutrality(gray)).toBe(100);
    expect(neutralityBand(gray)).toBe("High");
  });

  it("scores a saturated primary very low (Low band)", () => {
    const red = make({
      red: 255,
      green: 0,
      blue: 0,
      saturation: 1,
      lab: { L: 53, A: 80, B: 67 },
    });
    expect(neutrality(red)).toBeLessThan(20);
    expect(neutralityBand(red)).toBe("Low");
  });

  it("puts a low-chroma muted color in the Medium band", () => {
    const muted = make({
      red: 150,
      green: 140,
      blue: 120,
      saturation: 0.15,
      lab: { L: 60, A: 8, B: 14 },
    });
    expect(neutralityBand(muted)).toBe("Medium");
  });

  it("ignores hue — equal chroma yields equal neutrality", () => {
    const base = { red: 130, green: 120, blue: 120, saturation: 0.1 };
    const a = make({ ...base, lab: { L: 50, A: 20, B: 0 } });
    const b = make({ ...base, lab: { L: 50, A: 0, B: 20 } });
    expect(neutrality(a)).toBe(neutrality(b));
  });

  it("exposes the canonical neutrality classes", () => {
    expect(NEUTRAL_CLASSES).toEqual(["High", "Medium", "Low"]);
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
