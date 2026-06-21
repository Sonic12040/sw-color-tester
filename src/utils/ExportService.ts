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

/** Pure: timestamped download filename. `slug` defaults to the legacy "favorites". */
export function exportFilename(now: Date, slug = "favorites"): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `sw-${slug}-${stamp}.json`;
}

export class ExportService {
  /** Serialize the colors and trigger a browser download. */
  exportColors(
    colors: Color[],
    opts: SerializeOptions = {},
  ): { count: number } {
    const now = new Date();
    const json = JSON.stringify(serializeColors(colors, now, opts), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFilename(
      now,
      opts.project ? `palette-${kebab(opts.project)}` : "favorites",
    );
    link.click();
    URL.revokeObjectURL(url);
    return { count: colors.length };
  }
}
