import type { Color } from "../data/types.js";
import {
  LRV_THRESHOLDS,
  NEUTRALITY_THRESHOLDS,
  DESIGNER_COLLECTION_PREFIX,
} from "./config.js";

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

export type LrvClass = "Dark" | "Medium" | "Light";

export const LRV_CLASSES: LrvClass[] = ["Dark", "Medium", "Light"];

/** Classify a color's lightness (LRV) into Dark / Medium / Light. */
export function classifyLrv(lrv: number): LrvClass {
  if (lrv < LRV_THRESHOLDS.DARK) return "Dark";
  if (lrv > LRV_THRESHOLDS.LIGHT) return "Light";
  return "Medium";
}

export type Undertone = "Warm" | "Cool" | "Neutral";

export const UNDERTONES: Undertone[] = ["Warm", "Cool", "Neutral"];

/** Saturation at/below which a color reads as a neutral regardless of hue. */
const NEUTRAL_SATURATION = 0.1;

/**
 * Derive a color's temperature/undertone from its HSL hue + saturation.
 * Low-saturation colors are Neutral; otherwise warm = reds→yellows + magentas,
 * cool = greens→blues. (`hue` is stored 0–1, so ×360 for degrees.)
 */
export function undertone(c: Color): Undertone {
  if (c.saturation <= NEUTRAL_SATURATION) return "Neutral";
  const h = c.hue * 360;
  if (h < 75 || h >= 320) return "Warm";
  if (h >= 140 && h < 290) return "Cool";
  return "Neutral"; // yellow-greens (75–140) / magentas (290–320): ambiguous
}

export type NeutralClass = "High" | "Medium" | "Low";

export const NEUTRAL_CLASSES: NeutralClass[] = ["High", "Medium", "Low"];

/** Chroma (C*ab) at which a color is treated as fully colorful (score floor). */
const NEUTRAL_CHROMA_REF = 60;

/**
 * Neutrality score 0–100 (100 = perfectly gray). Neutrality is the inverse of
 * chroma; the dominant term is perceptual CIELAB chroma (C*ab = √(a²+b²)),
 * corroborated by the RGB channel spread (how close r,g,b are) and HSL
 * saturation. Hue is intentionally excluded — it's only the *direction* of a
 * residual tint, not how neutral a color is (see `undertone` for that).
 */
export function neutrality(c: Color): number {
  const spread =
    (Math.max(c.red, c.green, c.blue) - Math.min(c.red, c.green, c.blue)) / 255;
  const chromaTerm = c.lab
    ? Math.min(1, Math.hypot(c.lab.A, c.lab.B) / NEUTRAL_CHROMA_REF)
    : spread; // fallback when LAB is unavailable
  const colorfulness = 0.6 * chromaTerm + 0.25 * spread + 0.15 * c.saturation;
  return Math.round(100 * (1 - Math.min(1, Math.max(0, colorfulness))));
}

/** Classify neutrality into High (near-gray) / Medium (muted) / Low (colorful). */
export function neutralityBand(c: Color): NeutralClass {
  const n = neutrality(c);
  if (n >= NEUTRALITY_THRESHOLDS.HIGH) return "High";
  if (n >= NEUTRALITY_THRESHOLDS.MEDIUM) return "Medium";
  return "Low";
}

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
