/**
 * Editorial collections (E12) are derived from the **dataset itself**: every
 * color carries its `brandedCollectionNames` (e.g. "Timeless Color Wall",
 * "Top 50 Interior Colors"), so a collection is just the set of colors that
 * share a name. Designer collections (the `DESIGNER_COLLECTION_PREFIX` ones,
 * surfaced separately as "Designer Pick") are excluded.
 *
 * Pure + framework-free: `ColorModel` builds the collections once and exposes
 * them; the prerender and unit tests reuse the same functions.
 */

import type { Color } from "../data/types.js";
import type {
  CollectionRef,
  ResolvedCollection,
} from "../domain/collection.js";

/** Kebab-case a branded collection name into a stable URL slug. */
export function collectionSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "collection"
  );
}

/** Up to `n` most common color families in a collection (for the blurb). */
function topFamilies(colors: Color[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const c of colors) {
    const fam = c.colorFamilyNames[0];
    if (fam) counts.set(fam, (counts.get(fam) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([fam]) => fam);
}

/** Join a short list in prose: "A", "A and B", "A, B, and C". */
function proseList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Plain-language blurb for a dataset-derived collection (meta + OG copy). */
export function describeCollection(name: string, colors: Color[]): string {
  const families = topFamilies(colors, 3);
  const fam = families.length ? `, spanning ${proseList(families)} tones` : "";
  return (
    `${colors.length} Sherwin-Williams paint color${colors.length === 1 ? "" : "s"} ` +
    `in the ${name} collection${fam}.`
  );
}

/**
 * Group active colors into collections by their branded collection names,
 * skipping any name `isExcluded` flags (designer collections). Colors keep
 * dataset order within a collection; collections are sorted by size (largest
 * first), then name. Slug collisions are disambiguated deterministically.
 */
export function buildCollections(
  colors: Color[],
  isExcluded: (name: string) => boolean,
): ResolvedCollection[] {
  const byName = new Map<string, Color[]>();
  for (const c of colors) {
    for (const name of c.brandedCollectionNames) {
      if (isExcluded(name)) continue;
      const arr = byName.get(name);
      if (arr) arr.push(c);
      else byName.set(name, [c]);
    }
  }

  const names = [...byName.keys()].sort((a, b) => {
    const sizeDelta =
      (byName.get(b)?.length ?? 0) - (byName.get(a)?.length ?? 0);
    return sizeDelta !== 0 ? sizeDelta : a.localeCompare(b);
  });

  const usedSlugs = new Set<string>();
  const out: ResolvedCollection[] = [];
  for (const name of names) {
    const cols = byName.get(name) ?? [];
    if (cols.length === 0) continue;
    const baseSlug = collectionSlug(name);
    let slug = baseSlug;
    for (let i = 2; usedSlugs.has(slug); i += 1) slug = `${baseSlug}-${i}`;
    usedSlugs.add(slug);
    out.push({
      slug,
      title: name,
      blurb: describeCollection(name, cols),
      hero: cols[0],
      colors: cols,
    });
  }
  return out;
}

/**
 * Build the reverse index: SW number → the collections that feature it (US12.3),
 * across the already-built collections. Order follows the collections' order.
 */
export function collectionRefsByColorNumber(
  resolved: ResolvedCollection[],
): Map<string, CollectionRef[]> {
  const map = new Map<string, CollectionRef[]>();
  for (const col of resolved) {
    for (const color of col.colors) {
      const refs = map.get(color.colorNumber) ?? [];
      refs.push({ slug: col.slug, title: col.title });
      map.set(color.colorNumber, refs);
    }
  }
  return map;
}
