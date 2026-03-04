import { ColorCommand } from "./ColorCommand.js";
import { StorageService } from "../utils/StorageService.js";

/**
 * Import a room design from a user-uploaded .json file.
 *
 * Validates the Vector Scene Graph schema, persists the room to
 * IndexedDB via StorageService, registers it with AppState, and
 * hydrates any embedded appliedState (roomColors + lighting).
 *
 * Dispatched via CommandBus — `model` and `state` are injected.
 *
 * @example
 *   const cmd = new ImportRoomCommand(file);
 *   await commandBus.execute(cmd);
 */
export class ImportRoomCommand extends ColorCommand {
  /** @type {File} */
  #file;

  /** Shared StorageService singleton */
  static #storage = new StorageService();

  /**
   * @param {File} file — JSON file chosen by the user (from <input type="file">)
   */
  constructor(file) {
    super();
    this.#file = file;
  }

  /**
   * Read, validate, persist, and hydrate the imported room.
   * @returns {Promise<boolean>} True if import succeeded.
   */
  async execute() {
    // ── 1. Read the file ───────────────────────────────────
    let text;
    try {
      text = await this.#file.text();
    } catch {
      console.error("[ImportRoomCommand] Failed to read file.");
      return false;
    }

    // ── 2. Parse JSON ──────────────────────────────────────
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      console.error("[ImportRoomCommand] File is not valid JSON.");
      return false;
    }

    // ── 3. Validate schema ─────────────────────────────────
    if (!ImportRoomCommand.#validateSchema(payload)) {
      console.error("[ImportRoomCommand] Schema validation failed.");
      return false;
    }

    // ── 4. Strip appliedState before persisting ────────────
    const appliedState = payload.appliedState ?? null;
    const roomPayload = structuredClone(payload);
    delete roomPayload.appliedState;

    // ── 5. Persist to IndexedDB ────────────────────────────
    try {
      await ImportRoomCommand.#storage.saveRoom(roomPayload);
    } catch (err) {
      console.error("[ImportRoomCommand] IndexedDB save failed:", err);
      // Non-fatal — we can still hydrate in-memory
    }

    // ── 6. Register in AppState ────────────────────────────
    this.state.addCustomRoom(roomPayload);
    this.state.setCurrentRoomId(roomPayload.room.id);

    // ── 7. Hydrate embedded colors & lighting ──────────────
    if (appliedState) {
      if (appliedState.roomColors) {
        for (const [layerId, hex] of Object.entries(appliedState.roomColors)) {
          this.state.setRoomColor(layerId, hex);
        }
      }
      if (appliedState.timeOfDay) {
        this.state.setTimeOfDay(appliedState.timeOfDay);
      }
    }

    return true;
  }

  // ────────────────────────────────────────────────────────────
  // Private — Schema validation
  // ────────────────────────────────────────────────────────────

  /**
   * Minimal structural validation of the Vector Scene Graph JSON.
   *
   * Checks:
   *  - Top-level `room` object exists
   *  - `room.id` is a non-empty string
   *  - `room.viewport` has numeric width/height
   *  - `room.layers` is a non-empty array
   *  - Every layer has `id`, `type`, `path`, and numeric `zIndex`
   *
   * @param {object} payload
   * @returns {boolean}
   */
  static #validateSchema(payload) {
    const room = payload?.room;
    if (!room || typeof room !== "object") return false;
    if (typeof room.id !== "string" || room.id.length === 0) return false;

    const vp = room.viewport;
    if (!vp || typeof vp.width !== "number" || typeof vp.height !== "number") {
      return false;
    }

    if (!Array.isArray(room.layers) || room.layers.length === 0) return false;

    return room.layers.every(
      (layer) =>
        typeof layer.id === "string" &&
        typeof layer.type === "string" &&
        typeof layer.path === "string" &&
        typeof layer.zIndex === "number",
    );
  }
}
