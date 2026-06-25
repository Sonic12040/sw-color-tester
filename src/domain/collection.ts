/**
 * Editorial collections (E12) — derived from the dataset's
 * `brandedCollectionNames`: a collection is the set of colors that share a
 * branded name (designer collections excluded). The grouping lives in
 * `utils/collections.ts`; this module just holds the resolved shapes the pages
 * and OG cards render.
 */

import type { Color } from "../data/types.js";

/** A collection with its colors resolved — what pages and OG cards render. */
export interface ResolvedCollection {
  slug: string;
  title: string;
  blurb: string;
  hero: Color;
  colors: Color[];
}

/** A back-reference from a color to a collection it appears in (US12.3). */
export interface CollectionRef {
  slug: string;
  title: string;
}
