import { ColorCommand } from "./ColorCommand.js";

export class ToggleFavoriteCommand extends ColorCommand {
  constructor(colorId) {
    super();
    this.colorId = colorId;
  }

  execute() {
    this.state.toggleFavorite(this.colorId);
    return true;
  }
}
