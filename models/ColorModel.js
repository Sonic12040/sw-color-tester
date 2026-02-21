/**
 * ColorModel - Model Layer
 * Handles all data operations and business logic for colors
 * Responsibilities:
 * - Data queries and filtering
 * - Grouping and sorting operations
 * - Hidden group detection
 */

import { FAMILY_ORDER } from "../utils/config.js";

export class ColorModel {
  constructor(colorData) {
    this.colorData = colorData;
    /** @private Cached active colors (immutable at runtime) */
    this._activeColors = colorData.filter((c) => !c.archived && !c.ignore);
    /** @private O(1) color lookup by ID */
    this._colorById = new Map(this._activeColors.map((c) => [c.id, c]));
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
   * Get all colors in a specific family
   * @param {string} familyName - Name of the family
   * @returns {Array} Array of colors in the family
   */
  getFamilyColors(familyName) {
    return this.colorData.filter((color) => {
      if (!color.colorFamilyNames || color.archived) return false;

      // Check if any of the color's families match the target family
      return color.colorFamilyNames.some(
        (family) => family.toLowerCase() === familyName.toLowerCase(),
      );
    });
  }

  /**
   * Get all colors in a specific category
   * @param {string} categoryName - Name of the category
   * @returns {Array} Array of colors in the category
   */
  getCategoryColors(categoryName) {
    return this.colorData.filter((color) => {
      if (!color.brandedCollectionNames || color.archived) return false;

      // Check if any of the color's categories match the target category
      return color.brandedCollectionNames.some(
        (category) => category.toLowerCase() === categoryName.toLowerCase(),
      );
    });
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
   * Generic function to find groups (families or categories) where ALL colors are hidden
   * Excludes favorited colors from consideration
   * @param {string} groupType - Either 'family' or 'category'
   * @param {string[]} hiddenIds - Array of hidden color IDs
   * @param {string[]} favoriteIds - Array of favorite color IDs
   * @returns {Array<{name: string, count: number}>} Array of hidden groups with their color counts
   */
  getHiddenGroups(groupType, hiddenSet, favoriteSet = new Set()) {
    const allGroups = {};
    const propertyName =
      groupType === "family" ? "colorFamilyNames" : "brandedCollectionNames";

    // Get all groups and their colors (excluding favorited colors)
    for (const color of this.getActiveColors()) {
      // Skip favorited colors - they shouldn't be counted
      if (favoriteSet.has(color.id)) continue;

      const groupNames = color[propertyName];
      if (!groupNames || groupNames.length === 0) continue;

      // Families use primary (first), categories use all
      const groups = groupType === "family" ? [groupNames[0]] : groupNames;

      for (const groupName of groups) {
        if (!allGroups[groupName]) {
          allGroups[groupName] = [];
        }
        allGroups[groupName].push(color);
      }
    }

    // Find groups where ALL colors are hidden
    const hiddenGroups = [];
    for (const groupName of Object.keys(allGroups)) {
      const groupColors = allGroups[groupName];
      const allHidden =
        groupColors.length > 0 &&
        groupColors.every((color) => hiddenSet.has(color.id));

      if (allHidden) {
        hiddenGroups.push({
          name: groupName,
          count: groupColors.length,
        });
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
   * Get all color IDs for a specific family
   * @param {string} familyName - Name of the family
   * @param {string[]|Set<string>} excludeIds - IDs to exclude (array or Set)
   * @returns {string[]} Array of color IDs in the family
   */
  getColorIdsForFamily(familyName, excludeIds = []) {
    const excludeSet =
      excludeIds instanceof Set ? excludeIds : new Set(excludeIds);
    const activeColors = this.getActiveColors();
    return activeColors
      .filter((color) => {
        const families = color.colorFamilyNames || [];
        const primaryFamily = families.length > 0 ? families[0] : null;
        return primaryFamily === familyName && !excludeSet.has(color.id);
      })
      .map((color) => color.id);
  }

  /**
   * Get all color IDs for a specific category
   * @param {string} categoryName - Name of the category
   * @param {string[]|Set<string>} excludeIds - IDs to exclude (array or Set)
   * @returns {string[]} Array of color IDs in the category
   */
  getColorIdsForCategory(categoryName, excludeIds = []) {
    const excludeSet =
      excludeIds instanceof Set ? excludeIds : new Set(excludeIds);
    const activeColors = this.getActiveColors();
    return activeColors
      .filter((color) => {
        const categories = color.brandedCollectionNames || [];
        return categories.includes(categoryName) && !excludeSet.has(color.id);
      })
      .map((color) => color.id);
  }
}
