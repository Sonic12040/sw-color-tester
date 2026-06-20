import type { Color } from "../data/types.js";

export interface ColorExportEntry {
  id: string;
  name: string;
  number: string;
  hex: string;
  hsl: { h: number; s: number; l: number };
  lrv: number;
  family: string | null;
}

export interface ColorExport {
  exportDate: string;
  appVersion: string;
  count: number;
  colors: ColorExportEntry[];
}

/** Pure: build the export payload (no DOM, no ambient clock — `now` is injected). */
export function serializeColors(colors: Color[], now: Date): ColorExport {
  return {
    exportDate: now.toISOString(),
    appVersion: import.meta.env.VITE_APP_VERSION ?? "1.0.0",
    count: colors.length,
    colors: colors.map((color) => ({
      id: color.id,
      name: color.name,
      number: color.colorNumber,
      hex: color.hex,
      hsl: {
        h: Math.round(color.hue * 360),
        s: Math.round(color.saturation * 100),
        l: Math.round(color.lightness * 100),
      },
      lrv: color.lrv,
      family: color.colorFamilyNames[0] ?? null,
    })),
  };
}

/** Pure: timestamped download filename. */
export function exportFilename(now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `sw-favorites-${stamp}.json`;
}

export class ExportService {
  /** Serialize the colors and trigger a browser download. */
  exportColors(colors: Color[]): { count: number } {
    const now = new Date();
    const json = JSON.stringify(serializeColors(colors, now), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFilename(now);
    link.click();
    URL.revokeObjectURL(url);
    return { count: colors.length };
  }
}
