/**
 * Command to unhide all colors in a family group.
 */

import { ColorCommand } from "./ColorCommand.js";

export class UnhideGroupCommand extends ColorCommand {
  constructor(groupName) {
    super();
    this.groupName = groupName;
  }

  execute() {
    // Only family groups have accordions; category groups were removed.
    const colorIds = this.model.getColorIdsForFamily(this.groupName);
    if (colorIds.length === 0) return false;

    this.state.removeMultipleHidden(colorIds);
    return true;
  }
}
