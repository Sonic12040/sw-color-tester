import { APP_VERSION } from "../version.js";

export class ExportService {
  /**
   * Export an array of color objects as a downloadable JSON file.
   * @param {Object[]} colors - Color objects to export
   * @returns {{ count: number }} Summary of the export
   */
  exportColors(colors) {
    const exportData = {
      exportDate: new Date().toISOString(),
      appVersion: APP_VERSION,
      count: colors.length,
      colors: colors.map((color) => ({
        id: color.id,
        name: color.name,
        number: color.colorNumber,
        hex: color.hex,
        rgb: color.rgb,
        hsl: {
          h: Math.round(color.hue * 360),
          s: Math.round(color.saturation * 100),
          l: Math.round(color.lightness * 100),
        },
        lrv: color.lrv,
        family: color.colorFamilyNames?.[0] || null,
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date()
      .toISOString()
      .replaceAll(/[:.]/g, "-")
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
