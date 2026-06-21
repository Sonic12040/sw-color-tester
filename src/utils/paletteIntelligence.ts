import type { Color } from "../data/types.js";
import type { PaletteRole, SchemeType } from "../domain/types.js";
import { neutrality } from "./colorMath.js";

/**
 * Palette intelligence (E11) — turning the catalog into guidance: generate
 * harmonious schemes from a color, suggest companions for a palette, and assign
 * 60-30-10 usage roles. Pure and referentially transparent (the catalog and any
 * overrides are passed in), built on the channel math in `colorMath.ts`. The
 * user-facing rationale strings live in `colorCopy.ts`.
 */

/** Saturation at/below which hue is meaningless, so hue-rotated schemes don't apply. */
const NEUTRAL_SATURATION = 0.1;

export const SCHEME_TYPES: SchemeType[] = [
  "complementary",
  "analogous",
  "triadic",
  "split-complementary",
  "monochromatic",
];

export const PALETTE_ROLES: PaletteRole[] = ["Dominant", "Secondary", "Accent"];

interface HslTarget {
  hue: number; // 0–1
  saturation: number; // 0–1
  lightness: number; // 0–1
}

/** Hue offset (turns, 0–1) + lightness delta for each point a scheme aims at. */
const SCHEME_TARGETS: Record<SchemeType, { dh: number; dl: number }[]> = {
  complementary: [
    { dh: 0.5, dl: 0 },
    { dh: 0.5, dl: 0.18 },
    { dh: 0.5, dl: -0.18 },
  ],
  analogous: [
    { dh: 1 / 12, dl: 0 },
    { dh: -1 / 12, dl: 0 },
    { dh: 1 / 6, dl: 0.1 },
  ],
  triadic: [
    { dh: 1 / 3, dl: 0 },
    { dh: 2 / 3, dl: 0 },
    { dh: 1 / 3, dl: 0.15 },
  ],
  "split-complementary": [
    { dh: 0.5 - 1 / 12, dl: 0 },
    { dh: 0.5 + 1 / 12, dl: 0 },
    { dh: 0.5, dl: 0.15 },
  ],
  monochromatic: [
    { dh: 0, dl: 0.25 },
    { dh: 0, dl: -0.2 },
    { dh: 0, dl: -0.4 },
  ],
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Shortest distance between two hues on the wheel, normalized to 0–1. */
function hueDistance(a: number, b: number): number {
  let d = Math.abs(a - b) % 1;
  if (d > 0.5) d = 1 - d;
  return d * 2; // 0 (same) … 1 (opposite)
}

/**
 * Distance from an ideal HSL target to a real color. Hue dominates, then
 * lightness, then saturation; hue is down-weighted when either side is a
 * near-neutral (its hue is just the direction of a faint tint).
 */
function targetDistance(target: HslTarget, c: Color): number {
  const hueWeight =
    Math.min(target.saturation, c.saturation) <= NEUTRAL_SATURATION ? 0.2 : 1;
  const dh = hueDistance(target.hue, c.hue);
  const ds = Math.abs(target.saturation - c.saturation);
  const dl = Math.abs(target.lightness - c.lightness);
  return hueWeight * dh * dh + 0.8 * dl * dl + 0.4 * ds * ds;
}

/** Nearest catalog color to an HSL target, skipping any excluded ids. */
function nearestColor(
  target: HslTarget,
  catalog: Color[],
  exclude: Set<string>,
): Color | null {
  let best: Color | null = null;
  let bestD = Infinity;
  for (const c of catalog) {
    if (exclude.has(c.id)) continue;
    const d = targetDistance(target, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * Generate a color scheme from `base`: for each ideal target the scheme defines,
 * snap to the nearest real catalog color (never off-catalog), de-duplicated and
 * excluding the base. Hue-rotated schemes return `[]` for a near-neutral base
 * (its hue is meaningless); monochromatic still works (it varies lightness).
 */
export function schemeFromColor(
  base: Color,
  type: SchemeType,
  catalog: Color[],
): Color[] {
  if (type !== "monochromatic" && base.saturation <= NEUTRAL_SATURATION) {
    return [];
  }
  const exclude = new Set<string>([base.id]);
  const out: Color[] = [];
  for (const { dh, dl } of SCHEME_TARGETS[type]) {
    const match = nearestColor(
      {
        hue: (base.hue + dh + 1) % 1,
        saturation: base.saturation,
        lightness: clamp01(base.lightness + dl),
      },
      catalog,
      exclude,
    );
    if (match) {
      exclude.add(match.id);
      out.push(match);
    }
  }
  return out;
}

/** LRV-weighted spread of a palette (how wide its light/dark range is). */
function lrvRange(colors: Color[]): { min: number; max: number; mean: number } {
  if (colors.length === 0) return { min: 0, max: 0, mean: 0 };
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const c of colors) {
    min = Math.min(min, c.lrv);
    max = Math.max(max, c.lrv);
    sum += c.lrv;
  }
  return { min, max, mean: sum / colors.length };
}

/** A near-duplicate of an existing palette color (so we never suggest a dupe). */
function isNearDuplicate(candidate: Color, palette: Color[]): boolean {
  return palette.some(
    (p) =>
      hueDistance(candidate.hue, p.hue) < 0.06 &&
      Math.abs(candidate.lrv - p.lrv) < 6 &&
      Math.abs(candidate.saturation - p.saturation) < 0.1,
  );
}

/**
 * Suggest companion colors that round out a palette: it rewards moving the
 * palette toward neutrality balance (an accent for an all-neutral set, a calming
 * neutral for an all-colorful one), widening the light/dark range, and adding hue
 * variety — while excluding palette members and near-duplicates of them.
 * Deterministic: ties break by catalog order.
 */
export function suggestCompanions(
  palette: Color[],
  catalog: Color[],
  count = 3,
): Color[] {
  if (palette.length === 0) return [];
  const ids = new Set(palette.map((c) => c.id));
  const meanNeutrality =
    palette.reduce((s, c) => s + neutrality(c), 0) / palette.length;
  const { mean: meanLrv } = lrvRange(palette);

  // What the palette is short on: an accent (when mostly neutral) or a neutral
  // (when mostly colorful); near-balanced palettes get a mild mid preference.
  const wantsAccent = meanNeutrality >= 70;
  const wantsNeutral = meanNeutrality <= 45;

  const scored = catalog
    .filter((c) => !ids.has(c.id) && !isNearDuplicate(c, palette))
    .map((c) => {
      const n = neutrality(c);
      let balance: number;
      if (wantsAccent)
        balance = (100 - n) / 100; // reward colorful
      else if (wantsNeutral)
        balance = n / 100; // reward neutral
      else balance = 1 - Math.abs(n - 55) / 100; // reward mid
      // Reward extending the light/dark range and adding hue separation.
      const rangeGain = Math.min(1, Math.abs(c.lrv - meanLrv) / 60);
      const hueGain = Math.min(
        ...palette.map((p) => hueDistance(c.hue, p.hue)),
      );
      const score = 0.5 * balance + 0.3 * rangeGain + 0.2 * hueGain;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, count).map((s) => s.c);
}

export interface RoleAssignment {
  id: string;
  role: PaletteRole;
  /** Recommended share of the scheme, in whole percent (sums to ~100). */
  proportion: number;
}

/** "Calmness" 0–1: neutral + light reads as a large-surface (dominant) color. */
function calmness(c: Color): number {
  return 0.6 * (neutrality(c) / 100) + 0.4 * c.lightness;
}

/** Whole-percent split of a group's total weight across `n` members. */
function splitProportion(total: number, n: number): number[] {
  if (n === 0) return [];
  const each = Math.round(total / n);
  const out = Array<number>(n).fill(each);
  out[n - 1] = total - each * (n - 1); // absorb rounding into the last member
  return out;
}

/** Group totals for the roles actually present, normalized to sum to 100. */
const ROLE_WEIGHT: Record<PaletteRole, number> = {
  Dominant: 60,
  Secondary: 30,
  Accent: 10,
};

/**
 * Assign 60-30-10 roles across a palette. The calmest color (neutral + light)
 * becomes Dominant and the most colorful/dramatic becomes Accent; the rest are
 * Secondary. `overrides` (by color id) pin a role; proportions are then split
 * across whichever roles are present so they always total ~100.
 */
export function assignRoles(
  colors: Color[],
  overrides: Record<string, PaletteRole | undefined> = {},
): RoleAssignment[] {
  const n = colors.length;
  if (n === 0) return [];

  const role: Record<string, PaletteRole> = {};

  // Auto-assign from calmness for the colors without an override.
  const autoIds = colors.filter((c) => !overrides[c.id]).map((c) => c.id);
  const ranked = [...autoIds].sort(
    (a, b) =>
      calmness(colors.find((c) => c.id === b)!) -
      calmness(colors.find((c) => c.id === a)!),
  );
  ranked.forEach((id, i) => {
    if (i === 0) role[id] = "Dominant";
    else if (i === ranked.length - 1 && ranked.length >= 3) role[id] = "Accent";
    else role[id] = "Secondary";
  });
  for (const c of colors) {
    const o = overrides[c.id];
    if (o) role[c.id] = o;
  }

  // Normalize group weights to the roles actually present, then split per member.
  const members: Record<PaletteRole, string[]> = {
    Dominant: [],
    Secondary: [],
    Accent: [],
  };
  for (const c of colors) members[role[c.id]].push(c.id);
  const presentTotal = PALETTE_ROLES.filter(
    (r) => members[r].length > 0,
  ).reduce((s, r) => s + ROLE_WEIGHT[r], 0);

  const proportion: Record<string, number> = {};
  let remaining = 100;
  const presentRoles = PALETTE_ROLES.filter((r) => members[r].length > 0);
  presentRoles.forEach((r, ri) => {
    const groupTotal =
      ri === presentRoles.length - 1
        ? remaining // last role absorbs rounding so the whole thing sums to 100
        : Math.round((ROLE_WEIGHT[r] / presentTotal) * 100);
    remaining -= groupTotal;
    const shares = splitProportion(groupTotal, members[r].length);
    members[r].forEach((id, i) => (proportion[id] = shares[i]));
  });

  return colors.map((c) => ({
    id: c.id,
    role: role[c.id],
    proportion: proportion[c.id],
  }));
}
