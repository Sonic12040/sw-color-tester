import type { Color } from "../data/types.js";
import { LRV_THRESHOLDS, DESIGNER_COLLECTION_PREFIX } from "./config.js";

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

/** CSS `hsl()` string for a color's swatch background. */
export function hsl(c: Color): string {
  return `hsl(${c.hue * 360}deg ${c.saturation * 100}% ${c.lightness * 100}%)`;
}

/** Readable text color (white/black) for a swatch of the given LRV. */
export function contrastText(lrv: number): "white" | "black" {
  return lrv < LRV_THRESHOLDS.CONTRAST ? "white" : "black";
}

export interface LrvDescription {
  label: string;
  context: string;
}

/** Human-readable label + sentence describing a color's lightness (LRV). */
export function describeLrv(lrv: number): LrvDescription {
  const value = lrv.toFixed(1);
  if (lrv < LRV_THRESHOLDS.DARK) {
    return {
      label: "Dark",
      context: `Reflects ${value}% of light. Absorbs most light, creating intimate, cozy spaces.`,
    };
  }
  if (lrv > LRV_THRESHOLDS.LIGHT) {
    return {
      label: "Light",
      context: `Reflects ${value}% of light. Creates bright, airy, spacious feeling.`,
    };
  }
  return {
    label: "Medium",
    context: `Reflects ${value}% of light. Balanced color that works in most spaces.`,
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
