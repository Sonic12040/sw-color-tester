import { describe, it, expect, vi } from "vitest";
import type { Color } from "../data/types.js";
import { exportFilename, ExportService } from "./ExportService.js";

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

describe("exportFilename", () => {
  it("uses the given slug (e.g. a palette/project name)", () => {
    expect(exportFilename(NOW, "palette-kitchen", "pdf")).toMatch(
      /^sw-palette-kitchen-2024-01-02T03-04-05.*\.pdf$/,
    );
  });

  it("is a timestamped name with the default slug/ext", () => {
    expect(exportFilename(NOW)).toMatch(
      /^sw-favorites-2024-01-02T03-04-05.*\.json$/,
    );
  });
});

describe("ExportService.exportSpecPdf", () => {
  it("builds a PDF blob and triggers a .pdf download", async () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const anchor = {
      href: "",
      download: "",
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;
    const spy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(anchor as HTMLAnchorElement);

    const result = await new ExportService().exportSpecPdf([color({})], {
      project: "Kitchen",
    });

    expect(result).toEqual({ count: 1 });
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchor.download).toMatch(/^sw-palette-kitchen-.*\.pdf$/);
    expect(anchor.click).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
