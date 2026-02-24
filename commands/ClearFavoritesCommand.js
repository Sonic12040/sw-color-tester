import { ColorCommand } from "./ColorCommand.js";

export class ClearFavoritesCommand extends ColorCommand {
  execute() {
    const favoriteSet = this.state.getFavoriteSet();
    if (favoriteSet.size === 0) return false;

    this.previousFavorites = Array.from(favoriteSet);
    this.state.clearFavorites();
    return true;
  }

  undo() {
    if (this.previousFavorites) {
      this.state.addMultipleFavorites(this.previousFavorites);
      this.previousFavorites = null;
      return true;
    }
    return false;
  }
}
