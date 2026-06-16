import type { Color } from "../data/types.js";

export class ExportService {
  exportColors(colors: Color[]): { count: number } {
    const exportData = {
      exportDate: new Date().toISOString(),
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

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `sw-favorites-${timestamp}.json`;

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    return { count: colors.length };
  }
}
