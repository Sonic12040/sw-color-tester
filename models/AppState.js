/**
 * Application state — favorites, hidden colors, and LRV range, persisted to URL.
 */

import { URL_PARAMS, PREFIX } from "../utils/config.js";
import { compressIds, decompressIds } from "../utils/numeric-encoding.js";
import { EventEmitter } from "../utils/EventEmitter.js";

export class AppState extends EventEmitter {
  constructor(colorModel = null) {
    super();
    this.favorites = new Set();
    this.hidden = new Set();
    this.lrvMin = 0;
    this.lrvMax = 100;
    this.neutralBg = false;
    this.scrollPosition = 0;
    this.colorModel = colorModel;
    this.loadFromURL();
  }

  /**
   * Expand group identifiers (e.g. family:Red) into individual color IDs.
   * @private
   * @param {string[]} ids - Array of IDs that may include group identifiers
   * @returns {string[]} Array of expanded color IDs
   *
   * Supported group identifier formats:
   * - "family:Red" - All colors in the Red family
   */
  _expandGroupIds(ids) {
    if (!this.colorModel) return ids;

    const expandedIds = new Set();

    for (const id of ids) {
      if (id.startsWith(`${PREFIX.FAMILY}:`)) {
        const familyName = id.substring(PREFIX.FAMILY.length + 1);
        const colorIds = this.colorModel.getColorIdsForFamily(familyName, []);
        for (const colorId of colorIds) {
          expandedIds.add(colorId);
        }
      } else {
        expandedIds.add(id);
      }
    }

    return Array.from(expandedIds);
  }

  /**
   * Decompress a URL param, falling back to legacy comma-separated format.
   * @private
   */
  _safeDecompress(compressed, label) {
    if (!compressed) return [];
    try {
      return decompressIds(compressed);
    } catch (error) {
      console.error(`Error decompressing ${label}:`, error);
      return compressed.split(",").filter((id) => id.trim() !== "");
    }
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
    const colorIdSet = new Set(colorIds);
    const exclusionSet =
      exclusionIds instanceof Set ? exclusionIds : new Set(exclusionIds);

    // Check for fully selected families
    const selectedFamilies = this.colorModel.getHiddenFamilies(
      colorIdSet,
      exclusionSet,
    );
    for (const family of selectedFamilies) {
      const familyColorIds = this.colorModel.getColorIdsForFamily(
        family.name,
        exclusionSet,
      );
      for (const colorId of familyColorIds) {
        consolidated.delete(colorId);
      }
      consolidated.add(`${PREFIX.FAMILY}:${family.name}`);
    }

    return Array.from(consolidated);
  }

  _consolidateHiddenIds(hiddenIds) {
    return this._consolidateColorIds(hiddenIds, this.favorites);
  }

  _consolidateFavoriteIds(favoriteIds) {
    return this._consolidateColorIds(favoriteIds, this.hidden);
  }

  /**
   * Load state from URL parameters
   */
  loadFromURL() {
    const params = new URLSearchParams(globalThis.location.search);
    const compressedFavorites = params.get(URL_PARAMS.FAVORITES) || "";
    const compressedHidden = params.get(URL_PARAMS.HIDDEN) || "";

    const favoriteIds = this._safeDecompress(compressedFavorites, "favorites");
    const hiddenIds = this._safeDecompress(compressedHidden, "hidden");

    const expandedFavoriteIds = this._expandGroupIds(favoriteIds);
    const expandedHiddenIds = this._expandGroupIds(hiddenIds);

    this.favorites = new Set(expandedFavoriteIds);
    this.hidden = new Set(expandedHiddenIds);

    // Load LRV filter range
    const lrvMinParam = params.get(URL_PARAMS.LRV_MIN);
    const lrvMaxParam = params.get(URL_PARAMS.LRV_MAX);
    this.lrvMin = lrvMinParam !== null ? Number(lrvMinParam) : 0;
    this.lrvMax = lrvMaxParam !== null ? Number(lrvMaxParam) : 100;

    this.neutralBg = params.get(URL_PARAMS.NEUTRAL_BG) === "1";

    const scrollParam = params.get(URL_PARAMS.SCROLL);
    this.scrollPosition = scrollParam ? Number.parseInt(scrollParam, 10) : 0;
  }

  syncToURL() {
    const favoriteArray = Array.from(this.favorites);
    const hiddenArray = Array.from(this.hidden);

    const consolidatedFavorites = this._consolidateFavoriteIds(favoriteArray);
    const consolidatedHidden = this._consolidateHiddenIds(hiddenArray);

    const compressedFavorites = compressIds(consolidatedFavorites);
    const compressedHidden = compressIds(consolidatedHidden);

    const params = new URLSearchParams(globalThis.location.search);

    if (compressedFavorites) {
      params.set(URL_PARAMS.FAVORITES, compressedFavorites);
    } else {
      params.delete(URL_PARAMS.FAVORITES);
    }

    if (compressedHidden) {
      params.set(URL_PARAMS.HIDDEN, compressedHidden);
    } else {
      params.delete(URL_PARAMS.HIDDEN);
    }

    // LRV filter range (only persist non-default values)
    if (this.lrvMin > 0) {
      params.set(URL_PARAMS.LRV_MIN, this.lrvMin.toString());
    } else {
      params.delete(URL_PARAMS.LRV_MIN);
    }

    if (this.lrvMax < 100) {
      params.set(URL_PARAMS.LRV_MAX, this.lrvMax.toString());
    } else {
      params.delete(URL_PARAMS.LRV_MAX);
    }

    // Neutral background (only persist when active)
    if (this.neutralBg) {
      params.set(URL_PARAMS.NEUTRAL_BG, "1");
    } else {
      params.delete(URL_PARAMS.NEUTRAL_BG);
    }

    if (this.scrollPosition > 0) {
      params.set(URL_PARAMS.SCROLL, Math.round(this.scrollPosition).toString());
    } else {
      params.delete(URL_PARAMS.SCROLL);
    }

    const newUrl = `${globalThis.location.pathname}?${params.toString()}`;
    globalThis.history.replaceState({}, "", newUrl);
  }

  /**
   * @returns {Set<string>} Favorites set (read-only by convention)
   */
  getFavoriteSet() {
    return this.favorites;
  }

  /**
   * @returns {Set<string>} Hidden set (read-only by convention)
   */
  getHiddenSet() {
    return this.hidden;
  }

  toggleFavorite(colorId) {
    if (this.favorites.has(colorId)) {
      this.favorites.delete(colorId);
    } else {
      this.favorites.add(colorId);
    }
    this.syncToURL();
    this.emit("favoritesChanged");
  }

  toggleHidden(colorId) {
    if (this.hidden.has(colorId)) {
      this.hidden.delete(colorId);
    } else {
      this.hidden.add(colorId);
    }
    this.syncToURL();
    this.emit("hiddenChanged");
  }

  /**
   * @private
   * @param {Set<string>} set - The target Set to mutate
   * @param {string[]} colorIds - Array of color IDs to operate on
   * @param {string} operation - 'add' or 'remove'
   * @param {string} event - Event name to emit after mutation
   */
  _bulkUpdate(set, colorIds, operation, event) {
    for (const id of colorIds) {
      operation === "add" ? set.add(id) : set.delete(id);
    }
    this.syncToURL();
    this.emit(event);
  }

  addMultipleFavorites(colorIds) {
    this._bulkUpdate(this.favorites, colorIds, "add", "favoritesChanged");
  }

  removeMultipleFavorites(colorIds) {
    this._bulkUpdate(this.favorites, colorIds, "remove", "favoritesChanged");
  }

  addMultipleHidden(colorIds) {
    this._bulkUpdate(this.hidden, colorIds, "add", "hiddenChanged");
  }

  removeMultipleHidden(colorIds) {
    this._bulkUpdate(this.hidden, colorIds, "remove", "hiddenChanged");
  }

  clearFavorites() {
    this.favorites.clear();
    this.syncToURL();
    this.emit("favoritesChanged");
  }

  clearHidden() {
    this.hidden.clear();
    this.syncToURL();
    this.emit("hiddenChanged");
  }

  getLrvRange() {
    return { min: this.lrvMin, max: this.lrvMax };
  }

  setLrvRange(min, max) {
    this.lrvMin = Math.max(0, Math.min(100, min));
    this.lrvMax = Math.max(0, Math.min(100, max));
    this.syncToURL();
    this.emit("lrvChanged");
  }

  isLrvFilterActive() {
    return this.lrvMin > 0 || this.lrvMax < 100;
  }

  getScrollPosition() {
    return this.scrollPosition;
  }

  setScrollPosition(position) {
    this.scrollPosition = position > 0 ? Math.round(position) : 0;
    this.syncToURL();
  }

  getNeutralBg() {
    return this.neutralBg;
  }

  toggleNeutralBg() {
    this.neutralBg = !this.neutralBg;
    this.syncToURL();
    this.emit("neutralBgChanged");
  }
}
