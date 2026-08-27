import { describe, it, expect } from "vitest";
import {
  applyLighting,
  boxBlurRgba,
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

describe("floodFillMask (fixed neighbor+seed standard)", () => {
  it("stops at a hard edge (wall → trim) but not before it", () => {
    // [white, white, black, white] — seed on the first white grabs the two
    // whites, stops at the black step, never reaches the isolated white.
    const data = rgba([W, W, K, W]);
    const mask = floodFillMask(data, 4, 1, 0, 0);
    expect(Array.from(mask)).toEqual([255, 255, 0, 0]);
  });

  it("follows a smooth luminance gradient across the whole wall (one click)", () => {
    // A neutral wall shaded light→dark in small steps: neighbor steps are tiny
    // and the hue never changes, so one click selects the entire run even
    // though the bright and shadowed ends differ a lot in brightness.
    const shades: [number, number, number][] = [];
    for (let v = 230; v >= 90; v -= 16) shades.push([v, v, v]);
    const data = rgba(shades);
    const mask = floodFillMask(data, shades.length, 1, 0, 0);
    expect(Array.from(mask).every((m) => m === 255)).toBe(true);
  });

  it("does NOT spread across a sharp step even if both sides are 'wall-ish'", () => {
    // A big single-step jump (a shadow line / corner) halts the fill.
    const data = rgba([
      [200, 200, 200],
      [200, 200, 200],
      [90, 90, 90],
    ]);
    const mask = floodFillMask(data, 3, 1, 0, 0);
    expect(Array.from(mask)).toEqual([255, 255, 0]);
  });

  it("accumulates across clicks via the `into` mask", () => {
    const data = rgba([W, W, K, W]);
    const mask = floodFillMask(data, 4, 1, 0, 0);
    floodFillMask(data, 4, 1, 3, 0, mask); // add the isolated white
    expect(Array.from(mask)).toEqual([255, 255, 0, 255]);
  });

  it("caps hue drift from the seed, so a soft ramp to another color can't run away", () => {
    // Neutral → blue in small neighbor steps (each within the local tolerance),
    // but the hue drifts steadily. The chromaticity cap stops the fill before
    // the far, clearly-blue end — even though there's no hard edge.
    const ramp: [number, number, number][] = [];
    for (let k = 0; k < 8; k += 1) ramp.push([100 - 4 * k, 100, 100 + 4 * k]);
    const mask = floodFillMask(rgba(ramp), ramp.length, 1, 0, 0);
    expect(mask[0]).toBe(255); // the clicked neutral
    expect(mask[ramp.length - 1]).toBe(0); // the far, bluer end excluded
  });
});

describe("boxBlurRgba", () => {
  it("averages a lone speck toward its neighbors (denoise)", () => {
    // A single black speck between whites — blur pulls it up toward white so it
    // no longer fragments a selection.
    const data = rgba([W, W, K, W, W]);
    const blurred = boxBlurRgba(data, 5, 1, 1);
    expect(blurred[2 * 4]).toBeGreaterThan(150); // the speck lifted well off 0
  });
  it("is a copy when radius is 0", () => {
    const data = rgba([W, K]);
    const out = boxBlurRgba(data, 2, 1, 0);
    expect(Array.from(out)).toEqual(Array.from(data));
    expect(out).not.toBe(data);
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
