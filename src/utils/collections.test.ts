import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import type { CollectionContent } from "../domain/collection.js";
import {
  collectionRefsByColorNumber,
  resolveCollection,
  resolveCollections,
} from "./collections.js";

const color = (number: string, name: string): Color =>
  ({
    id: `id-${number}`,
    name,
    colorNumber: number,
    hex: "#888888",
    colorFamilyNames: [],
    brandedCollectionNames: [],
    similarColors: [],
    description: [],
    lrv: 50,
  }) as unknown as Color;

const catalog = new Map([
  ["100", color("100", "One")],
  ["200", color("200", "Two")],
  ["300", color("300", "Three")],
]);
const getByNumber = (n: string) => catalog.get(n);

const content = (over: Partial<CollectionContent>): CollectionContent => ({
  slug: "c",
  title: "Collection",
  blurb: "A blurb",
  colorNumbers: ["100", "200"],
  published: true,
  ...over,
});

describe("resolveCollection", () => {
  it("resolves SW numbers to colors in authoring order", () => {
    const r = resolveCollection(
      content({ colorNumbers: ["200", "100"] }),
      getByNumber,
    );
    expect(r?.colors.map((c) => c.name)).toEqual(["Two", "One"]);
  });

  it("drops unknown SW numbers but keeps the rest", () => {
    const r = resolveCollection(
      content({ colorNumbers: ["100", "999"] }),
      getByNumber,
    );
    expect(r?.colors.map((c) => c.colorNumber)).toEqual(["100"]);
  });

  it("uses the named hero, else falls back to the first color", () => {
    expect(
      resolveCollection(content({ heroNumber: "200" }), getByNumber)?.hero.name,
    ).toBe("Two");
    expect(resolveCollection(content({}), getByNumber)?.hero.name).toBe("One");
  });

  it("returns null for unpublished or fully-unresolvable collections", () => {
    expect(
      resolveCollection(content({ published: false }), getByNumber),
    ).toBeNull();
    expect(
      resolveCollection(content({ colorNumbers: ["999"] }), getByNumber),
    ).toBeNull();
  });
});

describe("resolveCollections", () => {
  it("keeps only published, resolvable collections in order", () => {
    const all = resolveCollections(
      [
        content({ slug: "a" }),
        content({ slug: "draft", published: false }),
        content({ slug: "b", colorNumbers: ["300"] }),
      ],
      getByNumber,
    );
    expect(all.map((c) => c.slug)).toEqual(["a", "b"]);
  });
});

describe("collectionRefsByColorNumber", () => {
  it("maps each color number to the collections featuring it", () => {
    const resolved = resolveCollections(
      [
        content({ slug: "a", title: "A", colorNumbers: ["100", "200"] }),
        content({ slug: "b", title: "B", colorNumbers: ["200", "300"] }),
      ],
      getByNumber,
    );
    const map = collectionRefsByColorNumber(resolved);
    expect(map.get("100")?.map((r) => r.slug)).toEqual(["a"]);
    expect(map.get("200")?.map((r) => r.slug)).toEqual(["a", "b"]);
    expect(map.get("300")?.map((r) => r.title)).toEqual(["B"]);
  });
});
