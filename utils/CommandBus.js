/**
 * Central command dispatcher — decouples command producers from execution logic.
 */

export class CommandBus {
  #model;
  #state;
  #handler = null;

  /**
   * @param {import('../models/ColorModel.js').ColorModel} model
   * @param {import('../models/AppState.js').AppState} state
   */
  constructor(model, state) {
    this.#model = model;
    this.#state = state;
  }

  /**
   * Register the single command handler (typically ColorController._executeCommand).
   * @param {(command: import('../commands/ColorCommand.js').ColorCommand) => void} handler
   */
  setHandler(handler) {
    this.#handler = handler;
  }

  /**
   * Inject model/state into the command, then dispatch through the registered handler.
   * @param {import('../commands/ColorCommand.js').ColorCommand} command
   */
  execute(command) {
    if (!this.#handler) {
      throw new Error("CommandBus: no handler registered");
    }
    command.model = this.#model;
    command.state = this.#state;
    this.#handler(command);
  }
}
