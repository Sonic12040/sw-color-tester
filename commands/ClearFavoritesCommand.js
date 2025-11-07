/**
 * ClearFavoritesCommand - Command for clearing all favorites
 */

import { ColorCommand } from "./ColorCommand.js";

export class ClearFavoritesCommand extends ColorCommand {
  execute() {
    this.state.clearFavorites();
    return true; // State changed, re-render needed
  }
}
