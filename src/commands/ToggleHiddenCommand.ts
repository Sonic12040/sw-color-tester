import { ColorCommand } from "./ColorCommand.js";

export class ToggleHiddenCommand extends ColorCommand {
  constructor(private readonly colorId: string) {
    super();
  }

  execute(): boolean {
    this.state.toggleHidden(this.colorId);
    return true;
  }
}
