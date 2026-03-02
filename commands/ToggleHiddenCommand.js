import { ColorCommand } from "./ColorCommand.js";

export class ToggleHiddenCommand extends ColorCommand {
  constructor(colorId) {
    super();
    this.colorId = colorId;
  }

  execute() {
    this.state.toggleHidden(this.colorId);
    return true;
  }
}
