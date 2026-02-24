/**
 * Abstract base class for the Command Pattern.
 */
export class ColorCommand {
  constructor(model, state) {
    this.model = model;
    this.state = state;
  }

  /**
   * Execute the command
   * @returns {boolean} True if state changed and re-render is needed
   */
  execute() {
    throw new Error("ColorCommand.execute() must be implemented by subclass");
  }
}
