import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Color } from "../data/types.js";
import type { PaletteRole } from "../domain/types.js";
import type { ColorAnnotation } from "./ExportService.js";
import { undertone, classifyLrv } from "./colorMath.js";
import { assignRoles } from "./paletteIntelligence.js";

/**
 * Palette deliverables — a PDF spec sheet and a PNG board. The data assembly and
 * layout math are pure (and unit-tested); the canvas drawing + PDF byte
 * generation live here too but are exercised via the browser / pdf-lib.
 */

export interface SpecRow {
  name: string;
  number: string;
  hex: string;
  lrv: number;
  lrvBand: string;
  family: string | null;
  undertone: string;
  /** 60-30-10 usage role assigned across the palette (E11). */
  role: PaletteRole;
  /** Recommended share of the scheme, whole percent. */
  proportion: number;
  note?: string;
  room?: string;
}

/**
 * Pure: flatten colors + annotations into the rows a spec sheet / board needs.
 * The 60-30-10 role + proportion are computed across the whole palette (honoring
 * any per-color role override in the annotations), so deliverables carry the same
 * guidance the app shows.
 */
export function buildSpecRows(
  colors: Color[],
  annotations: Record<string, ColorAnnotation> = {},
): SpecRow[] {
  const roles = assignRoles(
    colors,
    Object.fromEntries(
      Object.entries(annotations).map(([id, a]) => [id, a.role]),
    ),
  );
  return colors.map((c, i) => {
    const ann = annotations[c.id];
    return {
      name: c.name,
      number: c.colorNumber,
      hex: c.hex.toUpperCase(),
      lrv: c.lrv,
      lrvBand: classifyLrv(c.lrv),
      family: c.colorFamilyNames[0] ?? null,
      undertone: undertone(c),
      role: roles[i].role,
      proportion: roles[i].proportion,
      ...(ann?.note ? { note: ann.note } : {}),
      ...(ann?.room ? { room: ann.room } : {}),
    };
  });
}

/** Parse `#rrggbb` to 0–255 channels (defaults to mid-gray on malformed input). */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return { r: 136, g: 136, b: 136 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export interface BoardGrid {
  cols: number;
  rows: number;
}

/** Pure: pick a roughly-square column count for a swatch board. */
export function boardGrid(count: number): BoardGrid {
  if (count <= 0) return { cols: 1, rows: 0 };
  const cols = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(count))));
  return { cols, rows: Math.ceil(count / cols) };
}

/** Build a PDF spec sheet (US Letter) and return its bytes. */
export async function buildPalettePdf(
  rows: SpecRow[],
  opts: { project: string; now: Date },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${opts.project} — palette`);
  doc.setCreator("Sherwin-Williams Color Atlas");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 48;
  const ROW_H = 66;
  const ink = rgb(0.1, 0.1, 0.11);
  const muted = rgb(0.4, 0.4, 0.42);
  const hairline = rgb(0.85, 0.85, 0.86);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  page.drawText(opts.project, {
    x: MARGIN,
    y: y - 18,
    size: 20,
    font: bold,
    color: ink,
  });
  page.drawText(
    `Sherwin-Williams Color Atlas · ${opts.now.toISOString().slice(0, 10)} · ${rows.length} color${rows.length === 1 ? "" : "s"}`,
    { x: MARGIN, y: y - 36, size: 10, font, color: muted },
  );
  y -= 64;

  for (const row of rows) {
    if (y - ROW_H < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    const { r, g, b } = hexToRgb(row.hex);
    // Swatch
    page.drawRectangle({
      x: MARGIN,
      y: y - 48,
      width: 96,
      height: 48,
      color: rgb(r / 255, g / 255, b / 255),
      borderColor: hairline,
      borderWidth: 1,
    });
    const tx = MARGIN + 112;
    page.drawText(row.name, {
      x: tx,
      y: y - 14,
      size: 13,
      font: bold,
      color: ink,
    });
    page.drawText(`SW ${row.number} · ${row.hex}`, {
      x: tx,
      y: y - 30,
      size: 10,
      font,
      color: muted,
    });
    const facts = [
      `LRV ${row.lrv.toFixed(1)} (${row.lrvBand})`,
      `${row.undertone} undertone`,
      row.family ?? "",
      `${row.role} ${row.proportion}%`,
    ]
      .filter(Boolean)
      .join("   ·   ");
    page.drawText(facts, { x: tx, y: y - 44, size: 9, font, color: muted });
    const annotation = [row.room && `Room: ${row.room}`, row.note]
      .filter(Boolean)
      .join("   —   ");
    if (annotation) {
      page.drawText(annotation, {
        x: tx,
        y: y - 58,
        size: 9,
        font,
        color: ink,
      });
    }
    y -= ROW_H;
  }

  return doc.save();
}

/** Draw the palette board onto a canvas (1200px wide). Returns the canvas. */
export function renderBoardToCanvas(
  canvas: HTMLCanvasElement,
  rows: SpecRow[],
  project: string,
): HTMLCanvasElement {
  const W = 1200;
  const PAD = 48;
  const HEADER = 96;
  const { cols, rows: gridRows } = boardGrid(rows.length);
  const gap = 24;
  const cellW = (W - PAD * 2 - gap * (cols - 1)) / Math.max(1, cols);
  const cellH = cellW * 0.82;
  const H = HEADER + PAD + gridRows * cellH + (gridRows - 1) * gap + PAD;

  canvas.width = W;
  canvas.height = Math.max(HEADER + PAD * 2, Math.round(H));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Background + header (matches the app's dark chrome).
  ctx.fillStyle = "#1b1c20";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 40px Roboto, Arial, sans-serif";
  ctx.fillText(project, PAD, 64);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "400 22px Roboto, Arial, sans-serif";
  ctx.fillText("Sherwin-Williams Color Atlas", PAD, 92);

  rows.forEach((row, i) => {
    const col = i % cols;
    const r = Math.floor(i / cols);
    const x = PAD + col * (cellW + gap);
    const y = HEADER + PAD + r * (cellH + gap);
    const swatchH = cellH - 76; // room for three text lines below the swatch
    ctx.fillStyle = row.hex;
    ctx.fillRect(x, y, cellW, swatchH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 20px Roboto, Arial, sans-serif";
    ctx.fillText(clip(ctx, row.name, cellW), x, y + swatchH + 26);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "400 16px Roboto, Arial, sans-serif";
    ctx.fillText(`SW ${row.number} · ${row.hex}`, x, y + swatchH + 48);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 14px Roboto, Arial, sans-serif";
    ctx.fillText(`${row.role} · ${row.proportion}%`, x, y + swatchH + 68);
  });

  return canvas;
}

/** Trim text with an ellipsis to fit a pixel width on the given context. */
function clip(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}
