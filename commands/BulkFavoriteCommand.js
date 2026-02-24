import { ColorCommand } from "./ColorCommand.js";

export class BulkFavoriteCommand extends ColorCommand {
  constructor(model, state, groupId, groupName, precomputedColors = null) {
    super(model, state);
    this.groupId = groupId;
    this.groupName = groupName;
    this._precomputedColors = precomputedColors;
  }

  execute() {
    const groupColors =
      this._precomputedColors ||
      this.model.getColorsForId(this.groupId, () => this.groupName);
    this._precomputedColors = null; // Release reference after use

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
