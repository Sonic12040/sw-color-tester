/**
 * Central command dispatcher with middleware support.
 * Injects model/state into commands and routes them through
 * an optional before/after middleware pipeline.
 */

export class CommandBus {
  #model;
  #state;
  #handler = null;
  #beforeMiddleware = [];
  #afterMiddleware = [];

  /**
   * @param {import('../models/ColorModel.js').ColorModel} model
   * @param {import('../models/AppState.js').AppState} state
   */
  constructor(model, state) {
    this.#model = model;
    this.#state = state;
  }

  /**
   * Register the primary command handler (typically ColorController._executeCommand).
   * @param {(command: import('../commands/ColorCommand.js').ColorCommand) => void} handler
   */
  setHandler(handler) {
    this.#handler = handler;
  }

  /**
   * Add middleware that runs before command execution.
   * @param {(command: import('../commands/ColorCommand.js').ColorCommand) => void} fn
   */
  before(fn) {
    this.#beforeMiddleware.push(fn);
  }

  /**
   * Add middleware that runs after command execution.
   * @param {(command: import('../commands/ColorCommand.js').ColorCommand) => void} fn
   */
  after(fn) {
    this.#afterMiddleware.push(fn);
  }

  /**
   * Inject model/state, run before middleware, dispatch to handler, run after middleware.
   * Supports both sync and async commands/middleware transparently.
   * @param {import('../commands/ColorCommand.js').ColorCommand} command
   * @returns {Promise<void>}
   */
  async execute(command) {
    if (!this.#handler) {
      throw new Error("CommandBus: no handler registered");
    }
    command.model = this.#model;
    command.state = this.#state;

    for (const fn of this.#beforeMiddleware) await fn(command);
    await this.#handler(command);
    for (const fn of this.#afterMiddleware) await fn(command);
  }
}
