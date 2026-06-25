import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import type { ResolvedCollection } from "../domain/collection.js";
import {
  buildCollectionJsonLd,
  buildCollectionsIndexJsonLd,
  buildColorJsonLd,
  buildGalleryJsonLd,
  colorDescription,
} from "./seo.js";

function make(over: Partial<Color>): Color {
  return {
    id: "x",
    name: "Tricorn Black",
    colorNumber: "6258",
    brandKey: "SW",
    hex: "#2f2f30",
    red: 47,
    green: 47,
    blue: 48,
    hue: 0.66,
    saturation: 0.01,
    lightness: 0.19,
    lrv: 3,
    isDark: true,
    isInterior: true,
    isExterior: true,
    colorFamilyNames: ["Neutral"],
    brandedCollectionNames: [],
    similarColors: [],
    description: ["Bold", "Dramatic"],
    ...over,
  };
}

describe("colorDescription", () => {
  it("leads with the plain-language summary, then the keyword specifics", () => {
    const d = colorDescription(make({}));
    // Plain-language lead (from summarize).
    expect(d).toMatch(/^Tricorn Black is a deep neutral shade/);
    // Keyword-rich specifics for crawlers.
    expect(d).toContain("SW 6258");
    expect(d).toContain("#2F2F30");
    expect(d).toContain("LRV 3.0");
    expect(d.toLowerCase()).toContain("dark");
    expect(d).toContain("Bold, Dramatic"); // original mood descriptors retained
  });
});

describe("buildColorJsonLd", () => {
  it("produces a schema.org Product with brand, sku, color and properties", () => {
    const ld = buildColorJsonLd(make({})) as Record<string, unknown>;
    expect(ld["@type"]).toBe("Product");
    expect(ld.sku).toBe("SW 6258");
    expect(ld.color).toBe("#2F2F30");
    expect((ld.brand as Record<string, unknown>).name).toBe("Sherwin-Williams");
    expect(ld.url).toContain("/colors/sw-6258-tricorn-black/");

    const props = ld.additionalProperty as { name: string; value: unknown }[];
    const byName = Object.fromEntries(props.map((p) => [p.name, p.value]));
    expect(byName.LRV).toBe(3);
    expect(byName.Undertone).toBe("Neutral");
  });
});

describe("buildGalleryJsonLd", () => {
  it("is a CollectionPage that mentions the color count", () => {
    const ld = buildGalleryJsonLd(1728) as Record<string, unknown>;
    expect(ld["@type"]).toBe("CollectionPage");
    expect(String(ld.description)).toContain("1728");
  });
});

describe("collection JSON-LD (E12)", () => {
  const collection: ResolvedCollection = {
    slug: "timeless-neutrals",
    title: "Timeless Neutrals",
    blurb: "Flexible, light-friendly backdrops.",
    hero: make({}),
    colors: [make({}), make({ name: "Repose Gray", colorNumber: "7015" })],
  };

  it("builds a CollectionPage with an ItemList of the colors", () => {
    const ld = buildCollectionJsonLd(collection) as Record<string, unknown>;
    expect(ld["@type"]).toBe("CollectionPage");
    expect(ld.url).toContain("/collections/timeless-neutrals/");
    const list = ld.mainEntity as Record<string, unknown>;
    expect(list["@type"]).toBe("ItemList");
    expect(list.numberOfItems).toBe(2);
    const items = list.itemListElement as { position: number; url: string }[];
    expect(items[0].position).toBe(1);
    expect(items[1].url).toContain("/colors/sw-7015-repose-gray/");
  });

  it("builds an index ItemList of the collections", () => {
    const ld = buildCollectionsIndexJsonLd([collection]) as Record<
      string,
      unknown
    >;
    expect(ld.url).toContain("/collections/");
    const list = ld.mainEntity as Record<string, unknown>;
    expect((list.itemListElement as unknown[]).length).toBe(1);
  });
});
