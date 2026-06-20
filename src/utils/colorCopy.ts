import type { Color } from "../data/types.js";
import type { LrvClass } from "../domain/types.js";
import { DESIGNER_COLLECTION_PREFIX } from "./config.js";
import { classifyLrv } from "./colorMath.js";

/**
 * User-facing color copy — the English prose and labels shown in the UI.
 * Isolated from the pure math in `colorMath.ts` so the strings here are the
 * single place to touch for wording changes or future localization.
 */

// Positional labels for a color's coordinating colors (coord1, coord2, white).
export const COORDINATING_ROLES = ["Accent Wall", "Trim Color", "Coordinating"];

const SIMILAR_DIFFERENTIATORS = [
  "Warmer",
  "Cooler",
  "Lighter",
  "Darker",
  "Similar Tone",
  "Alternative",
];

export interface LrvDescription {
  label: LrvClass;
  context: string;
}

const LRV_CONTEXT: Record<LrvClass, string> = {
  Dark: "Absorbs most light, creating intimate, cozy spaces.",
  Medium: "Balanced color that works in most spaces.",
  Light: "Creates bright, airy, spacious feeling.",
};

/** Human-readable label + sentence describing a color's lightness (LRV). */
export function describeLrv(lrv: number): LrvDescription {
  const label = classifyLrv(lrv);
  return {
    label,
    context: `Reflects ${lrv.toFixed(1)}% of light. ${LRV_CONTEXT[label]}`,
  };
}

/** Designer Color Collection names a color belongs to, with the prefix stripped. */
export function designerCollections(c: Color): string[] {
  return c.brandedCollectionNames
    .filter((n) => n.startsWith(DESIGNER_COLLECTION_PREFIX))
    .map((n) => n.replace(`${DESIGNER_COLLECTION_PREFIX} - `, ""));
}

/** e.g. "Interior", "Exterior", or "Interior & Exterior" (empty if neither). */
export function formatUseTypes(c: Color): string {
  return [c.isInterior && "Interior", c.isExterior && "Exterior"]
    .filter(Boolean)
    .join(" & ");
}

/** Describe how a similar color differs from the base color (for its mini-tile role). */
export function similarityRole(
  base: Color,
  other: Color,
  index: number,
): string {
  if (other.hue > base.hue + 0.05)
    return other.lightness > base.lightness ? "Warmer & Lighter" : "Warmer";
  if (other.hue < base.hue - 0.05)
    return other.lightness > base.lightness ? "Cooler & Lighter" : "Cooler";
  if (other.lightness > base.lightness + 0.05) return "Lighter";
  if (other.lightness < base.lightness - 0.05) return "Darker";
  return SIMILAR_DIFFERENTIATORS[index] ?? "Similar";
}
