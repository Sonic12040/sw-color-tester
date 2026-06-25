import type { Color } from "../data/types.js";
import type { ResolvedCollection } from "../domain/collection.js";
import { undertone } from "./colorMath.js";
import { describeLrv, formatUseTypes, summarize } from "./colorCopy.js";
import {
  colorCanonicalUrl,
  collectionCanonicalUrl,
  collectionsIndexCanonicalUrl,
  SITE_URL,
} from "./base.js";
import { toSlug } from "./slug.js";

/**
 * A plain-language description of a color (meta description + AI summary). Leads
 * with the human-readable `summarize` sentence — so shared/indexed snippets read
 * naturally — then appends the keyword-rich specifics crawlers expect.
 */
export function colorDescription(color: Color): string {
  const desc =
    color.description.length > 0 ? `${color.description.join(", ")}. ` : "";
  const use = formatUseTypes(color);
  return (
    `${summarize(color)} ${desc}` +
    `Sherwin-Williams SW ${color.colorNumber}, LRV ${color.lrv.toFixed(1)} ` +
    `(${describeLrv(color.lrv).label.toLowerCase()}), hex ${color.hex.toUpperCase()}` +
    (use ? `, suitable for ${use.toLowerCase()} use` : "") +
    "."
  );
}

/** Schema.org Product JSON-LD for a single color page. */
export function buildColorJsonLd(color: Color): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: color.name,
    sku: `SW ${color.colorNumber}`,
    mpn: color.colorNumber,
    color: color.hex.toUpperCase(),
    category: color.colorFamilyNames.join(", "),
    brand: { "@type": "Brand", name: "Sherwin-Williams" },
    description: colorDescription(color),
    url: colorCanonicalUrl(toSlug(color)),
    additionalProperty: [
      { "@type": "PropertyValue", name: "LRV", value: color.lrv },
      { "@type": "PropertyValue", name: "Undertone", value: undertone(color) },
      {
        "@type": "PropertyValue",
        name: "Color family",
        value: color.colorFamilyNames.join(", "),
      },
      { "@type": "PropertyValue", name: "Hex", value: color.hex.toUpperCase() },
    ],
  };
}

/** Schema.org CollectionPage + ItemList JSON-LD for one editorial collection (E12). */
export function buildCollectionJsonLd(collection: ResolvedCollection): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description: collection.blurb,
    url: collectionCanonicalUrl(collection.slug),
    isPartOf: {
      "@type": "WebSite",
      name: "Sherwin-Williams Color Atlas",
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: collection.colors.length,
      itemListElement: collection.colors.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: colorCanonicalUrl(toSlug(c)),
        name: `${c.name} (SW ${c.colorNumber})`,
      })),
    },
  };
}

/** Schema.org CollectionPage + ItemList JSON-LD for the collections index (E12). */
export function buildCollectionsIndexJsonLd(
  collections: ResolvedCollection[],
): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Color collections",
    description:
      "Curated Sherwin-Williams color collections — trend-driven and timeless palettes for every room.",
    url: collectionsIndexCanonicalUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "Sherwin-Williams Color Atlas",
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: collections.length,
      itemListElement: collections.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: collectionCanonicalUrl(c.slug),
        name: c.title,
      })),
    },
  };
}

/** Schema.org CollectionPage JSON-LD for the gallery. */
export function buildGalleryJsonLd(total: number): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sherwin-Williams Color Atlas",
    description: `Browse, filter, and compare ${total} Sherwin-Williams paint colors by family, undertone, lightness (LRV), and collection.`,
    url: SITE_URL,
    isPartOf: {
      "@type": "WebSite",
      name: "Sherwin-Williams Color Atlas",
      url: SITE_URL,
    },
  };
}
