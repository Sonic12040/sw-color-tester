/**
 * AppState - State Management Model
 * Handles application state for favorites and hidden colors
 * Persists state to URL parameters for shareability
 * Responsibilities:
 * - Manage favorites and hidden color state
 * - Sync state with URL parameters
 * - Provide state query and mutation methods
 * - Consolidate favorites and hidden colors into family/category groups in URLs
 */

import { URLParameterManager } from "../utils/url-parameter-utilities.js";
import { URL_PARAMS, PREFIX } from "../utils/config.js";

export class AppState {
  constructor(colorModel = null) {
    this.favorites = new Set();
    this.hidden = new Set();
    this.colorModel = colorModel;
    this.loadFromURL();
  }

  /**
   * Set the color model (for URL consolidation)
   * @param {ColorModel} colorModel - The color model instance
   */
  setColorModel(colorModel) {
    this.colorModel = colorModel;
  }

  /**
   * Expand group identifiers (family:Red, category:Neutral) into individual color IDs
   * @private
   * @param {string[]} ids - Array of IDs that may include group identifiers
   * @returns {string[]} Array of expanded color IDs
   *
   * Supported group identifier formats:
   * - "family:Red" - All colors in the Red family
   * - "category:Living Well" - All colors in the Living Well category
   */
  _expandGroupIds(ids) {
    if (!this.colorModel) return ids;

    const expandedIds = new Set();
    const favoriteIds = this.getFavorites();

    for (const id of ids) {
      if (id.startsWith(`${PREFIX.FAMILY}:`)) {
        // Family group: "family:Red"
        const familyName = id.substring(PREFIX.FAMILY.length + 1);
        const colorIds = this.colorModel.getColorIdsForFamily(
          familyName,
          favoriteIds
        );
        for (const colorId of colorIds) {
          expandedIds.add(colorId);
        }
      } else if (id.startsWith(`${PREFIX.CATEGORY}:`)) {
        // Category group: "category:Living Well"
        const categoryName = id.substring(PREFIX.CATEGORY.length + 1);
        const colorIds = this.colorModel.getColorIdsForCategory(
          categoryName,
          favoriteIds
        );
        for (const colorId of colorIds) {
          expandedIds.add(colorId);
        }
      } else {
        // Regular color ID
        expandedIds.add(id);
      }
    }

    return Array.from(expandedIds);
  }

  /**
   * Consolidate color IDs into group identifiers where entire families/categories are selected
   * @private
   * @param {string[]} colorIds - Array of color IDs
   * @param {string[]} exclusionIds - Array of IDs to exclude from group consideration (e.g., hidden IDs when consolidating favorites)
   * @returns {string[]} Array with group identifiers for fully selected groups
   */
  _consolidateColorIds(colorIds, exclusionIds = []) {
    if (!this.colorModel || colorIds.length === 0) return colorIds;

    const consolidated = new Set(colorIds);

    // Check for fully selected families
    const selectedFamilies = this.colorModel.getHiddenFamilies(
      colorIds,
      exclusionIds
    );
    for (const family of selectedFamilies) {
      // Remove individual color IDs for this family
      const familyColorIds = this.colorModel.getColorIdsForFamily(
        family.name,
        exclusionIds
      );
      for (const colorId of familyColorIds) {
        consolidated.delete(colorId);
      }
      // Add the family group identifier
      consolidated.add(`${PREFIX.FAMILY}:${family.name}`);
    }

    // Check for fully selected categories
    const selectedCategories = this.colorModel.getHiddenCategories(
      colorIds,
      exclusionIds
    );
    for (const category of selectedCategories) {
      // Remove individual color IDs for this category
      const categoryColorIds = this.colorModel.getColorIdsForCategory(
        category.name,
        exclusionIds
      );
      for (const colorId of categoryColorIds) {
        consolidated.delete(colorId);
      }
      // Add the category group identifier
      consolidated.add(`${PREFIX.CATEGORY}:${category.name}`);
    }

    return Array.from(consolidated);
  }

  /**
   * Consolidate color IDs into group identifiers where entire families/categories are hidden
   * @private
   * @param {string[]} hiddenIds - Array of hidden color IDs
   * @returns {string[]} Array with group identifiers for fully hidden groups
   */
  _consolidateHiddenIds(hiddenIds) {
    const favoriteIds = this.getFavorites();
    return this._consolidateColorIds(hiddenIds, favoriteIds);
  }

  /**
   * Consolidate color IDs into group identifiers where entire families/categories are favorited
   * @private
   * @param {string[]} favoriteIds - Array of favorite color IDs
   * @returns {string[]} Array with group identifiers for fully favorited groups
   */
  _consolidateFavoriteIds(favoriteIds) {
    const hiddenIds = this.getHidden();
    return this._consolidateColorIds(favoriteIds, hiddenIds);
  }

  /**
   * Load state from URL parameters
   */
  loadFromURL() {
    const favoriteIds = URLParameterManager.getArrayParameter(
      URL_PARAMS.FAVORITES
    );
    const hiddenIds = URLParameterManager.getArrayParameter(URL_PARAMS.HIDDEN);

    // Expand any group identifiers in both favorites and hidden
    const expandedFavoriteIds = this._expandGroupIds(favoriteIds);
    const expandedHiddenIds = this._expandGroupIds(hiddenIds);

    this.favorites = new Set(expandedFavoriteIds);
    this.hidden = new Set(expandedHiddenIds);
  }

  /**
   * Sync current state to URL
   */
  syncToURL() {
    const favoriteArray = Array.from(this.favorites);
    const hiddenArray = Array.from(this.hidden);

    const consolidatedFavorites = this._consolidateFavoriteIds(favoriteArray);
    const consolidatedHidden = this._consolidateHiddenIds(hiddenArray);

    URLParameterManager.batchUpdate({
      [URL_PARAMS.FAVORITES]: consolidatedFavorites,
      [URL_PARAMS.HIDDEN]: consolidatedHidden,
    });
  }

  /**
   * Get array of favorite color IDs
   * @returns {string[]} Array of favorite color IDs
   */
  getFavorites() {
    return Array.from(this.favorites);
  }

  /**
   * Get array of hidden color IDs
   * @returns {string[]} Array of hidden color IDs
   */
  getHidden() {
    return Array.from(this.hidden);
  }

  /**
   * Toggle a color's favorite status
   * @param {string} colorId - Color ID to toggle
   */
  toggleFavorite(colorId) {
    if (this.favorites.has(colorId)) {
      this.favorites.delete(colorId);
    } else {
      this.favorites.add(colorId);
    }
    this.syncToURL();
  }

  /**
   * Toggle a color's hidden status
   * @param {string} colorId - Color ID to toggle
   */
  toggleHidden(colorId) {
    if (this.hidden.has(colorId)) {
      this.hidden.delete(colorId);
    } else {
      this.hidden.add(colorId);
    }
    this.syncToURL();
  }

  /**
   * Private helper for bulk operations on a Set
   * @private
   * @param {string} setName - Name of the Set property ('favorites' or 'hidden')
   * @param {string[]} colorIds - Array of color IDs to operate on
   * @param {string} operation - Operation type ('add' or 'remove')
   */
  _bulkOperation(setName, colorIds, operation) {
    const set = this[setName];
    for (const id of colorIds) {
      operation === "add" ? set.add(id) : set.delete(id);
    }
    this.syncToURL();
  }

  /**
   * Add multiple colors to favorites
   * @param {string[]} colorIds - Array of color IDs to add
   */
  addMultipleFavorites(colorIds) {
    this._bulkOperation("favorites", colorIds, "add");
  }

  /**
   * Remove multiple colors from favorites
   * @param {string[]} colorIds - Array of color IDs to remove
   */
  removeMultipleFavorites(colorIds) {
    this._bulkOperation("favorites", colorIds, "remove");
  }

  /**
   * Add multiple colors to hidden
   * @param {string[]} colorIds - Array of color IDs to add
   */
  addMultipleHidden(colorIds) {
    this._bulkOperation("hidden", colorIds, "add");
  }

  /**
   * Remove multiple colors from hidden
   * @param {string[]} colorIds - Array of color IDs to remove
   */
  removeMultipleHidden(colorIds) {
    this._bulkOperation("hidden", colorIds, "remove");
  }

  /**
   * Clear all favorites
   */
  clearFavorites() {
    this.favorites.clear();
    this.syncToURL();
  }

  /**
   * Clear all hidden colors
   */
  clearHidden() {
    this.hidden.clear();
    this.syncToURL();
  }
}
