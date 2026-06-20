import { describe, it, expect } from "vitest";
import { colorData } from "./palette.js";

/**
 * Each `Color` carries four overlapping encodings of the same color — hex, RGB,
 * HSL, and (usually) CIELAB — and different code paths trust different ones
 * (`hsl()` reads HSL; `neutrality()` reads LAB + RGB). These guards assert the
 * encodings actually agree, so a regenerated dataset can't silently drift one
 * channel out of sync with another.
 */

/** Reconstruct 8-bit RGB from HSL (h,s,l each 0–1) to cross-check the channels. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

describe("color dataset integrity", () => {
  it("is non-empty", () => {
    expect(colorData.length).toBeGreaterThan(1000);
  });

  it("hex exactly matches the RGB channels", () => {
    const mismatches = colorData
      .filter((c) => {
        const m = /^#([0-9a-fA-F]{6})$/.exec(c.hex);
        if (!m) return true;
        const n = parseInt(m[1], 16);
        return (
          ((n >> 16) & 0xff) !== c.red ||
          ((n >> 8) & 0xff) !== c.green ||
          (n & 0xff) !== c.blue
        );
      })
      .map((c) => `${c.id} ${c.hex} vs (${c.red},${c.green},${c.blue})`);
    expect(mismatches).toEqual([]);
  });

  it("keeps RGB / HSL / LRV channels in valid ranges", () => {
    // Tolerate floating-point dust at the 0/1 boundaries (e.g. saturation
    // 1.0000000000000002); only flag genuine out-of-range values.
    const EPS = 1e-6;
    const unit = (v: number) => v >= -EPS && v <= 1 + EPS;
    const bad = colorData
      .filter(
        (c) =>
          ![c.red, c.green, c.blue].every(
            (v) => Number.isInteger(v) && v >= 0 && v <= 255,
          ) ||
          !unit(c.hue) ||
          !unit(c.saturation) ||
          !unit(c.lightness) ||
          c.lrv < -EPS ||
          c.lrv > 100 + EPS,
      )
      .map((c) => c.id);
    expect(bad).toEqual([]);
  });

  it("HSL reconstructs the stored RGB within rounding tolerance", () => {
    const drifted = colorData
      .filter((c) => {
        const [r, g, b] = hslToRgb(c.hue, c.saturation, c.lightness);
        return (
          Math.abs(r - c.red) > 2 ||
          Math.abs(g - c.green) > 2 ||
          Math.abs(b - c.blue) > 2
        );
      })
      .map((c) => `${c.id}: hsl→(${c.red},${c.green},${c.blue})`);
    expect(drifted).toEqual([]);
  });

  it("provides finite CIELAB for every color (used by neutrality)", () => {
    const missing = colorData
      .filter(
        (c) =>
          !c.lab ||
          !Number.isFinite(c.lab.L) ||
          !Number.isFinite(c.lab.A) ||
          !Number.isFinite(c.lab.B),
      )
      .map((c) => c.id);
    expect(missing).toEqual([]);
  });
});
