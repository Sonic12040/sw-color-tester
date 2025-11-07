/**
 * BulkHideCommand - Command for bulk hide/unhide operations
 * Encapsulates the business logic for hiding/unhiding all colors in a group
 */

import { ColorCommand } from "./ColorCommand.js";

export class BulkHideCommand extends ColorCommand {
  constructor(model, state, groupId, groupName) {
    super(model, state);
    this.groupId = groupId;
    this.groupName = groupName;
  }

  execute() {
    const groupColors = this.model.getColorsForId(
      this.groupId,
      () => this.groupName
    );
    const hidden = this.state.getHidden();

    // Check if all colors are already hidden
    const allHidden = groupColors.every((color) => hidden.includes(color.id));
    const colorIds = groupColors.map((color) => color.id);

    if (allHidden) {
      this.state.removeMultipleHidden(colorIds);
    } else {
      this.state.addMultipleHidden(colorIds);
    }

    return true; // State changed, re-render needed
  }
}
