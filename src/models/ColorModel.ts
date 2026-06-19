import type { Color } from "../data/types.js";
import { FAMILY_ORDER, DESIGNER_COLLECTION_PREFIX } from "../utils/config.js";
import { undertone, type Undertone } from "../utils/colorPresentation.js";
import { toSlug } from "../utils/slug.js";

export type SortKey = "family" | "hue" | "lrv-asc" | "lrv-desc" | "name";

export type AtlasView = "all" | "favorites" | "hidden";

export interface FilterCriteria {
  /** Free text matched against name, SW number, and description. */
  search?: string;
  /** Primary-family match (OR across the list). */
  families?: string[];
  /** Undertone match (OR across the list). */
  undertones?: Undertone[];
  lrvRange?: { min: number; max: number };
  useType?: "interior" | "exterior" | null;
  /** Branded-collection membership (OR, substring match). */
  collections?: string[];
  designerOnly?: boolean;
  /** Which base set to draw from. Defaults to "all" (active minus hidden). */
  view?: AtlasView;
  sort?: SortKey;
}

export class ColorModel {
  #activeColors: Color[];
  #colorById: Map<string, Color>;
  #colorBySlug: Map<string, Color>;
  #familyColors: Map<string, Color[]>;
  #familyColorIds: Map<string, string[]>;
  #familyNameLookup: Map<string, string>;
  #designerPickIds: Set<string>;
  #collectionNames: string[];

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
    this.#familyColors = new Map();
    this.#familyColorIds = new Map();
    this.#familyNameLookup = new Map();
    this.#designerPickIds = new Set();
    this.#collectionNames = [];
    this.#buildGroupMaps();
  }

  #buildGroupMaps(): void {
    const collections = new Set<string>();
    for (const color of this.#activeColors) {
      if (color.colorFamilyNames.length > 0) {
        const family = color.colorFamilyNames[0];
        if (!this.#familyColors.has(family)) {
          this.#familyColors.set(family, []);
          this.#familyColorIds.set(family, []);
          this.#familyNameLookup.set(family.toLowerCase(), family);
        }
        this.#familyColors.get(family)!.push(color);
        this.#familyColorIds.get(family)!.push(color.id);
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
    this.#collectionNames = [...collections].sort((a, b) => a.localeCompare(b));
  }

  /** All non-designer branded collection names, sorted (for the facet list). */
  getCollectionNames(): string[] {
    return this.#collectionNames;
  }

  /** Families in display order (for the family facet list). */
  getOrderedFamilies(): string[] {
    return this.sortFamiliesByPriority([...this.#familyColors.keys()]);
  }

  getColorBySlug(slug: string): Color | undefined {
    return this.#colorBySlug.get(slug);
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

  getFavoriteColors(favoriteSet: Set<string>): Color[] {
    return this.getActiveColors().filter((c) => favoriteSet.has(c.id));
  }

  getHiddenColors(hiddenSet: Set<string>): Color[] {
    return this.getActiveColors().filter((c) => hiddenSet.has(c.id));
  }

  getVisibleColors(
    hiddenSet: Set<string>,
    favoriteSet: Set<string> = new Set(),
    lrvRange?: { min: number; max: number },
  ): Color[] {
    return this.getActiveColors().filter((c) => {
      if (hiddenSet.has(c.id) || favoriteSet.has(c.id)) return false;
      if (lrvRange && (lrvRange.min > 0 || lrvRange.max < 100)) {
        const lrv = c.lrv ?? 0;
        if (lrv < lrvRange.min || lrv > lrvRange.max) return false;
      }
      return true;
    });
  }

  groupByFamily(colors: Color[]): Map<string, Color[]> {
    const colorFamilies = new Map<string, Color[]>();
    for (const color of colors) {
      const primaryFamily =
        color.colorFamilyNames.length > 0 ? color.colorFamilyNames[0] : "Other";
      let group = colorFamilies.get(primaryFamily);
      if (!group) {
        group = [];
        colorFamilies.set(primaryFamily, group);
      }
      group.push(color);
    }
    return colorFamilies;
  }

  sortFamiliesByPriority(familyKeys: string[]): string[] {
    return [...familyKeys].sort((a, b) => {
      const aIndex = FAMILY_ORDER.indexOf(a);
      const bIndex = FAMILY_ORDER.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }

  getFamilyColors(familyName: string): Color[] {
    const colors = this.#familyColors.get(familyName);
    if (colors) return colors;
    const canonical = this.#familyNameLookup.get(familyName.toLowerCase());
    return canonical ? (this.#familyColors.get(canonical) ?? []) : [];
  }

  getHiddenFamilies(
    hiddenSet: Set<string>,
    favoriteSet: Set<string> = new Set(),
  ): Array<{ name: string; count: number }> {
    const hiddenFamilies: Array<{ name: string; count: number }> = [];
    for (const [familyName, colors] of this.#familyColors) {
      let nonFavCount = 0;
      let allHidden = true;
      for (const color of colors) {
        if (favoriteSet.has(color.id)) continue;
        nonFavCount++;
        if (!hiddenSet.has(color.id)) {
          allHidden = false;
          break;
        }
      }
      if (nonFavCount > 0 && allHidden) {
        hiddenFamilies.push({ name: familyName, count: nonFavCount });
      }
    }
    return hiddenFamilies;
  }

  getColorIdsForFamily(
    familyName: string,
    excludeIds: string[] | Set<string> = [],
  ): string[] {
    const ids = this.#familyColorIds.get(familyName);
    if (!ids) return [];
    if (
      (excludeIds instanceof Set && excludeIds.size === 0) ||
      (Array.isArray(excludeIds) && excludeIds.length === 0)
    ) {
      return ids;
    }
    const excludeSet =
      excludeIds instanceof Set ? excludeIds : new Set(excludeIds);
    return ids.filter((id) => !excludeSet.has(id));
  }

  /**
   * The faceted-browse query powering the Color Atlas: picks a base set from
   * `view`, applies every active facet, then sorts. Returns a fresh array.
   */
  getFilteredColors(
    criteria: FilterCriteria,
    favorites: Set<string> = new Set(),
    hidden: Set<string> = new Set(),
  ): Color[] {
    const {
      search,
      families,
      undertones,
      lrvRange,
      useType,
      collections,
      designerOnly,
      view = "all",
      sort = "family",
    } = criteria;

    let base: Color[];
    if (view === "favorites") {
      base = this.#activeColors.filter((c) => favorites.has(c.id));
    } else if (view === "hidden") {
      base = this.#activeColors.filter((c) => hidden.has(c.id));
    } else {
      base = this.#activeColors.filter((c) => !hidden.has(c.id));
    }

    const q = search?.trim().toLowerCase();
    const familySet =
      families && families.length > 0 ? new Set(families) : null;
    const undertoneSet =
      undertones && undertones.length > 0 ? new Set(undertones) : null;
    const collectionList =
      collections && collections.length > 0 ? collections : null;
    const lrvActive =
      lrvRange && (lrvRange.min > 0 || lrvRange.max < 100) ? lrvRange : null;

    const filtered = base.filter((c) => {
      if (q) {
        const haystack =
          `${c.name} ${c.colorNumber} ${c.description.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (familySet && !familySet.has(c.colorFamilyNames[0])) return false;
      if (undertoneSet && !undertoneSet.has(undertone(c))) return false;
      if (lrvActive) {
        const lrv = c.lrv ?? 0;
        if (lrv < lrvActive.min || lrv > lrvActive.max) return false;
      }
      if (useType === "interior" && !c.isInterior) return false;
      if (useType === "exterior" && !c.isExterior) return false;
      if (designerOnly && !this.#designerPickIds.has(c.id)) return false;
      if (
        collectionList &&
        !collectionList.some((name) => c.brandedCollectionNames.includes(name))
      ) {
        return false;
      }
      return true;
    });

    return this.sortColors(filtered, sort);
  }

  /** Sort a copy of `colors` by the given key. */
  sortColors(colors: Color[], key: SortKey): Color[] {
    const sorted = [...colors];
    switch (key) {
      case "hue":
        return sorted.sort((a, b) => a.hue - b.hue || b.lrv - a.lrv);
      case "lrv-asc":
        return sorted.sort((a, b) => a.lrv - b.lrv);
      case "lrv-desc":
        return sorted.sort((a, b) => b.lrv - a.lrv);
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "family":
      default:
        return sorted.sort((a, b) => {
          const fa = FAMILY_ORDER.indexOf(a.colorFamilyNames[0]);
          const fb = FAMILY_ORDER.indexOf(b.colorFamilyNames[0]);
          const ra = fa === -1 ? FAMILY_ORDER.length : fa;
          const rb = fb === -1 ? FAMILY_ORDER.length : fb;
          return ra - rb || a.name.localeCompare(b.name);
        });
    }
  }
}
