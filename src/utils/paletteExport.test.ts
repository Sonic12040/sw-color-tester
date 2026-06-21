import { describe, it, expect } from "vitest";
import { TEST_COLORS } from "../test/fixtures.js";
import {
  buildSpecRows,
  hexToRgb,
  boardGrid,
  buildPalettePdf,
} from "./paletteExport.js";

const NOW = new Date("2024-01-02T03:04:05.000Z");
const colorById = (id: string) => TEST_COLORS.find((c) => c.id === id)!;

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
