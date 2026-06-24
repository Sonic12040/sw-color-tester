import { describe, it, expect } from "vitest";
import { TEST_COLORS } from "../test/fixtures.js";
import type { Room } from "../domain/project.js";
import {
  buildSpecRows,
  hexToRgb,
  boardGrid,
  buildPalettePdf,
  buildWorkOrder,
  buildWorkOrderPdf,
} from "./paletteExport.js";

const NOW = new Date("2024-01-02T03:04:05.000Z");
const colorById = (id: string) => TEST_COLORS.find((c) => c.id === id)!;
const colorsMap = new Map(TEST_COLORS.map((c) => [c.id, c]));

describe("buildSpecRows", () => {
  it("flattens color + annotation into spec fields", () => {
    const rows = buildSpecRows([colorById("tricorn")], {
      tricorn: { note: "accent", room: "Study" },
    });
    expect(rows[0]).toMatchObject({
      name: "Tricorn Black",
      number: "6258",
      hex: "#2F2F30",
      lrvBand: "Dark",
      undertone: "Neutral",
      family: "Neutral",
      note: "accent",
      room: "Study",
    });
  });

  it("omits note/room when no annotation is given", () => {
    const rows = buildSpecRows([colorById("tricorn")]);
    expect(rows[0].note).toBeUndefined();
    expect(rows[0].room).toBeUndefined();
  });

  it("assigns 60-30-10 roles + proportions across the palette", () => {
    const rows = buildSpecRows([
      colorById("repose"), // calm neutral → Dominant
      colorById("tradewind"),
      colorById("cherry"), // colorful → Accent
    ]);
    expect(rows.map((r) => r.role)).toEqual([
      "Dominant",
      "Secondary",
      "Accent",
    ]);
    expect(rows.reduce((s, r) => s + r.proportion, 0)).toBe(100);
  });

  it("honors a per-color role override from annotations", () => {
    const rows = buildSpecRows([colorById("repose"), colorById("cherry")], {
      cherry: { role: "Dominant" },
    });
    expect(rows.find((r) => r.name === "Cherry Tomato")!.role).toBe("Dominant");
  });
});

describe("hexToRgb", () => {
  it("parses #rrggbb", () => {
    expect(hexToRgb("#2D3D50")).toEqual({ r: 45, g: 61, b: 80 });
    expect(hexToRgb("ffffff")).toEqual({ r: 255, g: 255, b: 255 });
  });
  it("falls back to mid-gray on malformed input", () => {
    expect(hexToRgb("nope")).toEqual({ r: 136, g: 136, b: 136 });
  });
});

describe("boardGrid", () => {
  it("picks a roughly-square, capped column count", () => {
    expect(boardGrid(0)).toEqual({ cols: 1, rows: 0 });
    expect(boardGrid(1)).toEqual({ cols: 1, rows: 1 });
    expect(boardGrid(4)).toEqual({ cols: 2, rows: 2 });
    expect(boardGrid(30)).toEqual({ cols: 5, rows: 6 }); // capped at 5 cols
  });
});

describe("buildPalettePdf", () => {
  it("produces valid PDF bytes", async () => {
    const rows = buildSpecRows(TEST_COLORS.slice(0, 3));
    const bytes = await buildPalettePdf(rows, { project: "Kitchen", now: NOW });
    expect(bytes.length).toBeGreaterThan(200);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("handles an empty palette without throwing", async () => {
    const bytes = await buildPalettePdf([], { project: "Empty", now: NOW });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });
});

describe("buildWorkOrder", () => {
  const rooms: Room[] = [
    {
      id: "r1",
      name: "Kitchen",
      surfaces: [
        {
          id: "s1",
          type: "wall",
          colorId: "tricorn",
          finish: "satin",
          coats: 2,
          dimensions: { lengthFt: 10, widthFt: 10, heightFt: 8 },
        },
        { id: "s2", type: "trim", areaSqFt: 50 }, // unassigned color
      ],
    },
  ];

  it("resolves surfaces and sums per-room area", () => {
    const [kitchen] = buildWorkOrder(rooms, colorsMap);
    expect(kitchen.name).toBe("Kitchen");
    expect(kitchen.surfaces[0]).toMatchObject({
      type: "Wall",
      colorName: "Tricorn Black",
      colorNumber: "6258",
      finish: "Satin",
      coats: 2,
      areaSqFt: 320, // 2×(10+10)×8
    });
    // Unassigned color → null fields; trim area is the direct 50.
    expect(kitchen.surfaces[1]).toMatchObject({
      type: "Trim",
      colorName: null,
      finish: null,
      areaSqFt: 50,
    });
    expect(kitchen.totalAreaSqFt).toBe(370);
  });

  it("produces valid PDF bytes", async () => {
    const sections = buildWorkOrder(rooms, colorsMap);
    const bytes = await buildWorkOrderPdf(sections, {
      project: "Kitchen",
      now: NOW,
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("handles a project with no rooms without throwing", async () => {
    const bytes = await buildWorkOrderPdf([], { project: "Empty", now: NOW });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });
});
