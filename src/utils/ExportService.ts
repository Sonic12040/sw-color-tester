import type { Color } from "../data/types.js";

/** Per-color free text captured in a palette project. */
export interface ColorAnnotation {
  note?: string;
  room?: string;
}

export interface SerializeOptions {
  /** Palette/project name, recorded in the payload + filename. */
  project?: string;
  /** Per-color notes/room, keyed by color id. */
  annotations?: Record<string, ColorAnnotation>;
}

export interface ColorExportEntry {
  id: string;
  name: string;
  number: string;
  hex: string;
  hsl: { h: number; s: number; l: number };
  lrv: number;
  family: string | null;
  note?: string;
  room?: string;
}

export interface ColorExport {
  exportDate: string;
  appVersion: string;
  project?: string;
  count: number;
  colors: ColorExportEntry[];
}

/** Pure: build the export payload (no DOM, no ambient clock — `now` is injected). */
export function serializeColors(
  colors: Color[],
  now: Date,
  opts: SerializeOptions = {},
): ColorExport {
  return {
    exportDate: now.toISOString(),
    appVersion: import.meta.env.VITE_APP_VERSION ?? "1.0.0",
    ...(opts.project ? { project: opts.project } : {}),
    count: colors.length,
    colors: colors.map((color) => {
      const ann = opts.annotations?.[color.id];
      return {
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
        ...(ann?.note ? { note: ann.note } : {}),
        ...(ann?.room ? { room: ann.room } : {}),
      };
    }),
  };
}

/** Kebab-case a label for filenames. */
function kebab(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "palette"
  );
}

/** Pure: timestamped download filename. `slug`/`ext` default to the legacy JSON form. */
export function exportFilename(
  now: Date,
  slug = "favorites",
  ext = "json",
): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `sw-${slug}-${stamp}.${ext}`;
}

const fileSlug = (opts: SerializeOptions): string =>
  opts.project ? `palette-${kebab(opts.project)}` : "favorites";

export class ExportService {
  /** Trigger a browser download of a blob. */
  #download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Serialize the colors to JSON and trigger a download. */
  exportColors(
    colors: Color[],
    opts: SerializeOptions = {},
  ): { count: number } {
    const now = new Date();
    const json = JSON.stringify(serializeColors(colors, now, opts), null, 2);
    this.#download(
      new Blob([json], { type: "application/json" }),
      exportFilename(now, fileSlug(opts), "json"),
    );
    return { count: colors.length };
  }

  /**
   * Build a PDF spec sheet and trigger a download. The export module (incl.
   * pdf-lib) is loaded on demand so it never weighs down the main bundle.
   */
  async exportSpecPdf(
    colors: Color[],
    opts: SerializeOptions = {},
  ): Promise<{ count: number }> {
    const { buildSpecRows, buildPalettePdf } =
      await import("./paletteExport.js");
    const now = new Date();
    const rows = buildSpecRows(colors, opts.annotations ?? {});
    const bytes = await buildPalettePdf(rows, {
      project: opts.project ?? "My palette",
      now,
    });
    this.#download(
      new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      exportFilename(now, fileSlug(opts), "pdf"),
    );
    return { count: colors.length };
  }

  /** Render a PNG swatch board and trigger a download (export module loaded on demand). */
  async exportBoardPng(
    colors: Color[],
    opts: SerializeOptions = {},
  ): Promise<{ count: number }> {
    const { buildSpecRows, renderBoardToCanvas } =
      await import("./paletteExport.js");
    const now = new Date();
    const rows = buildSpecRows(colors, opts.annotations ?? {});
    const canvas = document.createElement("canvas");
    renderBoardToCanvas(canvas, rows, opts.project ?? "My palette");
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not render the palette board"));
          return;
        }
        this.#download(blob, exportFilename(now, fileSlug(opts), "png"));
        resolve({ count: colors.length });
      }, "image/png");
    });
  }
}
