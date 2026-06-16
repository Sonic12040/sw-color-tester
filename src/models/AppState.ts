import { URL_PARAMS } from "../utils/config.js";
import {
  encodeBitset,
  decodeBitset,
  CURRENT_PALETTE_VERSION,
} from "../utils/bitset-codec.js";
import { EventEmitter } from "../utils/EventEmitter.js";
import type { ColorModel } from "./ColorModel.js";

export class AppState extends EventEmitter {
  favorites: Set<string>;
  hidden: Set<string>;
  lrvMin: number;
  lrvMax: number;
  neutralBg: boolean;
  scrollPosition: number;
  colorModel: ColorModel | null;

  constructor(colorModel: ColorModel | null = null) {
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

  loadFromURL(): void {
    const params = new URLSearchParams(globalThis.location.search);
    const version = Number(
      params.get(URL_PARAMS.VERSION) ?? CURRENT_PALETTE_VERSION,
    );

    this.favorites = new Set(
      decodeBitset(params.get(URL_PARAMS.FAVORITES) ?? "", version),
    );
    this.hidden = new Set(
      decodeBitset(params.get(URL_PARAMS.HIDDEN) ?? "", version),
    );

    const lrvMinParam = params.get(URL_PARAMS.LRV_MIN);
    const lrvMaxParam = params.get(URL_PARAMS.LRV_MAX);
    this.lrvMin = lrvMinParam !== null ? Number(lrvMinParam) : 0;
    this.lrvMax = lrvMaxParam !== null ? Number(lrvMaxParam) : 100;

    this.neutralBg = params.get(URL_PARAMS.NEUTRAL_BG) === "1";

    const scrollParam = params.get(URL_PARAMS.SCROLL);
    this.scrollPosition = scrollParam ? Number(scrollParam) : 0;
  }

  syncToURL(): void {
    const encodedFavorites = encodeBitset(this.favorites);
    const encodedHidden = encodeBitset(this.hidden);
    const params = new URLSearchParams();

    params.set(URL_PARAMS.VERSION, String(CURRENT_PALETTE_VERSION));

    if (encodedFavorites) params.set(URL_PARAMS.FAVORITES, encodedFavorites);
    if (encodedHidden) params.set(URL_PARAMS.HIDDEN, encodedHidden);
    if (this.lrvMin > 0) params.set(URL_PARAMS.LRV_MIN, this.lrvMin.toString());
    if (this.lrvMax < 100)
      params.set(URL_PARAMS.LRV_MAX, this.lrvMax.toString());
    if (this.neutralBg) params.set(URL_PARAMS.NEUTRAL_BG, "1");
    if (this.scrollPosition > 0) {
      params.set(URL_PARAMS.SCROLL, Math.round(this.scrollPosition).toString());
    }

    const newUrl = `${globalThis.location.pathname}?${params.toString()}`;
    globalThis.history.replaceState({}, "", newUrl);
  }

  getFavoriteSet(): Set<string> {
    return this.favorites;
  }

  getHiddenSet(): Set<string> {
    return this.hidden;
  }

  toggleFavorite(colorId: string): void {
    if (this.favorites.has(colorId)) {
      this.favorites.delete(colorId);
    } else {
      this.favorites.add(colorId);
    }
    this.syncToURL();
    this.emit("favoritesChanged");
  }

  toggleHidden(colorId: string): void {
    if (this.hidden.has(colorId)) {
      this.hidden.delete(colorId);
    } else {
      this.hidden.add(colorId);
    }
    this.syncToURL();
    this.emit("hiddenChanged");
  }

  #bulkUpdate(
    set: Set<string>,
    colorIds: string[],
    method: "add" | "delete",
    event: string,
  ): void {
    for (const id of colorIds) {
      set[method](id);
    }
    this.syncToURL();
    this.emit(event);
  }

  addMultipleFavorites(colorIds: string[]): void {
    this.#bulkUpdate(this.favorites, colorIds, "add", "favoritesChanged");
  }

  removeMultipleFavorites(colorIds: string[]): void {
    this.#bulkUpdate(this.favorites, colorIds, "delete", "favoritesChanged");
  }

  addMultipleHidden(colorIds: string[]): void {
    this.#bulkUpdate(this.hidden, colorIds, "add", "hiddenChanged");
  }

  removeMultipleHidden(colorIds: string[]): void {
    this.#bulkUpdate(this.hidden, colorIds, "delete", "hiddenChanged");
  }

  clearFavorites(): void {
    this.favorites.clear();
    this.syncToURL();
    this.emit("favoritesChanged");
  }

  clearHidden(): void {
    this.hidden.clear();
    this.syncToURL();
    this.emit("hiddenChanged");
  }

  getLrvRange(): { min: number; max: number } {
    return { min: this.lrvMin, max: this.lrvMax };
  }

  setLrvRange(min: number, max: number): void {
    this.lrvMin = Math.max(0, Math.min(100, min));
    this.lrvMax = Math.max(0, Math.min(100, max));
    this.syncToURL();
    this.emit("lrvChanged");
  }

  isLrvFilterActive(): boolean {
    return this.lrvMin > 0 || this.lrvMax < 100;
  }
}
