import { describe, it, expect } from "vitest";
import {
  paintEstimate,
  paintableAreaSqFt,
  resolveSurfaceArea,
} from "./paint.js";

describe("paintEstimate", () => {
  it("estimates a standard room with openings and 2 coats", () => {
    // 12×12×8 room: perimeter 48 × 8 = 384 sq ft walls; minus 1 door (21) +
    // 2 windows (30) = 333 paintable; ×2 coats / 350 = 1.903 gal.
    const e = paintEstimate({
      lengthFt: 12,
      widthFt: 12,
      heightFt: 8,
      coats: 2,
      doors: 1,
      windows: 2,
    });
    expect(e.wallAreaSqFt).toBe(384);
    expect(e.paintableSqFt).toBe(333);
    expect(e.coats).toBe(2);
    expect(e.gallons).toBeCloseTo(1.9, 1);
    expect(e.cans).toBe(2);
  });

  it("defaults to 2 coats, no openings, 350 sq ft coverage", () => {
    const e = paintEstimate({ lengthFt: 10, widthFt: 10, heightFt: 8 });
    expect(e.coats).toBe(2);
    expect(e.wallAreaSqFt).toBe(320);
    expect(e.paintableSqFt).toBe(320);
    // 320 × 2 / 350 = 1.829 → 1.8 gal, buy 2 cans.
    expect(e.gallons).toBeCloseTo(1.8, 1);
    expect(e.cans).toBe(2);
  });

  it("never lets openings push paintable area below zero", () => {
    const e = paintEstimate({
      lengthFt: 2,
      widthFt: 2,
      heightFt: 8,
      doors: 10,
    });
    expect(e.paintableSqFt).toBe(0);
    expect(e.gallons).toBe(0);
    expect(e.cans).toBe(0);
  });

  it("clamps negative dimensions to zero", () => {
    const e = paintEstimate({ lengthFt: -5, widthFt: 10, heightFt: 8 });
    expect(e.wallAreaSqFt).toBe(160); // only the positive width contributes
    expect(e.cans).toBeGreaterThanOrEqual(1);
  });

  it("honors a custom coverage figure", () => {
    const e = paintEstimate({
      lengthFt: 10,
      widthFt: 10,
      heightFt: 10,
      coats: 1,
      coveragePerGallon: 400,
    });
    // 2×(20)×10 = 400 sq ft × 1 / 400 = exactly 1 gallon.
    expect(e.gallons).toBe(1);
    expect(e.cans).toBe(1);
  });
});

describe("paintableAreaSqFt", () => {
  it("is perimeter × height minus openings", () => {
    // 12×12×8 → 384 walls − (1 door 21 + 2 windows 30) = 333.
    expect(
      paintableAreaSqFt({
        lengthFt: 12,
        widthFt: 12,
        heightFt: 8,
        doors: 1,
        windows: 2,
      }),
    ).toBe(333);
  });

  it("clamps negatives and never goes below zero", () => {
    expect(paintableAreaSqFt({ lengthFt: -5, widthFt: 10, heightFt: 8 })).toBe(
      160,
    );
    expect(
      paintableAreaSqFt({ lengthFt: 2, widthFt: 2, heightFt: 8, doors: 10 }),
    ).toBe(0);
  });
});

describe("resolveSurfaceArea", () => {
  it("uses a directly entered area", () => {
    expect(resolveSurfaceArea({ areaSqFt: 120 })).toBe(120);
  });

  it("prefers L×W×H dimensions over a direct area", () => {
    expect(
      resolveSurfaceArea({
        areaSqFt: 999,
        dimensions: { lengthFt: 10, widthFt: 10, heightFt: 8 },
      }),
    ).toBe(320);
  });

  it("is zero for an unmeasured surface", () => {
    expect(resolveSurfaceArea({})).toBe(0);
  });
});
