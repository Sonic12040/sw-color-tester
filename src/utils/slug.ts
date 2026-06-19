import type { Color } from "../data/types.js";

/** Lowercase, hyphenated, alphanumeric-only token (for URL slugs). */
function kebab(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Canonical URL slug for a color, e.g. `sw-6840-exuberant-pink`.
 *
 * Built from `colorNumber` + `name` because `Color.id` (e.g. `bright-2527`) is
 * an opaque internal id unrelated to the SW number. The number + kebab name is
 * effectively unique, which keeps prerendered file paths collision-free.
 */
export function toSlug(color: Color): string {
  return `sw-${kebab(color.colorNumber)}-${kebab(color.name)}`;
}
