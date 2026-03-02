import { ColorCommand } from "./ColorCommand.js";

export class BulkHideCommand extends ColorCommand {
  constructor(groupId, groupName, precomputedColors = null) {
    super();
    this.groupId = groupId;
    this.groupName = groupName;
    this._precomputedColors = precomputedColors;
  }

  execute() {
    const groupColors =
      this._precomputedColors || this.model.getFamilyColors(this.groupName);
    this._precomputedColors = null; // Release reference after use

    const colorIds = groupColors.map((color) => color.id);
    if (colorIds.length === 0) return false;

    const hiddenSet = this.state.getHiddenSet();
    const allHidden = groupColors.every((color) => hiddenSet.has(color.id));

    this.wasHiding = !allHidden;
    this.colorIds = colorIds;

    if (allHidden) {
      this.state.removeMultipleHidden(colorIds);
    } else {
      this.state.addMultipleHidden(colorIds);
    }

    return true;
  }

  undo() {
    if (this.colorIds) {
      if (this.wasHiding) {
        this.state.removeMultipleHidden(this.colorIds);
      } else {
        this.state.addMultipleHidden(this.colorIds);
      }
      this.colorIds = null;
      return true;
    }
    return false;
  }
}
