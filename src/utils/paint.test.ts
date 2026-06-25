import { describe, it, expect } from "vitest";
import type { Room } from "../domain/project.js";
import {
  paintEstimate,
  paintableAreaSqFt,
  paintQuantity,
  resolveSurfaceArea,
  estimateProjectQuantities,
  projectProgress,
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

describe("paintQuantity", () => {
  it("converts area×coats volume to gallons + cans", () => {
    expect(paintQuantity(700)).toEqual({ gallons: 2, cans: 2 });
    expect(paintQuantity(360)).toEqual({ gallons: 1, cans: 2 });
  });

  it("is zero for zero/negative volume", () => {
    expect(paintQuantity(0)).toEqual({ gallons: 0, cans: 0 });
    expect(paintQuantity(-50)).toEqual({ gallons: 0, cans: 0 });
  });

  it("honors a custom coverage", () => {
    expect(paintQuantity(400, 400)).toEqual({ gallons: 1, cans: 1 });
  });
});

describe("estimateProjectQuantities", () => {
  const rooms: Room[] = [
    {
      id: "a",
      name: "Room A",
      surfaces: [{ id: "a1", type: "wall", colorId: "x", areaSqFt: 350 }], // coats default 2 → 700
    },
    {
      id: "b",
      name: "Room B",
      surfaces: [
        { id: "b1", type: "wall", colorId: "x", coats: 1, areaSqFt: 350 }, // 350
        { id: "b2", type: "trim", colorId: "y", coats: 1, areaSqFt: 700 }, // 700
        { id: "b3", type: "ceiling", coats: 2, areaSqFt: 100 }, // unassigned → no color total
      ],
    },
  ];

  it("totals paint per room (every measured surface)", () => {
    const q = estimateProjectQuantities(rooms);
    expect(q.rooms[0]).toMatchObject({ areaSqFt: 350, cans: 2 }); // 700/350
    expect(q.rooms[1]).toMatchObject({ areaSqFt: 1150, cans: 4 }); // 1250/350 → 3.57
  });

  it("aggregates per color across rooms (assigned surfaces only)", () => {
    const { byColor } = estimateProjectQuantities(rooms);
    expect(byColor).toHaveLength(2);
    const x = byColor.find((c) => c.colorId === "x")!;
    expect(x).toMatchObject({ areaSqFt: 700, cans: 3 }); // (700+350)/350 = 3
    const y = byColor.find((c) => c.colorId === "y")!;
    expect(y).toMatchObject({ areaSqFt: 700, cans: 2 }); // 700/350 = 2
  });

  it("sums grand totals across the project", () => {
    const q = estimateProjectQuantities(rooms);
    expect(q.totalAreaSqFt).toBe(1500);
    expect(q.totalCans).toBe(6); // 1950/350 = 5.57 → 6
  });

  it("ignores colors whose surfaces are unmeasured", () => {
    const q = estimateProjectQuantities([
      {
        id: "r",
        name: "R",
        surfaces: [{ id: "s", type: "wall", colorId: "z" }], // no area
      },
    ]);
    expect(q.byColor).toEqual([]);
    expect(q.totalCans).toBe(0);
  });
});

describe("projectProgress", () => {
  const rooms: Room[] = [
    {
      id: "a",
      name: "Room A",
      surfaces: [
        { id: "a1", type: "wall", done: true },
        { id: "a2", type: "trim" },
      ],
    },
    {
      id: "b",
      name: "Room B",
      surfaces: [{ id: "b1", type: "ceiling", done: true }],
    },
  ];

  it("counts done surfaces per room and overall, regardless of measurement", () => {
    const p = projectProgress(rooms);
    expect(p.rooms[0]).toEqual({
      roomId: "a",
      done: 1,
      total: 2,
      fraction: 0.5,
    });
    expect(p.rooms[1]).toEqual({
      roomId: "b",
      done: 1,
      total: 1,
      fraction: 1,
    });
    expect(p).toMatchObject({ done: 2, total: 3 });
    expect(p.fraction).toBeCloseTo(2 / 3, 5);
  });

  it("is zero with no surfaces and never divides by zero", () => {
    expect(projectProgress([])).toEqual({
      rooms: [],
      done: 0,
      total: 0,
      fraction: 0,
    });
    const empty = projectProgress([{ id: "e", name: "Empty", surfaces: [] }]);
    expect(empty.rooms[0]).toEqual({
      roomId: "e",
      done: 0,
      total: 0,
      fraction: 0,
    });
    expect(empty.fraction).toBe(0);
  });
});
