/**
 * ClearHiddenCommand - Command for clearing all hidden colors
 */

import { ColorCommand } from "./ColorCommand.js";

export class ClearHiddenCommand extends ColorCommand {
  execute() {
    this.state.clearHidden();
    return true; // State changed, re-render needed
  }
}
