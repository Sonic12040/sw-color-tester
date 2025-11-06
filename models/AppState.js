/**
 * AppState - State Management Model
 * Handles application state for favorites and hidden colors
 * Persists state to URL parameters for shareability
 * Responsibilities:
 * - Manage favorites and hidden color state
 * - Sync state with URL parameters
 * - Provide state query and mutation methods
 */

import { URLParameterManager } from "../utils/url-parameter-utilities.js";
import { URL_PARAMS } from "../utils/config.js";

export class AppState {
  constructor() {
    this.favorites = new Set();
    this.hidden = new Set();
    this.loadFromURL();
  }

  /**
   * Load state from URL parameters
   */
  loadFromURL() {
    const favoriteIds = URLParameterManager.getArrayParameter(
      URL_PARAMS.FAVORITES
    );
    const hiddenIds = URLParameterManager.getArrayParameter(URL_PARAMS.HIDDEN);

    this.favorites = new Set(favoriteIds);
    this.hidden = new Set(hiddenIds);
  }

  /**
   * Sync current state to URL
   */
  syncToURL() {
    URLParameterManager.batchUpdate({
      [URL_PARAMS.FAVORITES]: Array.from(this.favorites),
      [URL_PARAMS.HIDDEN]: Array.from(this.hidden),
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
   * Add multiple colors to favorites
   * @param {string[]} colorIds - Array of color IDs to add
   */
  addMultipleFavorites(colorIds) {
    for (const id of colorIds) {
      this.favorites.add(id);
    }
    this.syncToURL();
  }

  /**
   * Remove multiple colors from favorites
   * @param {string[]} colorIds - Array of color IDs to remove
   */
  removeMultipleFavorites(colorIds) {
    for (const id of colorIds) {
      this.favorites.delete(id);
    }
    this.syncToURL();
  }

  /**
   * Add multiple colors to hidden
   * @param {string[]} colorIds - Array of color IDs to add
   */
  addMultipleHidden(colorIds) {
    for (const id of colorIds) {
      this.hidden.add(id);
    }
    this.syncToURL();
  }

  /**
   * Remove multiple colors from hidden
   * @param {string[]} colorIds - Array of color IDs to remove
   */
  removeMultipleHidden(colorIds) {
    for (const id of colorIds) {
      this.hidden.delete(id);
    }
    this.syncToURL();
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
