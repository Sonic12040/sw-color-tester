/**
 * ClearFavoritesCommand - Command for clearing all favorites
 */

import { ColorCommand } from "./ColorCommand.js";

export class ClearFavoritesCommand extends ColorCommand {
  execute() {
    // Store previous state for undo
    this.previousFavorites = [...this.state.getFavorites()];
    this.state.clearFavorites();
    return true; // State changed, re-render needed
  }

  undo() {
    // Restore previous state
    if (this.previousFavorites) {
      this.state.addMultipleFavorites(this.previousFavorites);
      return true; // State changed, re-render needed
    }
    return false;
  }
}
