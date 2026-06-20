import { describe, it, expect, vi } from "vitest";
import type { Color } from "../data/types.js";
import {
  serializeColors,
  exportFilename,
  ExportService,
} from "./ExportService.js";

const color = (over: Partial<Color>): Color =>
  ({
    id: "x",
    name: "Tricorn Black",
    colorNumber: "6258",
    brandKey: "SW",
    hex: "#2f2f30",
    red: 47,
    green: 47,
    blue: 48,
    hue: 0.5,
    saturation: 0.25,
    lightness: 0.4,
    lrv: 3,
    isDark: true,
    isInterior: true,
    isExterior: true,
    colorFamilyNames: ["Neutral"],
    brandedCollectionNames: [],
    similarColors: [],
    description: [],
    ...over,
  }) as Color;

const NOW = new Date("2024-01-02T03:04:05.678Z");

describe("serializeColors", () => {
  it("builds a deterministic payload with rounded HSL and primary family", () => {
    const out = serializeColors([color({})], NOW);
    expect(out.exportDate).toBe("2024-01-02T03:04:05.678Z");
    expect(out.count).toBe(1);
    expect(out.colors[0]).toMatchObject({
      id: "x",
      number: "6258",
      hex: "#2f2f30",
      hsl: { h: 180, s: 25, l: 40 },
      family: "Neutral",
    });
  });

  it("reports null family when none is set", () => {
    const out = serializeColors([color({ colorFamilyNames: [] })], NOW);
    expect(out.colors[0].family).toBeNull();
  });
});

describe("exportFilename", () => {
  it("is a timestamped .json name", () => {
    expect(exportFilename(NOW)).toMatch(
      /^sw-favorites-2024-01-02T03-04-05.*\.json$/,
    );
  });
});

describe("ExportService.exportColors", () => {
  it("returns the count and triggers a download", () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.fn();
    const anchor = { href: "", download: "", click } as unknown as HTMLElement;
    const spy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(anchor as HTMLAnchorElement);

    const result = new ExportService().exportColors([color({})]);

    expect(result).toEqual({ count: 1 });
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    spy.mockRestore();
  });
});
