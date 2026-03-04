import { ColorCommand } from "./ColorCommand.js";

/**
 * Apply a color from the palette to a paintable room layer.
 *
 * Resolves the hex value from the ColorModel and delegates to
 * AppState.setRoomColor(), which emits "roomColorsChanged".
 */
export class ApplyColorCommand extends ColorCommand {
  /**
   * @param {string} roomId  — must match the current room
   * @param {string} layerId — target layer id (must be type "paintable")
   * @param {string} colorId — color id from colorData / ColorModel
   */
  constructor(roomId, layerId, colorId) {
    super();
    this.roomId = roomId;
    this.layerId = layerId;
    this.colorId = colorId;
  }

  execute() {
    // Guard: only apply to the active room
    if (this.state.getCurrentRoomId() !== this.roomId) return false;

    const color = this.model.getColorById(this.colorId);
    if (!color) return false;

    this.state.setRoomColor(this.layerId, color.hex);
    return true;
  }
}
