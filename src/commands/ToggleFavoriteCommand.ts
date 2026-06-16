import { ColorCommand } from "./ColorCommand.js";

export class ToggleFavoriteCommand extends ColorCommand {
  constructor(private readonly colorId: string) {
    super();
  }

  execute(): boolean {
    this.state.toggleFavorite(this.colorId);
    return true;
  }
}
