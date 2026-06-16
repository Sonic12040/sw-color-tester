import type { ColorModel } from "../models/ColorModel.js";
import type { AppState } from "../models/AppState.js";

export abstract class ColorCommand {
  model!: ColorModel;
  state!: AppState;

  abstract execute(): boolean | Promise<boolean>;
}
