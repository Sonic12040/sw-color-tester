import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import {
  classifyLrv,
  contrastText,
  contrastRatio,
  hueRelation,
  undertone,
  UNDERTONES,
  LRV_CLASSES,
  neutrality,
  neutralityBand,
  NEUTRAL_CLASSES,
} from "./colorMath.js";

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

describe("contrastRatio", () => {
  const black = make({ red: 0, green: 0, blue: 0 });
  const white = make({ red: 255, green: 255, blue: 255 });

  it("returns 21:1 for black vs white and 1:1 for identical colors", () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    const mid = make({ red: 119, green: 119, blue: 119 });
    expect(contrastRatio(mid, white)).toBeCloseTo(
      contrastRatio(white, mid),
      10,
    );
  });
});

describe("hueRelation", () => {
  const sat = { saturation: 0.6 };
  it("classifies by hue distance on the wheel", () => {
    expect(
      hueRelation(make({ hue: 0.0, ...sat }), make({ hue: 0.02, ...sat })),
    ).toBe("Monochromatic");
    expect(
      hueRelation(make({ hue: 0.0, ...sat }), make({ hue: 0.1, ...sat })),
    ).toBe("Analogous");
    // 0.5 apart = 180° → opposite side of the wheel.
    expect(
      hueRelation(make({ hue: 0.0, ...sat }), make({ hue: 0.5, ...sat })),
    ).toBe("Complementary");
    expect(
      hueRelation(make({ hue: 0.0, ...sat }), make({ hue: 0.25, ...sat })),
    ).toBe("Contrasting");
  });

  it("wraps around the wheel (350° ≈ 10° apart → Monochromatic)", () => {
    expect(
      hueRelation(make({ hue: 0.97, ...sat }), make({ hue: 0.0, ...sat })),
    ).toBe("Monochromatic");
  });

  it("returns Neutral when either color is near-gray", () => {
    expect(
      hueRelation(
        make({ hue: 0.0, saturation: 0.05 }),
        make({ hue: 0.5, ...sat }),
      ),
    ).toBe("Neutral");
  });
});

describe("classifyLrv", () => {
  it("buckets by the dark/light thresholds", () => {
    expect(classifyLrv(10)).toBe("Dark");
    expect(classifyLrv(50)).toBe("Medium");
    expect(classifyLrv(80)).toBe("Light");
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
