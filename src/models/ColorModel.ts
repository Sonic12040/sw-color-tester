import type { Color } from "../data/types.js";
import type { FilterCriteria, SortKey } from "../domain/types.js";
import type {
  CollectionRef,
  ResolvedCollection,
} from "../domain/collection.js";
import { DESIGNER_COLLECTION_PREFIX } from "../utils/config.js";
import { toSlug } from "../utils/slug.js";
import {
  buildCollections,
  collectionRefsByColorNumber,
} from "../utils/collections.js";
import { orderFamilies, queryColors, sortColors } from "./colorQuery.js";

/**
 * Repository over the color dataset: filters the raw data down to active
 * colors, builds the lookup indexes (by id, by slug, families, collections,
 * designer picks), and exposes them. The actual faceted querying/sorting is
 * pure and lives in `colorQuery.ts`; this class just owns the indexes and
 * delegates.
 */
export class ColorModel {
  #activeColors: Color[];
  #colorById: Map<string, Color>;
  #colorBySlug: Map<string, Color>;
  #colorByNumber: Map<string, Color>;
  #familyNames: string[];
  #designerPickIds: Set<string>;
  #collectionNames: string[];
  /** Resolved editorial collections (E12) + the reverse color→collections map. */
  #editorialCollections: ResolvedCollection[];
  #collectionsByColorNumber: Map<string, CollectionRef[]>;

  constructor(colorData: Color[]) {
    this.#activeColors = colorData
      .filter((c) => !c.archived && !c.ignore)
      .map((c) => ({
        ...c,
        colorFamilyNames: c.colorFamilyNames ?? [],
        brandedCollectionNames: c.brandedCollectionNames ?? [],
        similarColors: c.similarColors ?? [],
        description: c.description ?? [],
      }));
    this.#colorById = new Map(this.#activeColors.map((c) => [c.id, c]));
    this.#colorBySlug = new Map(this.#activeColors.map((c) => [toSlug(c), c]));
    // First-wins on the (expected-unique) SW number; integrity test guards dupes.
    this.#colorByNumber = new Map();
    for (const c of this.#activeColors) {
      if (!this.#colorByNumber.has(c.colorNumber)) {
        this.#colorByNumber.set(c.colorNumber, c);
      }
    }
    this.#familyNames = [];
    this.#designerPickIds = new Set();
    this.#collectionNames = [];
    this.#buildGroupMaps();
    // Collections come from the dataset's branded collection names (E12),
    // excluding designer collections (surfaced separately as "Designer Pick").
    this.#editorialCollections = buildCollections(this.#activeColors, (name) =>
      name.startsWith(DESIGNER_COLLECTION_PREFIX),
    );
    this.#collectionsByColorNumber = collectionRefsByColorNumber(
      this.#editorialCollections,
    );
  }

  #buildGroupMaps(): void {
    const families = new Set<string>();
    const collections = new Set<string>();
    for (const color of this.#activeColors) {
      if (color.colorFamilyNames.length > 0) {
        families.add(color.colorFamilyNames[0]);
      }
      if (
        color.brandedCollectionNames.some((c) =>
          c.startsWith(DESIGNER_COLLECTION_PREFIX),
        )
      ) {
        this.#designerPickIds.add(color.id);
      }
      for (const name of color.brandedCollectionNames) {
        if (!name.startsWith(DESIGNER_COLLECTION_PREFIX)) collections.add(name);
      }
    }
    this.#familyNames = [...families];
    this.#collectionNames = [...collections].sort((a, b) => a.localeCompare(b));
  }

  /** All non-designer branded collection names, sorted (for the facet list). */
  getCollectionNames(): string[] {
    return this.#collectionNames;
  }

  /** Families in display order (for the family facet list). */
  getOrderedFamilies(): string[] {
    return orderFamilies(this.#familyNames);
  }

  getColorBySlug(slug: string): Color | undefined {
    return this.#colorBySlug.get(slug);
  }

  getColorByNumber(colorNumber: string): Color | undefined {
    return this.#colorByNumber.get(colorNumber);
  }

  /** Published editorial collections (E12), in authoring order. */
  getCollections(): ResolvedCollection[] {
    return this.#editorialCollections;
  }

  getCollectionBySlug(slug: string): ResolvedCollection | undefined {
    return this.#editorialCollections.find((c) => c.slug === slug);
  }

  /** The collections a color is featured in, for cross-linking (US12.3). */
  getCollectionsForColor(color: Color): CollectionRef[] {
    return this.#collectionsByColorNumber.get(color.colorNumber) ?? [];
  }

  /** All color slugs (for prerendering one page per color). */
  getAllSlugs(): string[] {
    return [...this.#colorBySlug.keys()];
  }

  isDesignerPick(id: string): boolean {
    return this.#designerPickIds.has(id);
  }

  getColorById(id: string): Color | undefined {
    return this.#colorById.get(id);
  }

  getActiveColors(): Color[] {
    return this.#activeColors;
  }

  /**
   * The faceted-browse query powering the Color Atlas. Delegates to the pure
   * `queryColors`, supplying the designer-pick index it can't derive on its own.
   */
  getFilteredColors(
    criteria: FilterCriteria,
    favorites: Set<string> = new Set(),
    hidden: Set<string> = new Set(),
  ): Color[] {
    return queryColors(this.#activeColors, criteria, {
      favorites,
      hidden,
      designerPickIds: this.#designerPickIds,
    });
  }

  /** Sort a copy of `colors` by the given key. */
  sortColors(colors: Color[], key: SortKey): Color[] {
    return sortColors(colors, key);
  }
}
