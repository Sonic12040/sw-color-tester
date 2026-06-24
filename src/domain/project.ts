/**
 * Structured project model (E15): a palette can optionally describe a real job
 * as Rooms → Surfaces, each surface assigned a color + finish + coats + measured
 * area. Pure types + the small runtime vocabularies (surface types, finishes)
 * the UI and serializer share, so the same unions aren't re-declared per module.
 *
 * The flat color list (see `PaletteEntry` in the context) stays the default;
 * rooms are opt-in progressive disclosure.
 */

/** What is being painted — drives the work order's per-surface rows. */
export type SurfaceType =
  | "wall"
  | "ceiling"
  | "trim"
  | "door"
  | "cabinet"
  | "other";

/** Sheen, low → high gloss. */
export type Finish = "flat" | "eggshell" | "satin" | "semi-gloss" | "gloss";

export const SURFACE_TYPES: { key: SurfaceType; label: string }[] = [
  { key: "wall", label: "Wall" },
  { key: "ceiling", label: "Ceiling" },
  { key: "trim", label: "Trim" },
  { key: "door", label: "Door" },
  { key: "cabinet", label: "Cabinet" },
  { key: "other", label: "Other" },
];

export const FINISHES: { key: Finish; label: string }[] = [
  { key: "flat", label: "Flat" },
  { key: "eggshell", label: "Eggshell" },
  { key: "satin", label: "Satin" },
  { key: "semi-gloss", label: "Semi-Gloss" },
  { key: "gloss", label: "Gloss" },
];

export const isSurfaceType = (v: unknown): v is SurfaceType =>
  SURFACE_TYPES.some((s) => s.key === v);

export const isFinish = (v: unknown): v is Finish =>
  FINISHES.some((f) => f.key === v);

export const surfaceTypeLabel = (t: SurfaceType): string =>
  SURFACE_TYPES.find((s) => s.key === t)?.label ?? "Other";

export const finishLabel = (f: Finish | undefined): string | null =>
  f ? (FINISHES.find((x) => x.key === f)?.label ?? null) : null;

/** Room measurements the paint-calculator area math turns into paintable sq ft. */
export interface SurfaceDimensions {
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  doors?: number;
  windows?: number;
}

/** One paintable surface in a room. */
export interface Surface {
  id: string;
  type: SurfaceType;
  /** Assigned color id (from the project's color list); absent = unassigned. */
  colorId?: string;
  finish?: Finish;
  /** Coats to apply (defaults to 2 when a surface is added). */
  coats?: number;
  /** Directly measured area in sq ft. Ignored when `dimensions` is set. */
  areaSqFt?: number;
  /** L×W×H measurement; takes precedence over `areaSqFt` when present. */
  dimensions?: SurfaceDimensions;
}

/** A room is a named group of surfaces. */
export interface Room {
  id: string;
  name: string;
  surfaces: Surface[];
}
