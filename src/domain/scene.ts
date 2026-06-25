/**
 * Room Visualizer scenes (E9) — curated, build-time room scenes a shopper can
 * preview a color in ("see it in context"). v1 is fully client-side and uses
 * **procedural SVG scenes** rather than photography: each scene declares its
 * recolorable wall rectangles (the "mask") plus a static foreground (floor,
 * window, furniture) drawn over them. The renderer fills the walls with the
 * chosen color and multiplies a shading gradient over them to keep depth — the
 * same idea as a photo + wall-mask, with no binary assets to ship.
 */

/** A recolored wall region, in the scene's viewBox units. */
export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Scene {
  /** URL slug (deep links: `?scene=<slug>`). */
  slug: string;
  /** Display name, e.g. "Living room". */
  name: string;
  /** viewBox width/height (scenes are responsive — they scale to fit). */
  width: number;
  height: number;
  /** Wall rectangles painted with the chosen color. */
  walls: WallRect[];
  /** Static foreground SVG markup drawn over the walls (floor, window, furniture). */
  foreground: string;
}
