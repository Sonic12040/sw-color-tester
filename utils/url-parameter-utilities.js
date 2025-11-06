/**
 * URL Parameter Utilities
 *
 * A centralized module for managing URL parameters in a consistent and reusable way.
 * Provides methods to get and set array-based URL parameters with automatic URL history management.
 */

import { URL_PARAMS } from "./config.js";

export class URLParameterManager {
  /**
   * Get an array parameter from the URL
   * @param {string} paramName - The name of the URL parameter
   * @param {string} delimiter - The delimiter used to split the parameter value (default: ',')
   * @returns {string[]} Array of parameter values, or empty array if parameter doesn't exist
   */
  static getArrayParameter(paramName, delimiter = ",") {
    const params = new URLSearchParams(globalThis.location.search);
    const value = params.get(paramName);
    return value
      ? value.split(delimiter).filter((item) => item.trim() !== "")
      : [];
  }

  /**
   * Set an array parameter in the URL
   * @param {string} paramName - The name of the URL parameter
   * @param {string[]} values - Array of values to set
   * @param {string} delimiter - The delimiter used to join the parameter values (default: ',')
   * @param {boolean} replaceState - Whether to replace the current history state (default: true)
   */
  static setArrayParameter(
    paramName,
    values,
    delimiter = ",",
    replaceState = true
  ) {
    const params = new URLSearchParams(globalThis.location.search);

    if (values.length > 0) {
      // Filter out empty values and join with delimiter
      const filteredValues = values.filter(
        (value) => value && value.trim() !== ""
      );
      if (filteredValues.length > 0) {
        params.set(paramName, filteredValues.join(delimiter));
      } else {
        params.delete(paramName);
      }
    } else {
      params.delete(paramName);
    }

    const newUrl = `${globalThis.location.pathname}?${params.toString()}`;

    if (replaceState) {
      globalThis.history.replaceState({}, "", newUrl);
    } else {
      globalThis.history.pushState({}, "", newUrl);
    }
  }

  /**
   * Process an array parameter value
   * @private
   */
  static _processArrayParameter(params, key, value) {
    if (value.length === 0) {
      params.delete(key);
      return;
    }

    const filteredValues = value.filter((v) => v && v.toString().trim() !== "");

    if (filteredValues.length > 0) {
      params.set(key, filteredValues.join(","));
    } else {
      params.delete(key);
    }
  }

  /**
   * Process a scalar (non-array) parameter value
   * @private
   */
  static _processScalarParameter(params, key, value) {
    const stringValue = value.toString().trim();

    if (stringValue === "") {
      params.delete(key);
    } else {
      params.set(key, stringValue);
    }
  }

  /**
   * Batch update multiple parameters at once to avoid rapid History API calls
   * @param {Object} updates - Object with parameter updates
   * @param {boolean} replaceState - Whether to replace the current history state (default: true)
   */
  static batchUpdate(updates, replaceState = true) {
    const params = new URLSearchParams(globalThis.location.search);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        this._processArrayParameter(params, key, value);
      } else {
        this._processScalarParameter(params, key, value);
      }
    }

    const newUrl = `${globalThis.location.pathname}?${params.toString()}`;

    if (replaceState) {
      globalThis.history.replaceState({}, "", newUrl);
    } else {
      globalThis.history.pushState({}, "", newUrl);
    }
  }
}

/**
 * Convenience functions for the specific use case of favorites and hidden colors
 */
export const URLState = {
  /**
   * Get favorites from URL
   * @returns {string[]} Array of favorite color IDs
   */
  getFavorites() {
    return URLParameterManager.getArrayParameter(URL_PARAMS.FAVORITES);
  },

  /**
   * Set favorites in URL
   * @param {string[]} favorites - Array of favorite color IDs
   */
  setFavorites(favorites) {
    URLParameterManager.setArrayParameter(URL_PARAMS.FAVORITES, favorites);
  },

  /**
   * Get hidden colors from URL
   * @returns {string[]} Array of hidden color IDs
   */
  getHidden() {
    return URLParameterManager.getArrayParameter(URL_PARAMS.HIDDEN);
  },

  /**
   * Set hidden colors in URL
   * @param {string[]} hidden - Array of hidden color IDs
   */
  setHidden(hidden) {
    URLParameterManager.setArrayParameter(URL_PARAMS.HIDDEN, hidden);
  },

  /**
   * Add a color to favorites
   * @param {string} colorId - The color ID to add
   */
  addFavorite(colorId) {
    const favorites = this.getFavorites();
    if (!favorites.includes(colorId)) {
      favorites.push(colorId);
      this.setFavorites(favorites);
    }
  },

  /**
   * Remove a color from favorites
   * @param {string} colorId - The color ID to remove
   */
  removeFavorite(colorId) {
    const favorites = this.getFavorites();
    const filtered = favorites.filter((id) => id !== colorId);
    this.setFavorites(filtered);
  },

  /**
   * Toggle a color's favorite status
   * @param {string} colorId - The color ID to toggle
   * @returns {boolean} True if now favorited, false if removed from favorites
   */
  toggleFavorite(colorId) {
    const favorites = this.getFavorites();
    if (favorites.includes(colorId)) {
      this.removeFavorite(colorId);
      return false;
    } else {
      this.addFavorite(colorId);
      return true;
    }
  },

  /**
   * Add a color to hidden
   * @param {string} colorId - The color ID to add
   */
  addHidden(colorId) {
    const hidden = this.getHidden();
    if (!hidden.includes(colorId)) {
      hidden.push(colorId);
      this.setHidden(hidden);
    }
  },

  /**
   * Remove a color from hidden
   * @param {string} colorId - The color ID to remove
   */
  removeHidden(colorId) {
    const hidden = this.getHidden();
    const filtered = hidden.filter((id) => id !== colorId);
    this.setHidden(filtered);
  },

  /**
   * Toggle a color's hidden status
   * @param {string} colorId - The color ID to toggle
   * @returns {boolean} True if now hidden, false if removed from hidden
   */
  toggleHidden(colorId) {
    const hidden = this.getHidden();
    if (hidden.includes(colorId)) {
      this.removeHidden(colorId);
      return false;
    } else {
      this.addHidden(colorId);
      return true;
    }
  },

  /**
   * Clear all favorites
   */
  clearFavorites() {
    this.setFavorites([]);
  },

  /**
   * Clear all hidden colors
   */
  clearHidden() {
    this.setHidden([]);
  },

  /**
   * Check if a color is favorited
   * @param {string} colorId - The color ID to check
   * @returns {boolean} True if favorited, false otherwise
   */
  isFavorite(colorId) {
    return this.getFavorites().includes(colorId);
  },

  /**
   * Check if a color is hidden
   * @param {string} colorId - The color ID to check
   * @returns {boolean} True if hidden, false otherwise
   */
  isHidden(colorId) {
    return this.getHidden().includes(colorId);
  },

  /**
   * BATCH OPERATIONS - To prevent rapid History API calls
   */

  /**
   * Add multiple colors to favorites at once
   * @param {string[]} colorIds - Array of color IDs to add
   */
  addMultipleFavorites(colorIds) {
    const favorites = this.getFavorites();
    const newFavorites = [...new Set([...favorites, ...colorIds])]; // Remove duplicates
    this.setFavorites(newFavorites);
  },

  /**
   * Remove multiple colors from favorites at once
   * @param {string[]} colorIds - Array of color IDs to remove
   */
  removeMultipleFavorites(colorIds) {
    const favorites = this.getFavorites();
    const newFavorites = favorites.filter((id) => !colorIds.includes(id));
    this.setFavorites(newFavorites);
  },

  /**
   * Add multiple colors to hidden at once
   * @param {string[]} colorIds - Array of color IDs to add
   */
  addMultipleHidden(colorIds) {
    const hidden = this.getHidden();
    const newHidden = [...new Set([...hidden, ...colorIds])]; // Remove duplicates
    this.setHidden(newHidden);
  },

  /**
   * Remove multiple colors from hidden at once
   * @param {string[]} colorIds - Array of color IDs to remove
   */
  removeMultipleHidden(colorIds) {
    const hidden = this.getHidden();
    const newHidden = hidden.filter((id) => !colorIds.includes(id));
    this.setHidden(newHidden);
  },

  /**
   * Batch update both favorites and hidden arrays at once
   * @param {Object} updates - Object with favorites and/or hidden arrays
   * @param {string[]} [updates.favorites] - New favorites array
   * @param {string[]} [updates.hidden] - New hidden array
   */
  batchUpdate(updates) {
    URLParameterManager.batchUpdate(updates);
  },
};
