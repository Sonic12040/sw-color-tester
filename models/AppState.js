/**
 * Application state — favorites, hidden colors, and LRV range, persisted to URL.
 */

import { URL_PARAMS } from "../utils/config.js";
import {
  encodeBitset,
  decodeBitset,
  CURRENT_PALETTE_VERSION,
} from "../utils/bitset-codec.js";
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
   * Load state from URL parameters.
   * Format: ?v=1&f=<base64url>&h=<base64url>
   */
  loadFromURL() {
    const params = new URLSearchParams(globalThis.location.search);
    const version = Number(
      params.get(URL_PARAMS.VERSION) || CURRENT_PALETTE_VERSION,
    );

    this.favorites = new Set(
      decodeBitset(params.get(URL_PARAMS.FAVORITES) || "", version),
    );
    this.hidden = new Set(
      decodeBitset(params.get(URL_PARAMS.HIDDEN) || "", version),
    );

    // Load LRV filter range
    const lrvMinParam = params.get(URL_PARAMS.LRV_MIN);
    const lrvMaxParam = params.get(URL_PARAMS.LRV_MAX);
    this.lrvMin = lrvMinParam !== null ? Number(lrvMinParam) : 0;
    this.lrvMax = lrvMaxParam !== null ? Number(lrvMaxParam) : 100;

    this.neutralBg = params.get(URL_PARAMS.NEUTRAL_BG) === "1";

    const scrollParam = params.get(URL_PARAMS.SCROLL);
    this.scrollPosition = scrollParam ? Number(scrollParam) : 0;
  }

  syncToURL() {
    const encodedFavorites = encodeBitset(this.favorites);
    const encodedHidden = encodeBitset(this.hidden);

    const params = new URLSearchParams();

    // Always write the current palette version
    params.set(URL_PARAMS.VERSION, String(CURRENT_PALETTE_VERSION));

    if (encodedFavorites) {
      params.set(URL_PARAMS.FAVORITES, encodedFavorites);
    }

    if (encodedHidden) {
      params.set(URL_PARAMS.HIDDEN, encodedHidden);
    }

    // LRV filter range (only persist non-default values)
    if (this.lrvMin > 0) {
      params.set(URL_PARAMS.LRV_MIN, this.lrvMin.toString());
    }

    if (this.lrvMax < 100) {
      params.set(URL_PARAMS.LRV_MAX, this.lrvMax.toString());
    }

    // Neutral background (only persist when active)
    if (this.neutralBg) {
      params.set(URL_PARAMS.NEUTRAL_BG, "1");
    }

    if (this.scrollPosition > 0) {
      params.set(URL_PARAMS.SCROLL, Math.round(this.scrollPosition).toString());
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
   * @param {Set<string>} set - The target Set to mutate
   * @param {string[]} colorIds - Array of color IDs to operate on
   * @param {string} operation - 'add' or 'remove'
   * @param {string} event - Event name to emit after mutation
   */
  #bulkUpdate(set, colorIds, method, event) {
    for (const id of colorIds) {
      set[method](id);
    }
    this.syncToURL();
    this.emit(event);
  }

  addMultipleFavorites(colorIds) {
    this.#bulkUpdate(this.favorites, colorIds, "add", "favoritesChanged");
  }

  removeMultipleFavorites(colorIds) {
    this.#bulkUpdate(this.favorites, colorIds, "delete", "favoritesChanged");
  }

  addMultipleHidden(colorIds) {
    this.#bulkUpdate(this.hidden, colorIds, "add", "hiddenChanged");
  }

  removeMultipleHidden(colorIds) {
    this.#bulkUpdate(this.hidden, colorIds, "delete", "hiddenChanged");
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
