/**
 * UnhideGroupCommand - Command for unhiding an entire group (family or category)
 * Encapsulates the business logic for unhiding all colors in a group
 */

import { ColorCommand } from "./ColorCommand.js";

export class UnhideGroupCommand extends ColorCommand {
  constructor(model, state, groupType, groupName) {
    super(model, state);
    this.groupType = groupType; // 'family' or 'category'
    this.groupName = groupName;
  }

  execute() {
    const colorIds =
      this.groupType === "family"
        ? this.model.getColorIdsForFamily(this.groupName)
        : this.model.getColorIdsForCategory(this.groupName);
    this.state.removeMultipleHidden(colorIds);

    return true; // State changed, re-render needed
  }
}
