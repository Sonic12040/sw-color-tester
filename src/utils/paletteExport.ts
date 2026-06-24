import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Color } from "../data/types.js";
import type { PaletteRole } from "../domain/types.js";
import { finishLabel, surfaceTypeLabel, type Room } from "../domain/project.js";
import type { ColorAnnotation } from "./ExportService.js";
import { undertone, classifyLrv } from "./colorMath.js";
import { estimateProjectQuantities, resolveSurfaceArea } from "./paint.js";
import { buildShoppingList, type ShoppingItem } from "./workOrder.js";
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

// ── Work Order (painter spec sheet, E16) ──────────────────────────────────

/** One resolved surface row in a work order. */
export interface WorkOrderSurface {
  type: string;
  colorName: string | null;
  colorNumber: string | null;
  hex: string | null;
  finish: string | null;
  coats: number | null;
  areaSqFt: number;
}

/** A room section with its surfaces, summed area, and paint estimate (E16.2). */
export interface WorkOrderRoom {
  name: string;
  surfaces: WorkOrderSurface[];
  totalAreaSqFt: number;
  gallons: number;
  cans: number;
}

/** A per-color paint total, aggregated across rooms (E16.2). */
export interface WorkOrderColor {
  name: string;
  number: string;
  hex: string;
  areaSqFt: number;
  gallons: number;
  cans: number;
}

/** A fully-resolved work order: room sections, per-color totals, shopping list. */
export interface WorkOrder {
  rooms: WorkOrderRoom[];
  byColor: WorkOrderColor[];
  /** Consolidated buy list, one row per color × finish (US16.3). */
  shoppingList: ShoppingItem[];
  totalAreaSqFt: number;
  totalGallons: number;
  totalCans: number;
}

/**
 * Pure: resolve a project's rooms → surfaces into a work order — display rows
 * plus per-room and per-color quantity estimates (`estimateProjectQuantities`
 * does the area × coats ÷ coverage math). Surfaces with no measurement count as
 * 0 sq ft; per-color totals aggregate assigned surfaces across rooms.
 */
export function buildWorkOrder(
  rooms: Room[],
  colorsById: Map<string, Color>,
): WorkOrder {
  const q = estimateProjectQuantities(rooms);
  const roomQById = new Map(q.rooms.map((r) => [r.roomId, r]));

  const woRooms: WorkOrderRoom[] = rooms.map((room) => {
    const surfaces: WorkOrderSurface[] = room.surfaces.map((s) => {
      const color = s.colorId ? colorsById.get(s.colorId) : undefined;
      return {
        type: surfaceTypeLabel(s.type),
        colorName: color?.name ?? null,
        colorNumber: color?.colorNumber ?? null,
        hex: color ? color.hex.toUpperCase() : null,
        finish: finishLabel(s.finish),
        coats: s.coats ?? null,
        areaSqFt: resolveSurfaceArea(s),
      };
    });
    const rq = roomQById.get(room.id);
    return {
      name: room.name,
      surfaces,
      totalAreaSqFt: rq?.areaSqFt ?? 0,
      gallons: rq?.gallons ?? 0,
      cans: rq?.cans ?? 0,
    };
  });

  // Resolve the per-color totals to names, dropping any color no longer present.
  const byColor: WorkOrderColor[] = q.byColor.flatMap((c) => {
    const color = colorsById.get(c.colorId);
    if (!color) return [];
    return [
      {
        name: color.name,
        number: color.colorNumber,
        hex: color.hex.toUpperCase(),
        areaSqFt: c.areaSqFt,
        gallons: c.gallons,
        cans: c.cans,
      },
    ];
  });

  return {
    rooms: woRooms,
    byColor,
    shoppingList: buildShoppingList(rooms, colorsById),
    totalAreaSqFt: q.totalAreaSqFt,
    totalGallons: q.totalGallons,
    totalCans: q.totalCans,
  };
}

/** Whole-gallon shorthand for headers/summaries, e.g. "~3.7 gal · 4 cans".
 *  Uses ASCII "~" (not "≈") so the standard WinAnsi PDF font can encode it. */
function qtyLabel(gallons: number, cans: number): string {
  return `~${gallons} gal · ${cans} can${cans === 1 ? "" : "s"}`;
}

/** Build a Work Order PDF (US Letter): per-room surface tables + paint totals. */
export async function buildWorkOrderPdf(
  workOrder: WorkOrder,
  opts: { project: string; now: Date },
): Promise<Uint8Array> {
  const { rooms, byColor } = workOrder;
  const doc = await PDFDocument.create();
  doc.setTitle(`${opts.project} — work order`);
  doc.setCreator("Sherwin-Williams Color Atlas");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 48;
  const ROW_H = 30;
  const ink = rgb(0.1, 0.1, 0.11);
  const muted = rgb(0.4, 0.4, 0.42);
  const hairline = rgb(0.85, 0.85, 0.86);

  // Column x-offsets from the left margin (swatch + 5 text columns).
  const COL = {
    swatch: 0,
    color: 40,
    type: 250,
    finish: 350,
    coats: 450,
    area: 510,
  };
  const SWATCH = 24;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const text = (
    s: string,
    x: number,
    yy: number,
    size = 10,
    f = font,
    color = ink,
  ) => page.drawText(s, { x: MARGIN + x, y: yy, size, font: f, color });

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  text(opts.project, 0, y - 18, 20, bold);
  text(
    `Work order · Sherwin-Williams Color Atlas · ${opts.now.toISOString().slice(0, 10)} · ${Math.round(workOrder.totalAreaSqFt)} sq ft · ${qtyLabel(workOrder.totalGallons, workOrder.totalCans)}`,
    0,
    y - 36,
    10,
    font,
    muted,
  );
  y -= 64;

  for (const room of rooms) {
    if (y - ROW_H * 2 < MARGIN) newPage();
    // Room heading + area/paint total.
    text(room.name, 0, y, 13, bold);
    text(
      `${room.surfaces.length} surface${room.surfaces.length === 1 ? "" : "s"} · ${Math.round(room.totalAreaSqFt)} sq ft · ${qtyLabel(room.gallons, room.cans)}`,
      COL.area - 160,
      y,
      9,
      font,
      muted,
    );
    y -= 16;
    // Column header.
    text("COLOR", COL.color, y, 8, bold, muted);
    text("SURFACE", COL.type, y, 8, bold, muted);
    text("FINISH", COL.finish, y, 8, bold, muted);
    text("COATS", COL.coats, y, 8, bold, muted);
    text("AREA", COL.area, y, 8, bold, muted);
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1,
      color: hairline,
    });
    y -= ROW_H;

    if (room.surfaces.length === 0) {
      text("No surfaces yet.", COL.color, y + 10, 9, font, muted);
      y -= 8;
    }

    for (const s of room.surfaces) {
      if (y < MARGIN) {
        newPage();
        y -= ROW_H;
      }
      if (s.hex) {
        const { r, g, b } = hexToRgb(s.hex);
        page.drawRectangle({
          x: MARGIN + COL.swatch,
          y: y + 2,
          width: SWATCH,
          height: SWATCH,
          color: rgb(r / 255, g / 255, b / 255),
          borderColor: hairline,
          borderWidth: 1,
        });
      }
      const colorLabel = s.colorName
        ? `${s.colorName}${s.colorNumber ? `  ·  SW ${s.colorNumber}` : ""}`
        : "Unassigned";
      text(colorLabel, COL.color, y + 14, 10, bold, s.colorName ? ink : muted);
      text(s.type, COL.type, y + 14);
      text(s.finish ?? "—", COL.finish, y + 14);
      text(s.coats != null ? String(s.coats) : "—", COL.coats, y + 14);
      text(
        s.areaSqFt > 0 ? `${Math.round(s.areaSqFt)}` : "—",
        COL.area,
        y + 14,
      );
      y -= ROW_H;
    }
    y -= 12;
  }

  // Paint by color — totals aggregated across rooms (E16.2).
  if (byColor.length > 0) {
    if (y - ROW_H * 3 < MARGIN) newPage();
    const SUM = { area: 300, paint: 390 };
    text("Paint by color", 0, y, 13, bold);
    y -= 16;
    text("COLOR", COL.color, y, 8, bold, muted);
    text("AREA", SUM.area, y, 8, bold, muted);
    text("PAINT", SUM.paint, y, 8, bold, muted);
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1,
      color: hairline,
    });
    y -= ROW_H;

    for (const c of byColor) {
      if (y < MARGIN) {
        newPage();
        y -= ROW_H;
      }
      const { r, g, b } = hexToRgb(c.hex);
      page.drawRectangle({
        x: MARGIN + COL.swatch,
        y: y + 2,
        width: SWATCH,
        height: SWATCH,
        color: rgb(r / 255, g / 255, b / 255),
        borderColor: hairline,
        borderWidth: 1,
      });
      text(`${c.name}  ·  SW ${c.number}`, COL.color, y + 14, 10, bold);
      text(`${Math.round(c.areaSqFt)} sq ft`, SUM.area, y + 14);
      text(qtyLabel(c.gallons, c.cans), SUM.paint, y + 14);
      y -= ROW_H;
    }
    y -= 8;
    text(
      `Estimated at ~350 sq ft per gallon — confirm coverage on the can.`,
      0,
      y,
      8,
      font,
      muted,
    );
    y -= 24;
  }

  // Shopping list — one row per color × finish, with rack + cans (US16.3).
  if (workOrder.shoppingList.length > 0) {
    if (y - ROW_H * 3 < MARGIN) newPage();
    const SHOP = { finish: 250, rack: 360, cans: 470 };
    text("Shopping list", 0, y, 13, bold);
    y -= 16;
    text("COLOR", COL.color, y, 8, bold, muted);
    text("FINISH", SHOP.finish, y, 8, bold, muted);
    text("RACK", SHOP.rack, y, 8, bold, muted);
    text("CANS", SHOP.cans, y, 8, bold, muted);
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1,
      color: hairline,
    });
    y -= ROW_H;

    for (const it of workOrder.shoppingList) {
      if (y < MARGIN) {
        newPage();
        y -= ROW_H;
      }
      const { r, g, b } = hexToRgb(it.hex);
      page.drawRectangle({
        x: MARGIN + COL.swatch,
        y: y + 2,
        width: SWATCH,
        height: SWATCH,
        color: rgb(r / 255, g / 255, b / 255),
        borderColor: hairline,
        borderWidth: 1,
      });
      text(`${it.name}  ·  SW ${it.number}`, COL.color, y + 14, 10, bold);
      text(it.finishLabel ?? "—", SHOP.finish, y + 14);
      text(it.rack ?? "—", SHOP.rack, y + 14);
      text(`${it.cans} can${it.cans === 1 ? "" : "s"}`, SHOP.cans, y + 14);
      y -= ROW_H;
    }
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
