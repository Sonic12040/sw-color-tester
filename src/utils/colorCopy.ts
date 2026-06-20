import type { Color } from "../data/types.js";
import type { LrvClass, NeutralClass, Undertone } from "../domain/types.js";
import { DESIGNER_COLLECTION_PREFIX } from "./config.js";
import { classifyLrv, neutralityBand, undertone } from "./colorMath.js";

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

const WARMTH_WORD: Record<Undertone, string> = {
  Warm: "warm",
  Cool: "cool",
  Neutral: "neutral",
};

const LIGHT_WORD: Record<LrvClass, string> = {
  Dark: "deep",
  Medium: "mid-tone",
  Light: "light",
};

const CHROMA_PHRASE: Record<NeutralClass, string> = {
  High: "soft, near-neutral color",
  Medium: "gently muted color",
  Low: "rich, saturated color",
};

const ROOM_ADVICE: Record<LrvClass, string> = {
  Dark: "It adds depth and a cozy, dramatic mood",
  Medium: "It's versatile enough to work in most rooms",
  Light: "It keeps spaces feeling bright and open",
};

/**
 * A one-sentence, jargon-free summary of a color's character — warmth +
 * lightness + chroma + a use suggestion — for shoppers who don't read LRV or
 * undertone. Deterministic (derives only from the color), so it's safe to render
 * server-side into prerendered pages and meta tags.
 */
export function summarize(c: Color): string {
  const band = classifyLrv(c.lrv ?? 0);
  const family = c.colorFamilyNames[0];
  const noun =
    !family || family === "NA" || family.toLowerCase() === "neutral"
      ? "shade"
      : family.toLowerCase();
  return (
    `${c.name} is a ${LIGHT_WORD[band]} ${WARMTH_WORD[undertone(c)]} ${noun} ` +
    `with ${CHROMA_PHRASE[neutralityBand(c)]}. ${ROOM_ADVICE[band]}.`
  );
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
