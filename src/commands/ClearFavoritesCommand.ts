import { ColorCommand } from "./ColorCommand.js";

export class ClearFavoritesCommand extends ColorCommand {
  previousFavorites?: string[] | null;

  execute(): boolean {
    const favoriteSet = this.state.getFavoriteSet();
    if (favoriteSet.size === 0) return false;
    this.previousFavorites = [...favoriteSet];
    this.state.clearFavorites();
    return true;
  }

  undo(): boolean {
    if (this.previousFavorites) {
      this.state.addMultipleFavorites(this.previousFavorites);
      this.previousFavorites = null;
      return true;
    }
    return false;
  }
}
