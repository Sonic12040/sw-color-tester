import { EventEmitter } from "../utils/EventEmitter.js";
import type { ColorModel } from "./ColorModel.js";

export class AppState extends EventEmitter {
  hidden: Set<string>;
  lrvMin: number;
  lrvMax: number;
  colorModel: ColorModel | null;

  constructor(colorModel: ColorModel | null = null) {
    super();
    this.hidden = new Set();
    this.lrvMin = 0;
    this.lrvMax = 100;
    this.colorModel = colorModel;
  }

  getHiddenSet(): Set<string> {
    return this.hidden;
  }

  toggleHidden(colorId: string): void {
    if (this.hidden.has(colorId)) {
      this.hidden.delete(colorId);
    } else {
      this.hidden.add(colorId);
    }
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
    this.emit(event);
  }

  addMultipleHidden(colorIds: string[]): void {
    this.#bulkUpdate(this.hidden, colorIds, "add", "hiddenChanged");
  }

  removeMultipleHidden(colorIds: string[]): void {
    this.#bulkUpdate(this.hidden, colorIds, "delete", "hiddenChanged");
  }

  clearHidden(): void {
    this.hidden.clear();
    this.emit("hiddenChanged");
  }

  getLrvRange(): { min: number; max: number } {
    return { min: this.lrvMin, max: this.lrvMax };
  }

  setLrvRange(min: number, max: number): void {
    this.lrvMin = Math.max(0, Math.min(100, min));
    this.lrvMax = Math.max(0, Math.min(100, max));
    this.emit("lrvChanged");
  }

  isLrvFilterActive(): boolean {
    return this.lrvMin > 0 || this.lrvMax < 100;
  }
}
