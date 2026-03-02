/**
 * Abstract base class for the Command Pattern.
 * model and state are injected by the CommandBus before execute() is called.
 */
export class ColorCommand {
  /** @type {import('../models/ColorModel.js').ColorModel} */
  model;
  /** @type {import('../models/AppState.js').AppState} */
  state;

  /**
   * Execute the command
   * @returns {boolean} True if state changed and re-render is needed
   */
  execute() {
    throw new Error("ColorCommand.execute() must be implemented by subclass");
  }
}
