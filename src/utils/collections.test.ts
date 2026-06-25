import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import {
  buildCollections,
  collectionRefsByColorNumber,
  collectionSlug,
  describeCollection,
} from "./collections.js";

const color = (
  number: string,
  name: string,
  family: string,
  collections: string[],
): Color =>
  ({
    id: `id-${number}`,
    name,
    colorNumber: number,
    hex: "#888888",
    colorFamilyNames: [family],
    brandedCollectionNames: collections,
    similarColors: [],
    description: [],
    lrv: 50,
  }) as unknown as Color;

const DESIGNER = "Designer Color Collection - Pottery";
const isExcluded = (n: string) => n.startsWith("Designer Color Collection");

const catalog = [
  color("100", "One", "Blue", ["Coastal", DESIGNER]),
  color("200", "Two", "Blue", ["Coastal", "Timeless"]),
  color("300", "Three", "Green", ["Coastal"]),
  color("400", "Four", "Neutral", ["Timeless"]),
];

describe("collectionSlug", () => {
  it("kebab-cases a branded name", () => {
    expect(collectionSlug("Top 50 Interior Colors")).toBe(
      "top-50-interior-colors",
    );
    expect(collectionSlug("Victorian (1830s-1910s)")).toBe(
      "victorian-1830s-1910s",
    );
  });
});

describe("buildCollections", () => {
  it("groups colors by branded name, excluding designer collections", () => {
    const cols = buildCollections(catalog, isExcluded);
    expect(cols.map((c) => c.title)).toEqual(["Coastal", "Timeless"]);
    // Designer collection never becomes its own page.
    expect(cols.some((c) => c.title.startsWith("Designer"))).toBe(false);
  });

  it("sorts by size (largest first), then name; preserves dataset order within", () => {
    const cols = buildCollections(catalog, isExcluded);
    expect(cols[0].title).toBe("Coastal"); // 3 colors
    expect(cols[0].colors.map((c) => c.colorNumber)).toEqual([
      "100",
      "200",
      "300",
    ]);
    expect(cols[1].title).toBe("Timeless"); // 2 colors
  });

  it("derives a slug, hero (first color), and a blurb per collection", () => {
    const coastal = buildCollections(catalog, isExcluded)[0];
    expect(coastal.slug).toBe("coastal");
    expect(coastal.hero.colorNumber).toBe("100");
    expect(coastal.blurb).toContain("3 Sherwin-Williams paint colors");
    expect(coastal.blurb).toContain("Coastal collection");
  });

  it("disambiguates slug collisions deterministically", () => {
    const cols = buildCollections(
      [
        color("1", "A", "Blue", ["Top Picks"]),
        color("2", "B", "Blue", ["Top Picks"]),
        color("3", "C", "Blue", ["Top  Picks"]), // collides on slug
      ],
      () => false,
    );
    const slugs = cols.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain("top-picks");
    expect(slugs).toContain("top-picks-2");
  });
});

describe("describeCollection", () => {
  it("mentions the count and the dominant families", () => {
    const blurb = describeCollection("Coastal", [
      catalog[0],
      catalog[1],
      catalog[2],
    ]);
    expect(blurb).toMatch(/^3 Sherwin-Williams paint colors in the Coastal/);
    expect(blurb).toContain("Blue");
  });
});

describe("collectionRefsByColorNumber", () => {
  it("maps each color number to the collections featuring it", () => {
    const map = collectionRefsByColorNumber(
      buildCollections(catalog, isExcluded),
    );
    expect(map.get("200")?.map((r) => r.title)).toEqual([
      "Coastal",
      "Timeless",
    ]);
    expect(map.get("400")?.map((r) => r.title)).toEqual(["Timeless"]);
  });
});
