import type { ColorModel } from "../models/ColorModel.js";
import type { AppState } from "../models/AppState.js";
import type { ColorCommand } from "../commands/ColorCommand.js";

type CommandHandler = (command: ColorCommand) => void | Promise<void>;
type Middleware = (command: ColorCommand) => void | Promise<void>;

export class CommandBus {
  #model: ColorModel;
  #state: AppState;
  #handler: CommandHandler | null = null;
  #beforeMiddleware: Middleware[] = [];
  #afterMiddleware: Middleware[] = [];

  constructor(model: ColorModel, state: AppState) {
    this.#model = model;
    this.#state = state;
  }

  setHandler(handler: CommandHandler): void {
    this.#handler = handler;
  }

  before(fn: Middleware): void {
    this.#beforeMiddleware.push(fn);
  }

  after(fn: Middleware): void {
    this.#afterMiddleware.push(fn);
  }

  async execute(command: ColorCommand): Promise<void> {
    command.model = this.#model;
    command.state = this.#state;

    for (const fn of this.#beforeMiddleware) await fn(command);

    if (this.#handler) {
      await this.#handler(command);
    } else {
      await command.execute();
    }

    for (const fn of this.#afterMiddleware) await fn(command);
  }
}
