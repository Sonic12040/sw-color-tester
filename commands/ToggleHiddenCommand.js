/**
 * ToggleHiddenCommand - Command for toggling a color's hidden status
 */

import { ColorCommand } from "./ColorCommand.js";

export class ToggleHiddenCommand extends ColorCommand {
  constructor(model, state, colorId) {
    super(model, state);
    this.colorId = colorId;
  }

  execute() {
    this.state.toggleHidden(this.colorId);
    return true; // State changed, re-render needed
  }
}
