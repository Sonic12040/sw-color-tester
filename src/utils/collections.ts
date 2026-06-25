/**
 * Pure resolution for editorial collections (E12) — turn the authored
 * `CollectionContent` (SW numbers + a publish flag) into `ResolvedCollection`s
 * with real `Color` objects, and build the reverse color→collections map for
 * cross-linking (US12.3). Framework-free + dependency-injected color lookup, so
 * the same logic runs in `ColorModel`, the prerender, and unit tests.
 */

import type { Color } from "../data/types.js";
import type {
  CollectionContent,
  CollectionRef,
  ResolvedCollection,
} from "../domain/collection.js";

type ColorByNumber = (colorNumber: string) => Color | undefined;

/** Resolve one collection, dropping unknown SW numbers. Returns `null` if it's
 *  unpublished or has no resolvable colors. Hero defaults to the first color. */
export function resolveCollection(
  content: CollectionContent,
  getByNumber: ColorByNumber,
): ResolvedCollection | null {
  if (!content.published) return null;
  const colors = content.colorNumbers
    .map(getByNumber)
    .filter((c): c is Color => Boolean(c));
  if (colors.length === 0) return null;
  const hero =
    (content.heroNumber ? getByNumber(content.heroNumber) : undefined) ??
    colors[0];
  return {
    slug: content.slug,
    title: content.title,
    blurb: content.blurb,
    hero,
    colors,
  };
}

/** Resolve all published collections, preserving authoring order. */
export function resolveCollections(
  content: CollectionContent[],
  getByNumber: ColorByNumber,
): ResolvedCollection[] {
  return content
    .map((c) => resolveCollection(c, getByNumber))
    .filter((c): c is ResolvedCollection => c !== null);
}

/**
 * Build the reverse index: SW number → the collections that feature it (US12.3),
 * across the already-resolved (published, valid) collections. Order follows the
 * collections' order.
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
