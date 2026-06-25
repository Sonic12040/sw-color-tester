/**
 * Editorial collections (E12) — curated, build-time "trend / story" groupings of
 * colors that get their own prerendered landing pages. Two shapes:
 *
 * - `CollectionContent` is the **authoring** model (US12.2): a flat, hand-edited
 *   record referencing colors by their SW number, with a `published` flag. New
 *   collections are added by editing the data file — no component changes.
 * - `ResolvedCollection` is the runtime view: the same metadata with the SW
 *   numbers resolved to real `Color` objects (missing numbers dropped).
 */

import type { Color } from "../data/types.js";

/** Build-time authoring record for one curated collection. */
export interface CollectionContent {
  /** URL slug: `/collections/<slug>`. Stable; kebab-case. */
  slug: string;
  title: string;
  /** One-paragraph editorial blurb (also the meta description + OG text). */
  blurb: string;
  /** SW number of the lead/hero color; falls back to the first featured color. */
  heroNumber?: string;
  /** Ordered SW numbers of the featured colors (order is respected). */
  colorNumbers: string[];
  /** Draft entries (`false`) are excluded from build, render, and sitemap. */
  published: boolean;
}

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
