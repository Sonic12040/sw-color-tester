/**
 * ToggleFavoriteCommand - Command for toggling a color's favorite status
 */

import { ColorCommand } from "./ColorCommand.js";

export class ToggleFavoriteCommand extends ColorCommand {
  constructor(model, state, colorId) {
    super(model, state);
    this.colorId = colorId;
  }

  execute() {
    this.state.toggleFavorite(this.colorId);
    return true; // State changed, re-render needed
  }
}
