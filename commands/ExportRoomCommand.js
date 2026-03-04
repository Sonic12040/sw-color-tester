import { ColorCommand } from "./ColorCommand.js";
import { VisualizerView } from "../views/VisualizerView.js";

/**
 * Export the active room as a self-contained .json file.
 *
 * The exported payload is a deep clone of the room's Vector Scene Graph
 * JSON with the user's active roomColors and lighting preset injected
 * into an `appliedState` envelope. A recipient can later import this
 * file to reproduce the exact same design.
 *
 * Dispatched via CommandBus — `model` and `state` are injected.
 */
export class ExportRoomCommand extends ColorCommand {
  execute() {
    const roomId = this.state.getCurrentRoomId();
    if (!roomId) return false;

    const roomPayload = VisualizerView.findRoomById(
      roomId,
      this.state.getCustomRooms(),
    );
    if (!roomPayload) return false;

    // Deep-clone so we never mutate the live scene graph
    const exportPayload = structuredClone(roomPayload);

    // Inject current applied state
    exportPayload.appliedState = {
      roomColors: Object.fromEntries(this.state.getRoomColors()),
      timeOfDay: this.state.getTimeOfDay(),
      exportDate: new Date().toISOString(),
    };

    // Trigger browser download
    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const slug = exportPayload.room.name
      ? exportPayload.room.name.toLowerCase().replaceAll(/\s+/g, "-")
      : roomId;
    const timestamp = new Date()
      .toISOString()
      .replaceAll(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `${slug}-${timestamp}.json`;

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);

    return true;
  }
}
