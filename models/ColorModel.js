/**
 * ColorModel - Model Layer
 * Handles all data operations and business logic for colors
 * Responsibilities:
 * - Data queries and filtering
 * - Grouping and sorting operations
 * - Hidden group detection
 */

import { FAMILY_ORDER } from "../config.js";

export class ColorModel {
  constructor(colorData) {
    this.colorData = colorData;
  }

  /**
   * Get all active (non-archived) colors
   * @returns {Array} Array of active colors
   */
  getActiveColors() {
    return this.colorData.filter((c) => !c.archived);
  }

  /**
   * Get favorite colors from a list of IDs
   * @param {string[]} favoriteIds - Array of favorite color IDs
   * @returns {Array} Array of favorite color objects
   */
  getFavoriteColors(favoriteIds) {
    const activeColors = this.getActiveColors();
    return activeColors.filter((c) => favoriteIds.includes(c.id));
  }

  /**
   * Get hidden colors from a list of IDs
   * @param {string[]} hiddenIds - Array of hidden color IDs
   * @returns {Array} Array of hidden color objects
   */
  getHiddenColors(hiddenIds) {
    const activeColors = this.getActiveColors();
    return activeColors.filter((c) => hiddenIds.includes(c.id));
  }

  /**
   * Get visible (non-hidden) colors
   * @param {string[]} hiddenIds - Array of hidden color IDs
   * @returns {Array} Array of visible color objects
   */
  getVisibleColors(hiddenIds) {
    const activeColors = this.getActiveColors();
    return activeColors.filter((c) => !hiddenIds.includes(c.id));
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
        (family) => family.toLowerCase() === familyName.toLowerCase()
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
        (category) => category.toLowerCase() === categoryName.toLowerCase()
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
   * @param {string} groupType - Either 'family' or 'category'
   * @param {string[]} hiddenIds - Array of hidden color IDs
   * @returns {Array<{name: string, count: number}>} Array of hidden groups with their color counts
   */
  getHiddenGroups(groupType, hiddenIds) {
    const allGroups = {};
    const propertyName =
      groupType === "family" ? "colorFamilyNames" : "brandedCollectionNames";

    // Get all groups and their colors
    for (const color of this.getActiveColors()) {
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
        groupColors.every((color) => hiddenIds.includes(color.id));

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
   * @param {string[]} hiddenIds - Array of hidden color IDs
   * @returns {Array<{name: string, count: number}>} Array of hidden families
   */
  getHiddenFamilies(hiddenIds) {
    return this.getHiddenGroups("family", hiddenIds);
  }

  /**
   * Find all color categories where ALL colors are hidden
   * @param {string[]} hiddenIds - Array of hidden color IDs
   * @returns {Array<{name: string, count: number}>} Array of hidden categories
   */
  getHiddenCategories(hiddenIds) {
    return this.getHiddenGroups("category", hiddenIds);
  }
}
