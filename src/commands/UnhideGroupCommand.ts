import { ColorCommand } from "./ColorCommand.js";

export class UnhideGroupCommand extends ColorCommand {
  constructor(private readonly groupName: string) {
    super();
  }

  execute(): boolean {
    const colorIds = this.model.getColorIdsForFamily(this.groupName);
    if (colorIds.length === 0) return false;
    this.state.removeMultipleHidden(colorIds);
    return true;
  }
}
