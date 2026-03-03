import { ColorCommand } from "./ColorCommand.js";

export class ClearHiddenCommand extends ColorCommand {
  execute() {
    const hiddenSet = this.state.getHiddenSet();
    if (hiddenSet.size === 0) return false;

    this.previousHidden = [...hiddenSet];
    this.state.clearHidden();
    return true;
  }

  undo() {
    if (this.previousHidden) {
      this.state.addMultipleHidden(this.previousHidden);
      this.previousHidden = null;
      return true;
    }
    return false;
  }
}
