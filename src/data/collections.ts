import type { CollectionContent } from "../domain/collection.js";

/**
 * Curated editorial collections (E12, US12.2) — the build-time content model.
 *
 * Authoring (no code changes needed):
 *  - Add an object below; reference colors by their **SW number** (`colorNumbers`).
 *  - `heroNumber` picks the lead swatch (defaults to the first featured color).
 *  - Set `published: false` to keep a draft out of the build/sitemap.
 *  - `slug` must be unique + kebab-case; ordering of `colorNumbers` is respected.
 *
 * Integrity is guarded by `collections.integrity.test.ts` (unique slugs, every
 * SW number resolves, hero is in the list).
 */
export const CURATED_COLLECTIONS: CollectionContent[] = [
  {
    slug: "timeless-neutrals",
    title: "Timeless Neutrals",
    blurb:
      "The greiges and warm grays designers reach for again and again — flexible, light-friendly backdrops that flatter almost any room and never feel dated.",
    heroNumber: "7015",
    colorNumbers: ["7015", "7029", "7036", "9166", "7008"],
    published: true,
  },
  {
    slug: "bold-and-moody",
    title: "Bold & Moody",
    blurb:
      "Saturated, dramatic darks for accent walls, cabinetry, and front doors. These deep blues, charcoals, and near-blacks add depth and a confident, modern edge.",
    heroNumber: "6244",
    colorNumbers: ["6244", "6258", "7674", "7048", "6991"],
    published: true,
  },
  {
    slug: "calm-coastal",
    title: "Calm Coastal",
    blurb:
      "Soft, watery greens and airy neutrals that bring a relaxed, coastal calm indoors — easy companions for natural light, white trim, and organic textures.",
    heroNumber: "6204",
    colorNumbers: ["6204", "6207", "7015", "7008"],
    published: true,
  },
  {
    slug: "crisp-whites",
    title: "Crisp Whites",
    blurb:
      "From bright and clean to soft and warm, a curated set of whites for trim, ceilings, and whole-room schemes — picked for how they read in real daylight.",
    heroNumber: "7005",
    colorNumbers: ["7005", "7008", "7757", "6385"],
    published: true,
  },
];
