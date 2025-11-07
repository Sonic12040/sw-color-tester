/**
 * BulkFavoriteCommand - Command for bulk favorite/unfavorite operations
 * Encapsulates the business logic for favoriting/unfavoriting all colors in a group
 */

import { ColorCommand } from "./ColorCommand.js";

export class BulkFavoriteCommand extends ColorCommand {
  constructor(model, state, groupId, groupName) {
    super(model, state);
    this.groupId = groupId;
    this.groupName = groupName;
  }

  execute() {
    const groupColors = this.model.getColorsForId(
      this.groupId,
      () => this.groupName
    );
    const favorites = this.state.getFavorites();

    // Check if all colors are already favorited
    const allFavorited = groupColors.every((color) =>
      favorites.includes(color.id)
    );
    const colorIds = groupColors.map((color) => color.id);

    if (allFavorited) {
      this.state.removeMultipleFavorites(colorIds);
    } else {
      this.state.addMultipleFavorites(colorIds);
    }

    return true; // State changed, re-render needed
  }
}
