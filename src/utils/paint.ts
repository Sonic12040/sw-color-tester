/**
 * Paint-quantity estimation — pure, so it's unit-testable and safe to render
 * server-side. Helps a shopper buy the right amount instead of guessing.
 */

import type { Surface } from "../domain/project.js";

/** Industry rules of thumb for the area a standard opening removes from walls. */
const DOOR_SQFT = 21;
const WINDOW_SQFT = 15;
/** A gallon of wall paint covers ~350 sq ft per coat. */
const DEFAULT_COVERAGE = 350;

/** L×W×H room measurements shared by the calculator and project surfaces. */
export interface RoomDimensions {
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  /** Doors to subtract (default 0). */
  doors?: number;
  /** Windows to subtract (default 0). */
  windows?: number;
}

/**
 * Pure: paintable wall area (sq ft) for a rectangular room — perimeter × height
 * minus standard door/window openings. The single source of truth for the
 * calculator and per-surface area; negatives clamp to 0 and openings can't drive
 * the result below 0.
 */
export function paintableAreaSqFt(d: RoomDimensions): number {
  const length = Math.max(0, d.lengthFt);
  const width = Math.max(0, d.widthFt);
  const height = Math.max(0, d.heightFt);
  const doors = Math.max(0, d.doors ?? 0);
  const windows = Math.max(0, d.windows ?? 0);
  const wall = 2 * (length + width) * height;
  const openings = doors * DOOR_SQFT + windows * WINDOW_SQFT;
  return Math.max(0, wall - openings);
}

/**
 * Pure: a surface's effective area in sq ft. L×W×H dimensions take precedence
 * over a directly entered area; an unmeasured surface is 0.
 */
export function resolveSurfaceArea(
  s: Pick<Surface, "areaSqFt" | "dimensions">,
): number {
  if (s.dimensions) return paintableAreaSqFt(s.dimensions);
  return Math.max(0, s.areaSqFt ?? 0);
}

export interface PaintEstimateInput {
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  /** Coats of paint (default 2). */
  coats?: number;
  /** Doors to subtract (default 0). */
  doors?: number;
  /** Windows to subtract (default 0). */
  windows?: number;
  /** Coverage per gallon in sq ft (default 350). */
  coveragePerGallon?: number;
}

export interface PaintEstimate {
  /** Total wall area before subtracting openings. */
  wallAreaSqFt: number;
  /** Wall area after subtracting doors/windows. */
  paintableSqFt: number;
  coats: number;
  /** Gallons needed (1 decimal). */
  gallons: number;
  /** Whole gallon cans to buy (rounded up). */
  cans: number;
}

/**
 * Estimate paint needed for a rectangular room. All negative inputs clamp to 0;
 * openings can't drive paintable area below 0.
 */
export function paintEstimate(input: PaintEstimateInput): PaintEstimate {
  const coverage =
    input.coveragePerGallon && input.coveragePerGallon > 0
      ? input.coveragePerGallon
      : DEFAULT_COVERAGE;
  const coats = Math.max(0, input.coats ?? 2);
  const length = Math.max(0, input.lengthFt);
  const width = Math.max(0, input.widthFt);
  const height = Math.max(0, input.heightFt);

  const wallArea = 2 * (length + width) * height;
  const paintable = paintableAreaSqFt(input);
  const needed = (paintable * coats) / coverage;

  return {
    wallAreaSqFt: Math.round(wallArea),
    paintableSqFt: Math.round(paintable),
    coats,
    gallons: Math.round(needed * 10) / 10,
    cans: Math.ceil(needed),
  };
}
