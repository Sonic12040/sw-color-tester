import type { Color } from "../data/types.js";
import type { Undertone, LrvClass, NeutralClass } from "../domain/types.js";
import { LRV_THRESHOLDS, NEUTRALITY_THRESHOLDS } from "./config.js";

/**
 * Pure color math — deriving classifications and CSS values from a color's
 * numeric channels (RGB / HSL / LAB). No user-facing prose lives here; that's
 * in `colorCopy.ts`. Everything in this module is referentially transparent.
 */

/** CSS `hsl()` string for a color's swatch background. */
export function hsl(c: Color): string {
  return `hsl(${c.hue * 360}deg ${c.saturation * 100}% ${c.lightness * 100}%)`;
}

/** Readable text color (white/black) for a swatch of the given LRV. */
export function contrastText(lrv: number): "white" | "black" {
  return lrv < LRV_THRESHOLDS.CONTRAST ? "white" : "black";
}

export const LRV_CLASSES: LrvClass[] = ["Dark", "Medium", "Light"];

/** Classify a color's lightness (LRV) into Dark / Medium / Light. */
export function classifyLrv(lrv: number): LrvClass {
  if (lrv < LRV_THRESHOLDS.DARK) return "Dark";
  if (lrv > LRV_THRESHOLDS.LIGHT) return "Light";
  return "Medium";
}

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
