import { describe, it, expect } from "vitest";
import {
  applyLighting,
  compositeRgba,
  floodFillMask,
  hexToRgb,
  luma,
  maskedMeanLuma,
  recolorPixel,
  rgbDistanceSq,
  type LightParams,
} from "./photoMask.js";

/** Build an RGBA buffer from a list of [r,g,b] (alpha 255). */
const rgba = (pixels: [number, number, number][]): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  });
  return out;
};

const W: [number, number, number] = [255, 255, 255];
const K: [number, number, number] = [0, 0, 0];
const NEUTRAL: LightParams = { overlay: null, opacity: 0, blend: "normal" };

describe("hexToRgb", () => {
  it("parses #rrggbb and falls back to gray", () => {
    expect(hexToRgb("#ff8800")).toEqual({ r: 255, g: 136, b: 0 });
    expect(hexToRgb("nope")).toEqual({ r: 136, g: 136, b: 136 });
  });
});

describe("luma / rgbDistanceSq", () => {
  it("white is brightest, black darkest", () => {
    expect(luma({ r: 255, g: 255, b: 255 })).toBeCloseTo(255);
    expect(luma({ r: 0, g: 0, b: 0 })).toBe(0);
  });
  it("distance is squared Euclidean", () => {
    expect(rgbDistanceSq({ r: 0, g: 0, b: 0 }, { r: 0, g: 0, b: 3 })).toBe(9);
  });
});

describe("floodFillMask", () => {
  it("selects the contiguous run within tolerance, stopping at edges", () => {
    // [white, white, black, white] — seed at 0 grabs the first two whites only.
    const data = rgba([W, W, K, W]);
    const mask = floodFillMask(data, 4, 1, 0, 0, 30);
    expect(Array.from(mask)).toEqual([255, 255, 0, 0]);
  });

  it("accumulates across clicks via the `into` mask", () => {
    const data = rgba([W, W, K, W]);
    const mask = floodFillMask(data, 4, 1, 0, 0, 30);
    floodFillMask(data, 4, 1, 3, 0, 30, mask); // add the isolated white
    expect(Array.from(mask)).toEqual([255, 255, 0, 255]);
  });

  it("a wide tolerance bridges across a different color", () => {
    const data = rgba([W, [200, 200, 200], W]);
    expect(Array.from(floodFillMask(data, 3, 1, 0, 0, 10))).toEqual([
      255, 0, 0,
    ]);
    expect(Array.from(floodFillMask(data, 3, 1, 0, 0, 120))).toEqual([
      255, 255, 255,
    ]);
  });
});

describe("maskedMeanLuma", () => {
  it("averages luminance over selected pixels only", () => {
    const data = rgba([W, K, [128, 128, 128]]);
    const mask = new Uint8Array([255, 0, 255]);
    expect(maskedMeanLuma(data, mask)).toBeCloseTo((255 + 128) / 2, 0);
  });
});

describe("recolorPixel", () => {
  it("lands the target at the reference luminance and preserves shading", () => {
    const target = { r: 200, g: 60, b: 40 };
    // A pixel at the reference luminance maps to the target exactly.
    expect(recolorPixel({ r: 255, g: 255, b: 255 }, target, 255)).toEqual(
      target,
    );
    // A darker pixel (half the reference) stays proportionally darker.
    const dark = recolorPixel({ r: 128, g: 128, b: 128 }, target, 255);
    expect(dark.r).toBeCloseTo(target.r * (128 / 255), 0);
    expect(dark.r).toBeLessThan(target.r);
  });
});

describe("applyLighting", () => {
  it("is a no-op for the neutral preset", () => {
    const c = { r: 100, g: 120, b: 140 };
    expect(applyLighting(c, NEUTRAL)).toEqual(c);
  });
  it("a screen tint brightens", () => {
    const lit = applyLighting(
      { r: 100, g: 100, b: 100 },
      { overlay: { r: 255, g: 255, b: 255 }, opacity: 0.5, blend: "screen" },
    );
    expect(lit.r).toBeGreaterThan(100);
  });
});

describe("compositeRgba", () => {
  it("recolors the masked pixels and leaves the rest untouched", () => {
    const data = rgba([W, [90, 80, 70]]); // wall, floor
    const mask = new Uint8Array([255, 0]);
    const out = compositeRgba(data, mask, { r: 30, g: 60, b: 200 }, NEUTRAL);
    // Masked wall took the blue target…
    expect(out[2]).toBeGreaterThan(out[0]); // b > r
    // …the floor pixel is byte-for-byte unchanged.
    expect([out[4], out[5], out[6]]).toEqual([90, 80, 70]);
  });
});
