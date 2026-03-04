import { ColorCommand } from "./ColorCommand.js";

/**
 * Switch the active lighting preset for the visualizer room.
 *
 * Delegates to AppState.setTimeOfDay(), which emits "lightingChanged".
 */
export class ChangeLightingCommand extends ColorCommand {
  /**
   * @param {string} presetName — key into room.lightingPresets (e.g. "daylight", "evening")
   */
  constructor(presetName) {
    super();
    this.presetName = presetName;
  }

  execute() {
    this.state.setTimeOfDay(this.presetName);
    return true;
  }
}
