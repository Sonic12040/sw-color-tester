import { ColorCommand } from "./ColorCommand.js";

export class BulkFavoriteCommand extends ColorCommand {
  #precomputedColors;

  constructor(groupId, groupName, precomputedColors = null) {
    super();
    this.groupId = groupId;
    this.groupName = groupName;
    this.#precomputedColors = precomputedColors;
  }

  execute() {
    const groupColors =
      this.#precomputedColors || this.model.getFamilyColors(this.groupName);
    this.#precomputedColors = null; // Release reference after use

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

  undo() {
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
