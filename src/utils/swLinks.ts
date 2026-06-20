import type { Color } from "../data/types.js";

/**
 * Best-effort deep links to sherwin-williams.com for the "Get this color" panel.
 *
 * These external URL shapes are outside our control and may change if SW
 * restructures their site — keeping them in one module means a single place to
 * fix. Callers open them in a new tab.
 */

const SW_ORIGIN = "https://www.sherwin-williams.com";

/** Kebab-case a name for SW's URL slugs ("Cherry Tomato" → "cherry-tomato"). */
function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Color's page on sherwin-williams.com (where samples are ordered). */
export function swColorUrl(c: Color): string {
  return `${SW_ORIGIN}/en-us/color/color-family/SW${c.colorNumber}-${kebab(c.name)}`;
}

export const SW_STORE_LOCATOR_URL = `${SW_ORIGIN}/store-locator`;
export const SW_SAMPLES_URL = `${SW_ORIGIN}/en-us/paint-colors/order-color-chips`;
