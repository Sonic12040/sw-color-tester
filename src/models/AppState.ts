import { EventEmitter } from "../utils/EventEmitter.js";
import type { ColorModel } from "./ColorModel.js";

export class AppState extends EventEmitter {
  lrvMin: number;
  lrvMax: number;
  colorModel: ColorModel | null;

  constructor(colorModel: ColorModel | null = null) {
    super();
    this.lrvMin = 0;
    this.lrvMax = 100;
    this.colorModel = colorModel;
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
