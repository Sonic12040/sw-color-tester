/**
 * ColorCommand - Base Command Interface
 * Implements Command Pattern for encapsulating requests as objects
 * Following Robert C. Martin's Dependency Inversion Principle:
 * - High-level modules (Controller) should not depend on low-level modules (specific operations)
 * - Both should depend on abstractions (Command interface)
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
    throw new Error("Command.execute() must be implemented by subclass");
  }
}
