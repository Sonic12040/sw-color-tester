import type { Color } from "../data/types.js";
import { FAMILY_ORDER, DESIGNER_COLLECTION_PREFIX } from "../utils/config.js";

export class ColorModel {
  #activeColors: Color[];
  #colorById: Map<string, Color>;
  #familyColors: Map<string, Color[]>;
  #familyColorIds: Map<string, string[]>;
  #familyNameLookup: Map<string, string>;
  #designerPickIds: Set<string>;

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
    this.#familyColors = new Map();
    this.#familyColorIds = new Map();
    this.#familyNameLookup = new Map();
    this.#designerPickIds = new Set();
    this.#buildGroupMaps();
  }

  #buildGroupMaps(): void {
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
    }
  }

  getDesignerPickIds(): Set<string> {
    return this.#designerPickIds;
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
    return familyKeys.sort((a, b) => {
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
}
