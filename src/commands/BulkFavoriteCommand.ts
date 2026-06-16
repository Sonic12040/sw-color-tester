import type { Color } from "../data/types.js";
import { ColorCommand } from "./ColorCommand.js";

export class BulkFavoriteCommand extends ColorCommand {
  #precomputedColors: Color[] | null;
  wasAdding?: boolean;
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

    const favoriteSet = this.state.getFavoriteSet();
    const allFavorited = groupColors.every((color) =>
      favoriteSet.has(color.id),
    );

    this.wasAdding = !allFavorited;
    this.colorIds = colorIds;

    if (allFavorited) {
      this.state.removeMultipleFavorites(colorIds);
    } else {
      this.state.addMultipleFavorites(colorIds);
    }
    return true;
  }

  undo(): boolean {
    if (this.colorIds) {
      if (this.wasAdding) {
        this.state.removeMultipleFavorites(this.colorIds);
      } else {
        this.state.addMultipleFavorites(this.colorIds);
      }
      this.colorIds = null;
      return true;
    }
    return false;
  }
}
