import { ColorCommand } from "./ColorCommand.js";

export class ClearHiddenCommand extends ColorCommand {
  previousHidden?: string[] | null;

  execute(): boolean {
    const hiddenSet = this.state.getHiddenSet();
    if (hiddenSet.size === 0) return false;
    this.previousHidden = [...hiddenSet];
    this.state.clearHidden();
    return true;
  }

  undo(): boolean {
    if (this.previousHidden) {
      this.state.addMultipleHidden(this.previousHidden);
      this.previousHidden = null;
      return true;
    }
    return false;
  }
}
