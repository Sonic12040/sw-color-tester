/**
 * ClearHiddenCommand - Command for clearing all hidden colors
 */

import { ColorCommand } from "./ColorCommand.js";

export class ClearHiddenCommand extends ColorCommand {
  execute() {
    // Store previous state for undo (use Set directly, avoid double Array.from)
    this.previousHidden = Array.from(this.state.getHiddenSet());
    this.state.clearHidden();
    return true; // State changed, re-render needed
  }

  undo() {
    // Restore previous state
    if (this.previousHidden) {
      this.state.addMultipleHidden(this.previousHidden);
      return true; // State changed, re-render needed
    }
    return false;
  }
}
