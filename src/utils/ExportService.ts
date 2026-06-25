import type { Color } from "../data/types.js";
import type { PaletteRole } from "../domain/types.js";
import type { Room } from "../domain/project.js";
import type { PaletteProject } from "../domain/paletteData.js";
import { serializeProject } from "./projectFile.js";

/** Per-color annotations captured in a palette project. */
export interface ColorAnnotation {
  note?: string;
  room?: string;
  /** Manual 60-30-10 role override; absent = auto-assigned in the deliverable. */
  role?: PaletteRole;
}

export interface SerializeOptions {
  /** Palette/project name, recorded in the filename + deliverable header. */
  project?: string;
  /** Per-color notes/room/role, keyed by color id. */
  annotations?: Record<string, ColorAnnotation>;
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

  /**
   * Build a Work Order PDF (rooms × surfaces) and trigger a download. `colors`
   * is the palette's color list, used to resolve each surface's assigned color.
   */
  async exportWorkOrderPdf(
    rooms: Room[],
    colors: Color[],
    opts: SerializeOptions = {},
  ): Promise<{ rooms: number }> {
    const { buildWorkOrder, buildWorkOrderPdf } =
      await import("./paletteExport.js");
    const now = new Date();
    const colorsById = new Map(colors.map((c) => [c.id, c]));
    const workOrder = buildWorkOrder(rooms, colorsById);
    const bytes = await buildWorkOrderPdf(workOrder, {
      project: opts.project ?? "My palette",
      now,
    });
    const slug = opts.project
      ? `workorder-${kebab(opts.project)}`
      : "workorder";
    this.#download(
      new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      exportFilename(now, slug, "pdf"),
    );
    return { rooms: rooms.length };
  }

  /**
   * Export a Project to a versioned JSON file and trigger a download (E18.1).
   * The whole project travels — colors + notes/room/roles + rooms/surfaces +
   * progress — so it round-trips losslessly on import.
   */
  exportProjectFile(project: PaletteProject): { name: string } {
    const json = JSON.stringify(serializeProject(project), null, 2);
    const slug = `project-${kebab(project.name)}`;
    this.#download(
      new Blob([json], { type: "application/json" }),
      exportFilename(new Date(), slug, "json"),
    );
    return { name: project.name };
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
