/**
 * BulkHideCommand - Command for bulk hide/unhide operations
 * Encapsulates the business logic for hiding/unhiding all colors in a group
 */

import { ColorCommand } from "./ColorCommand.js";

export class BulkHideCommand extends ColorCommand {
  constructor(model, state, groupId, groupName, precomputedColors = null) {
    super(model, state);
    this.groupId = groupId;
    this.groupName = groupName;
    this._precomputedColors = precomputedColors;
  }

  execute() {
    const groupColors =
      this._precomputedColors ||
      this.model.getColorsForId(this.groupId, () => this.groupName);
    this._precomputedColors = null; // Release reference after use
    const hiddenSet = this.state.getHiddenSet();

    // Check if all colors are already hidden
    const allHidden = groupColors.every((color) => hiddenSet.has(color.id));
    const colorIds = groupColors.map((color) => color.id);

    // Store state for undo
    this.wasHiding = !allHidden;
    this.colorIds = colorIds;

    if (allHidden) {
      this.state.removeMultipleHidden(colorIds);
    } else {
      this.state.addMultipleHidden(colorIds);
    }

    return true; // State changed, re-render needed
  }

  undo() {
    // Restore previous state
    if (this.colorIds) {
      if (this.wasHiding) {
        // Was hiding, so unhide them
        this.state.removeMultipleHidden(this.colorIds);
      } else {
        // Was unhiding, so hide them again
        this.state.addMultipleHidden(this.colorIds);
      }
      return true; // State changed, re-render needed
    }
    return false;
  }
}
