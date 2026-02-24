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
  constructor(colorData) {
    /** @private Cached active colors (immutable at runtime) */
    this._activeColors = colorData.filter((c) => !c.archived && !c.ignore);
    /** @private O(1) color lookup by ID */
    this._colorById = new Map(this._activeColors.map((c) => [c.id, c]));

    // Pre-build immutable group Maps (family/category membership never changes at runtime)
    this._buildGroupMaps();
  }

  /**
   * Pre-compute family group structures and Designer Pick set.
   * Family maps use primary (first) family.
   * @private
   */
  _buildGroupMaps() {
    /** @private Map<string, Object[]> — familyName → color objects (case-preserved) */
    this._familyColors = new Map();
    /** @private Map<string, string[]> — familyName → color IDs */
    this._familyColorIds = new Map();
    /** @private Map<string(lowercase), string> — lowercase name → canonical name */
    this._familyNameLookup = new Map();
    /** @private Set<string> — IDs of colors in any Designer Color Collection */
    this._designerPickIds = new Set();

    for (const color of this._activeColors) {
      // Primary family
      if (color.colorFamilyNames && color.colorFamilyNames.length > 0) {
        const family = color.colorFamilyNames[0];
        if (!this._familyColors.has(family)) {
          this._familyColors.set(family, []);
          this._familyColorIds.set(family, []);
          this._familyNameLookup.set(family.toLowerCase(), family);
        }
        this._familyColors.get(family).push(color);
        this._familyColorIds.get(family).push(color.id);
      }

      // Track Designer picks for badge display
      if (
        color.brandedCollectionNames &&
        color.brandedCollectionNames.some((c) =>
          c.startsWith(DESIGNER_COLLECTION_PREFIX),
        )
      ) {
        this._designerPickIds.add(color.id);
      }
    }
  }

  /**
   * @returns {Set<string>}
   */
  getDesignerPickIds() {
    return this._designerPickIds;
  }

  getColorById(id) {
    return this._colorById.get(id);
  }

  getActiveColors() {
    return this._activeColors;
  }

  getActiveColorCount() {
    return this.getActiveColors().length;
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
    const colorFamilies = {};

    for (const color of colors) {
      // Handle multiple color families - use the first one as primary
      const primaryFamily =
        color.colorFamilyNames && color.colorFamilyNames.length > 0
          ? color.colorFamilyNames[0]
          : "Other";

      if (!colorFamilies[primaryFamily]) {
        colorFamilies[primaryFamily] = [];
      }
      colorFamilies[primaryFamily].push(color);
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
    const colors = this._familyColors.get(familyName);
    if (colors) return colors;
    const canonical = this._familyNameLookup.get(familyName.toLowerCase());
    return canonical ? this._familyColors.get(canonical) : [];
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

    for (const [familyName, colors] of this._familyColors) {
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
    const ids = this._familyColorIds.get(familyName);
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
    const color = this._colorById.get(colorId);
    if (!color) return { familySectionIds: [] };

    const familySectionIds = [];

    // Primary family → section ID
    if (color.colorFamilyNames && color.colorFamilyNames.length > 0) {
      const primaryFamily = color.colorFamilyNames[0];
      familySectionIds.push(createGroupId(primaryFamily, PREFIX.FAMILY));
    }

    return { familySectionIds };
  }
}
