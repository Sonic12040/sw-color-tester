import type { Color } from "../data/types.js";
import { describeLrv, formatUseTypes, undertone } from "./colorPresentation.js";
import { colorCanonicalUrl, SITE_URL } from "./base.js";
import { toSlug } from "./slug.js";

/** A plain-language description of a color (meta description + AI summary). */
export function colorDescription(color: Color): string {
  const desc =
    color.description.length > 0 ? `${color.description.join(", ")}. ` : "";
  const use = formatUseTypes(color);
  return (
    `${color.name} (SW ${color.colorNumber}) is a ${undertone(color).toLowerCase()}-undertoned ` +
    `Sherwin-Williams paint color. ${desc}` +
    `LRV ${color.lrv.toFixed(1)} (${describeLrv(color.lrv).label.toLowerCase()}), hex ${color.hex.toUpperCase()}` +
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
