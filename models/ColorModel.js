/**
 * ColorModel - Model Layer
 * Handles all data operations and business logic for colors
 * Responsibilities:
 * - Data queries and filtering
 * - Grouping and sorting operations
 * - Hidden group detection
 */

import { FAMILY_ORDER, PREFIX, createGroupId } from "../utils/config.js";

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
   * Pre-compute family and category group structures.
   * Family maps use primary (first) family; category maps use all collections.
   * @private
   */
  _buildGroupMaps() {
    /** @private Map<string, Object[]> — familyName → color objects (case-preserved) */
    this._familyColors = new Map();
    /** @private Map<string, string[]> — familyName → color IDs */
    this._familyColorIds = new Map();
    /** @private Map<string, Object[]> — categoryName → color objects (case-preserved) */
    this._categoryColors = new Map();
    /** @private Map<string, string[]> — categoryName → color IDs */
    this._categoryColorIds = new Map();
    /** @private Map<string(lowercase), string> — lowercase name → canonical name */
    this._familyNameLookup = new Map();
    /** @private Map<string(lowercase), string> — lowercase name → canonical name */
    this._categoryNameLookup = new Map();

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

      // All categories
      if (
        color.brandedCollectionNames &&
        color.brandedCollectionNames.length > 0
      ) {
        for (const cat of color.brandedCollectionNames) {
          if (!this._categoryColors.has(cat)) {
            this._categoryColors.set(cat, []);
            this._categoryColorIds.set(cat, []);
            this._categoryNameLookup.set(cat.toLowerCase(), cat);
          }
          this._categoryColors.get(cat).push(color);
          this._categoryColorIds.get(cat).push(color.id);
        }
      }
    }
  }

  /**
   * Get a single color by ID in O(1)
   * @param {string} id - Color ID
   * @returns {Object|undefined} The color object, or undefined if not found
   */
  getColorById(id) {
    return this._colorById.get(id);
  }

  /**
   * Get all active (non-archived, non-ignored) colors
   * @returns {Array} Array of active colors
   */
  getActiveColors() {
    return this._activeColors;
  }

  /**
   * Get total count of active colors
   * @returns {number} Total number of active colors
   */
  getActiveColorCount() {
    return this.getActiveColors().length;
  }

  /**
   * Get favorite colors from a Set of IDs
   * @param {Set<string>} favoriteSet - Set of favorite color IDs
   * @returns {Array} Array of favorite color objects
   */
  getFavoriteColors(favoriteSet) {
    const activeColors = this.getActiveColors();
    return activeColors.filter((c) => favoriteSet.has(c.id));
  }

  /**
   * Get hidden colors from a Set of IDs
   * @param {Set<string>} hiddenSet - Set of hidden color IDs
   * @returns {Array} Array of hidden color objects
   */
  getHiddenColors(hiddenSet) {
    const activeColors = this.getActiveColors();
    return activeColors.filter((c) => hiddenSet.has(c.id));
  }

  /**
   * Get visible colors (excluding hidden and favorited colors)
   * @param {Set<string>} hiddenSet - Set of hidden color IDs
   * @param {Set<string>} favoriteSet - Set of favorite color IDs
   * @param {{min: number, max: number}} [lrvRange] - Optional LRV filter range
   * @returns {Array} Array of visible color objects
   */
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

  /**
   * Group colors by their primary family
   * @param {Array} colors - Array of color objects
   * @returns {Object} Object with family names as keys and color arrays as values
   */
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

  /**
   * Group colors by their branded collection categories
   * @param {Array} colors - Array of color objects
   * @returns {Object} Object with category names as keys and color arrays as values
   */
  groupByCategory(colors) {
    const colorCategories = {};

    for (const color of colors) {
      if (
        color.brandedCollectionNames &&
        color.brandedCollectionNames.length > 0
      ) {
        for (const category of color.brandedCollectionNames) {
          if (!colorCategories[category]) {
            colorCategories[category] = [];
          }
          colorCategories[category].push(color);
        }
      }
    }

    return colorCategories;
  }

  /**
   * Sort family names by priority order, then alphabetically
   * @param {string[]} familyKeys - Array of family names
   * @returns {string[]} Sorted array of family names
   */
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
   * Get all colors in a specific family (O(1) Map lookup)
   * @param {string} familyName - Name of the family (case-insensitive)
   * @returns {Array} Array of colors in the family
   */
  getFamilyColors(familyName) {
    // Try exact match first, fall back to case-insensitive lookup
    const colors = this._familyColors.get(familyName);
    if (colors) return colors;
    const canonical = this._familyNameLookup.get(familyName.toLowerCase());
    return canonical ? this._familyColors.get(canonical) : [];
  }

  /**
   * Get all colors in a specific category (O(1) Map lookup)
   * @param {string} categoryName - Name of the category (case-insensitive)
   * @returns {Array} Array of colors in the category
   */
  getCategoryColors(categoryName) {
    // Try exact match first, fall back to case-insensitive lookup
    const colors = this._categoryColors.get(categoryName);
    if (colors) return colors;
    const canonical = this._categoryNameLookup.get(categoryName.toLowerCase());
    return canonical ? this._categoryColors.get(canonical) : [];
  }

  /**
   * Get colors for a given group ID (family or category)
   * @param {string} id - Group ID (e.g., 'family-red' or 'category-historic')
   * @param {Function} convertIdToName - Function to convert ID to display name
   * @returns {Array} Array of colors in the group
   */
  getColorsForId(id, convertIdToName) {
    // Handle both family and category IDs
    if (id.startsWith("family-")) {
      const familyName = convertIdToName(id);
      return this.getFamilyColors(familyName);
    } else if (id.startsWith("category-")) {
      const categoryName = convertIdToName(id);
      return this.getCategoryColors(categoryName);
    }
    return [];
  }

  /**
   * Find groups (families or categories) where ALL non-favorited colors are hidden.
   * Uses pre-built group Maps for O(1) group lookups.
   * @param {string} groupType - Either 'family' or 'category'
   * @param {Set<string>} hiddenSet - Set of hidden color IDs
   * @param {Set<string>} favoriteSet - Set of favorite color IDs
   * @returns {Array<{name: string, count: number}>} Array of hidden groups with their color counts
   */
  getHiddenGroups(groupType, hiddenSet, favoriteSet = new Set()) {
    const groupMap =
      groupType === "family" ? this._familyColors : this._categoryColors;
    const hiddenGroups = [];

    for (const [groupName, colors] of groupMap) {
      // Count non-favorited colors and check if all are hidden
      let nonFavCount = 0;
      let allHidden = true;

      for (const color of colors) {
        if (favoriteSet.has(color.id)) continue;
        nonFavCount++;
        if (!hiddenSet.has(color.id)) {
          allHidden = false;
          break; // Early exit — no need to check remaining
        }
      }

      if (nonFavCount > 0 && allHidden) {
        hiddenGroups.push({ name: groupName, count: nonFavCount });
      }
    }

    return hiddenGroups;
  }

  /**
   * Find all color families where ALL colors are hidden
   * @param {Set<string>} hiddenSet - Set of hidden color IDs
   * @param {Set<string>} favoriteSet - Set of favorite color IDs
   * @returns {Array<{name: string, count: number}>} Array of hidden families
   */
  getHiddenFamilies(hiddenSet, favoriteSet = new Set()) {
    return this.getHiddenGroups("family", hiddenSet, favoriteSet);
  }

  /**
   * Find all color categories where ALL colors are hidden
   * @param {Set<string>} hiddenSet - Set of hidden color IDs
   * @param {Set<string>} favoriteSet - Set of favorite color IDs
   * @returns {Array<{name: string, count: number}>} Array of hidden categories
   */
  getHiddenCategories(hiddenSet, favoriteSet = new Set()) {
    return this.getHiddenGroups("category", hiddenSet, favoriteSet);
  }

  /**
   * Get all color IDs for a specific family (O(1) Map lookup)
   * @param {string} familyName - Name of the family
   * @param {string[]|Set<string>} excludeIds - IDs to exclude (array or Set)
   * @returns {string[]} Array of color IDs in the family
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
   * Get all color IDs for a specific category (O(1) Map lookup)
   * @param {string} categoryName - Name of the category
   * @param {string[]|Set<string>} excludeIds - IDs to exclude (array or Set)
   * @returns {string[]} Array of color IDs in the category
   */
  getColorIdsForCategory(categoryName, excludeIds = []) {
    const ids = this._categoryColorIds.get(categoryName);
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
   * Get the section IDs (family and category group IDs) that a color belongs to.
   * Used by surgical updates to know which accordion sections to patch.
   * @param {string} colorId - The color ID
   * @returns {{familySectionIds: string[], categorySectionIds: string[]}} Section IDs
   */
  getColorSectionIds(colorId) {
    const color = this._colorById.get(colorId);
    if (!color) return { familySectionIds: [], categorySectionIds: [] };

    const familySectionIds = [];
    const categorySectionIds = [];

    // Primary family → section ID
    if (color.colorFamilyNames && color.colorFamilyNames.length > 0) {
      const primaryFamily = color.colorFamilyNames[0];
      familySectionIds.push(createGroupId(primaryFamily, PREFIX.FAMILY));
    }

    // All categories → section IDs
    if (
      color.brandedCollectionNames &&
      color.brandedCollectionNames.length > 0
    ) {
      for (const cat of color.brandedCollectionNames) {
        categorySectionIds.push(createGroupId(cat, PREFIX.CATEGORY));
      }
    }

    return { familySectionIds, categorySectionIds };
  }
}
