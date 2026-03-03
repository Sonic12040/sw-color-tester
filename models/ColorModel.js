/**
 * Read-only data model — queries, grouping, and filtering over the color dataset.
 */

import {
  FAMILY_ORDER,
  PREFIX,
  DESIGNER_COLLECTION_PREFIX,
  createGroupId,
} from "../utils/config.js";

export class ColorModel {
  #activeColors;
  #colorById;
  #familyColors;
  #familyColorIds;
  #familyNameLookup;
  #designerPickIds;

  constructor(colorData) {
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

    // Pre-build immutable group Maps (family/category membership never changes at runtime)
    this.#buildGroupMaps();
  }

  /**
   * Pre-compute family group structures and Designer Pick set.
   * Family maps use primary (first) family.
   */
  #buildGroupMaps() {
    /** Map<string, Object[]> — familyName → color objects (case-preserved) */
    this.#familyColors = new Map();
    /** Map<string, string[]> — familyName → color IDs */
    this.#familyColorIds = new Map();
    /** Map<string(lowercase), string> — lowercase name → canonical name */
    this.#familyNameLookup = new Map();
    /** Set<string> — IDs of colors in any Designer Color Collection */
    this.#designerPickIds = new Set();

    for (const color of this.#activeColors) {
      // Primary family
      if (color.colorFamilyNames.length > 0) {
        const family = color.colorFamilyNames[0];
        if (!this.#familyColors.has(family)) {
          this.#familyColors.set(family, []);
          this.#familyColorIds.set(family, []);
          this.#familyNameLookup.set(family.toLowerCase(), family);
        }
        this.#familyColors.get(family).push(color);
        this.#familyColorIds.get(family).push(color.id);
      }

      // Track Designer picks for badge display
      if (
        color.brandedCollectionNames.some((c) =>
          c.startsWith(DESIGNER_COLLECTION_PREFIX),
        )
      ) {
        this.#designerPickIds.add(color.id);
      }
    }
  }

  /**
   * @returns {Set<string>}
   */
  getDesignerPickIds() {
    return this.#designerPickIds;
  }

  getColorById(id) {
    return this.#colorById.get(id);
  }

  getActiveColors() {
    return this.#activeColors;
  }

  getFavoriteColors(favoriteSet) {
    const activeColors = this.getActiveColors();
    return activeColors.filter((c) => favoriteSet.has(c.id));
  }

  getHiddenColors(hiddenSet) {
    const activeColors = this.getActiveColors();
    return activeColors.filter((c) => hiddenSet.has(c.id));
  }

  getVisibleColors(hiddenSet, favoriteSet = new Set(), lrvRange) {
    const activeColors = this.getActiveColors();
    return activeColors.filter((c) => {
      if (hiddenSet.has(c.id) || favoriteSet.has(c.id)) return false;
      if (lrvRange && (lrvRange.min > 0 || lrvRange.max < 100)) {
        const lrv = c.lrv ?? 0;
        if (lrv < lrvRange.min || lrv > lrvRange.max) return false;
      }
      return true;
    });
  }

  groupByFamily(colors) {
    const colorFamilies = new Map();

    for (const color of colors) {
      // Handle multiple color families - use the first one as primary
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

  sortFamiliesByPriority(familyKeys) {
    return familyKeys.sort((a, b) => {
      const aIndex = FAMILY_ORDER.indexOf(a);
      const bIndex = FAMILY_ORDER.indexOf(b);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * @param {string} familyName - Name of the family (case-insensitive)
   */
  getFamilyColors(familyName) {
    const colors = this.#familyColors.get(familyName);
    if (colors) return colors;
    const canonical = this.#familyNameLookup.get(familyName.toLowerCase());
    return canonical ? this.#familyColors.get(canonical) : [];
  }

  /**
   * Find families where ALL non-favorited colors are hidden.
   * Uses pre-built group Maps for O(1) group lookups.
   * @param {Set<string>} hiddenSet - Set of hidden color IDs
   * @param {Set<string>} favoriteSet - Set of favorite color IDs
   * @returns {Array<{name: string, count: number}>} Array of hidden families with their color counts
   */
  getHiddenFamilies(hiddenSet, favoriteSet = new Set()) {
    const hiddenFamilies = [];

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

  /**
   * @param {string} familyName - Name of the family
   * @param {string[]|Set<string>} excludeIds - IDs to exclude (array or Set)
   */
  getColorIdsForFamily(familyName, excludeIds = []) {
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
   * Get the family section IDs a color belongs to.
   * Used by surgical updates to know which accordion sections to patch.
   * @param {string} colorId
   * @returns {{familySectionIds: string[]}}
   */
  getColorSectionIds(colorId) {
    const color = this.#colorById.get(colorId);
    if (!color) return { familySectionIds: [] };

    const familySectionIds = [];

    // Primary family → section ID
    if (color.colorFamilyNames.length > 0) {
      const primaryFamily = color.colorFamilyNames[0];
      familySectionIds.push(createGroupId(primaryFamily, PREFIX.FAMILY));
    }

    return { familySectionIds };
  }
}
