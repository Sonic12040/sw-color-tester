import type { Color } from "../data/types.js";
import { ColorCommand } from "./ColorCommand.js";

export class BulkHideCommand extends ColorCommand {
  #precomputedColors: Color[] | null;
  wasHiding?: boolean;
  colorIds?: string[] | null;

  constructor(
    public readonly groupId: string,
    public readonly groupName: string,
    precomputedColors: Color[] | null = null,
  ) {
    super();
    this.#precomputedColors = precomputedColors;
  }

  execute(): boolean {
    const groupColors =
      this.#precomputedColors ?? this.model.getFamilyColors(this.groupName);
    this.#precomputedColors = null;

    const colorIds = groupColors.map((color) => color.id);
    if (colorIds.length === 0) return false;

    const hiddenSet = this.state.getHiddenSet();
    const allHidden = groupColors.every((color) => hiddenSet.has(color.id));

    this.wasHiding = !allHidden;
    this.colorIds = colorIds;

    if (allHidden) {
      this.state.removeMultipleHidden(colorIds);
    } else {
      this.state.addMultipleHidden(colorIds);
    }
    return true;
  }

  undo(): boolean {
    if (this.colorIds) {
      if (this.wasHiding) {
        this.state.removeMultipleHidden(this.colorIds);
      } else {
        this.state.addMultipleHidden(this.colorIds);
      }
      this.colorIds = null;
      return true;
    }
    return false;
  }
}
