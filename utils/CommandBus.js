/**
 * Central command dispatcher — decouples command producers from execution logic.
 */

export class CommandBus {
  #handler = null;

  /**
   * Register the single command handler (typically ColorController._executeCommand).
   * @param {(command: import('../commands/ColorCommand.js').ColorCommand) => void} handler
   */
  setHandler(handler) {
    this.#handler = handler;
  }

  /**
   * Dispatch a command through the registered handler.
   * @param {import('../commands/ColorCommand.js').ColorCommand} command
   */
  execute(command) {
    if (!this.#handler) {
      throw new Error("CommandBus: no handler registered");
    }
    this.#handler(command);
  }
}
