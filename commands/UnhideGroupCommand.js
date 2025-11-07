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
    const getColors =
      this.groupType === "family"
        ? this.model.getFamilyColors.bind(this.model)
        : this.model.getCategoryColors.bind(this.model);

    const colors = getColors(this.groupName);
    const colorIds = colors.map((color) => color.id);
    this.state.removeMultipleHidden(colorIds);

    return true; // State changed, re-render needed
  }
}
