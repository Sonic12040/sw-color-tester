/**
 * VisualizerController — subscribes to AppState and applies surgical
 * DOM updates to the SVG rendered by VisualizerView.
 *
 * Responsibilities:
 *   • On "roomChanged"       → full re-render via VisualizerView.render()
 *   • On "roomColorsChanged" → rAF-batched fill update on the target <path>
 *   • On "favoritesChanged"  → re-render the paint bucket strip
 *   • On "customRoomsChanged"→ (informational — no render side-effect)
 *
 * All DOM writes are funnelled through requestAnimationFrame to stay in
 * sync with the browser's compositor and avoid forced reflows.
 */

import { VisualizerView } from "../views/VisualizerView.js";
import { STOCK_ROOMS } from "../constants.js";
import { ApplyColorCommand } from "../commands/ApplyColorCommand.js";
import { ExportRoomCommand } from "../commands/ExportRoomCommand.js";
import { ImportRoomCommand } from "../commands/ImportRoomCommand.js";

export class VisualizerController {
  /** @type {import('../models/AppState.js').AppState} */
  #state;

  /** @type {VisualizerView} */
  #view;

  /** @type {import('../utils/CommandBus.js').CommandBus} */
  #commandBus;

  /** @type {import('../models/ColorModel.js').ColorModel} */
  #colorModel;

  /**
   * Cached reference to the active room payload so we don't resolve it
   * on every micro-update.
   * @type {object|null}
   */
  #activeRoomPayload = null;

  /** @type {number} Pending rAF id for color updates */
  #colorRafId = 0;

  /** @type {Function[]} Unsubscribe callbacks returned by EventEmitter.on() */
  #unsubs = [];

  // ── Control panel DOM references ────────────────────────────
  /** @type {HTMLSelectElement|null} */ #roomSelect = null;
  /** @type {HTMLButtonElement|null} */ #exportBtn = null;
  /** @type {HTMLButtonElement|null} */ #importBtn = null;
  /** @type {HTMLInputElement|null} */ #importInput = null;
  /** @type {HTMLElement|null} */ #hintEl = null;
  /**
   * @param {import('../models/AppState.js').AppState} state
   * @param {VisualizerView} view
   * @param {import('../utils/CommandBus.js').CommandBus} commandBus
   * @param {import('../models/ColorModel.js').ColorModel} colorModel
   */
  constructor(state, view, commandBus, colorModel) {
    this.#state = state;
    this.#view = view;
    this.#commandBus = commandBus;
    this.#colorModel = colorModel;

    // Cache DOM references for the control panel
    this.#roomSelect = document.getElementById("room-select");
    this.#exportBtn = document.getElementById("export-room-btn");
    this.#importBtn = document.getElementById("import-room-btn");
    this.#importInput = document.getElementById("import-room-input");
    this.#hintEl = document.getElementById("visualizer-hint");

    this.#subscribe();
    this.#bindLayerInteraction();
    this.#bindControlPanel();
    this.#renderCurrentRoom();
  }

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────

  /** Tear down subscriptions and cancel pending rAFs. */
  destroy() {
    for (const unsub of this.#unsubs) unsub();
    this.#unsubs.length = 0;
    cancelAnimationFrame(this.#colorRafId);
    this.#view.destroy();
  }

  // ────────────────────────────────────────────────────────────
  // Private — Event subscriptions
  // ────────────────────────────────────────────────────────────

  #subscribe() {
    this.#unsubs.push(
      this.#state.on("roomChanged", () => this.#onRoomChanged()),
      this.#state.on("roomColorsChanged", (detail) =>
        this.#onRoomColorsChanged(detail),
      ),
      this.#state.on("favoritesChanged", () => this.#updatePaintBucket()),
      this.#state.on("customRoomsChanged", () => this.#populateRoomSelector()),
    );
  }

  // ────────────────────────────────────────────────────────────
  // Private — Room switching (full re-render)
  // ────────────────────────────────────────────────────────────

  /** Resolve the active room payload and do a full SVG render. */
  #renderCurrentRoom() {
    const roomId = this.#state.getCurrentRoomId();
    if (!roomId) return;

    const payload = VisualizerView.findRoomById(
      roomId,
      this.#state.getCustomRooms(),
    );
    if (!payload) return;

    this.#activeRoomPayload = payload;

    try {
      this.#view.render(payload, this.#state.getRoomColors());
    } catch (err) {
      console.error("VisualizerView.render() failed:", err);
    }

    // Update room name in the info bar
    const nameEl = document.getElementById("visualizer-room-name");
    if (nameEl) nameEl.textContent = payload.room.name || roomId;

    // Render the paint bucket with current favorites
    this.#updatePaintBucket();

    // Populate / refresh room selector
    this.#populateRoomSelector();
  }

  #onRoomChanged() {
    this.#renderCurrentRoom();
  }

  // ────────────────────────────────────────────────────────────
  // Private — Layer click → Command dispatch
  // ────────────────────────────────────────────────────────────

  /**
   * Bind interaction handlers for paintable layers and swatch selection.
   *
   * Uses VisualizerView's delegated callbacks so listeners survive
   * SVG re-renders without needing to be re-attached.
   */
  #bindLayerInteraction() {
    // When a swatch is selected, hide the hint
    this.#view.onSwatchSelect(() => {
      if (this.#hintEl) this.#hintEl.hidden = true;
    });

    // When the user clicks an interactive layer in the SVG...
    this.#view.onLayerClick((layerId, layerType) => {
      if (layerType === "paintable") {
        this.applySelectedColor(layerId);
      }
    });
  }

  /**
   * Dispatch an ApplyColorCommand for the given paintable layer using
   * the currently-selected swatch colour.
   * @param {string} layerId
   */
  applySelectedColor(layerId) {
    const colorId = this.#view.getSelectedColorId();
    if (!colorId) return;

    const roomId = this.#state.getCurrentRoomId();
    if (!roomId) return;

    this.#commandBus.execute(new ApplyColorCommand(roomId, layerId, colorId));
  }

  // ────────────────────────────────────────────────────────────
  // Private — Control panel binding & population
  // ────────────────────────────────────────────────────────────

  /** Bind event listeners for all control panel widgets (one-time). */
  #bindControlPanel() {
    // ── Room selector ────────────────────────────────────────
    if (this.#roomSelect) {
      this.#roomSelect.addEventListener("change", () => {
        this.#state.setCurrentRoomId(this.#roomSelect.value);
      });
    }

    // Export room
    if (this.#exportBtn) {
      this.#exportBtn.addEventListener("click", () => {
        this.#commandBus.execute(new ExportRoomCommand());
      });
    }

    // Import room
    if (this.#importBtn && this.#importInput) {
      this.#importBtn.addEventListener("click", () => {
        this.#importInput.value = ""; // reset so re-selecting same file fires change
        this.#importInput.click();
      });

      this.#importInput.addEventListener("change", () => {
        const file = this.#importInput.files?.[0];
        if (file) {
          this.#commandBus.execute(new ImportRoomCommand(file));
        }
      });
    }
  }

  /**
   * (Re-)populate the room <select> with stock + custom rooms.
   * Preserves the current selection.
   */
  #populateRoomSelector() {
    if (!this.#roomSelect) return;

    const currentId = this.#state.getCurrentRoomId();
    this.#roomSelect.innerHTML = "";

    // Stock rooms
    for (const sr of STOCK_ROOMS) {
      const opt = document.createElement("option");
      opt.value = sr.room.id;
      opt.textContent = sr.room.name || sr.room.id;
      if (sr.room.id === currentId) opt.selected = true;
      this.#roomSelect.appendChild(opt);
    }

    // Custom rooms
    const custom = this.#state.getCustomRooms();
    if (custom.length) {
      const group = document.createElement("optgroup");
      group.label = "Custom Rooms";
      for (const cr of custom) {
        const opt = document.createElement("option");
        opt.value = cr.room.id;
        opt.textContent = cr.room.name || cr.room.id;
        if (cr.room.id === currentId) opt.selected = true;
        group.appendChild(opt);
      }
      this.#roomSelect.appendChild(group);
    }
  }

  // ────────────────────────────────────────────────────────────
  // Private — Paint bucket management
  // ────────────────────────────────────────────────────────────

  /**
   * Resolve the current favorites to full color objects and re-render
   * the paint bucket strip.
   */
  #updatePaintBucket() {
    const favoriteIds = this.#state.getFavoriteSet();
    const favoriteColors = [];

    for (const id of favoriteIds) {
      const color = this.#colorModel.getColorById(id);
      if (color) favoriteColors.push(color);
    }

    this.#view.renderPaintBucket(favoriteColors);
  }

  // ────────────────────────────────────────────────────────────
  // Private — Surgical color updates
  // ────────────────────────────────────────────────────────────

  /**
   * Handle "roomColorsChanged".
   *
   * `detail` is either:
   *   • `{ layerId, colorHex }` — a single layer was painted / reverted
   *   • `null`                  — all colors cleared (full repaint needed)
   */
  #onRoomColorsChanged(detail) {
    if (!detail) {
      // Bulk clear — re-render the whole room to reset all fills
      this.#renderCurrentRoom();
      return;
    }

    const { layerId, colorHex } = detail;

    // Cancel any pending rAF so we don't double-write
    cancelAnimationFrame(this.#colorRafId);

    this.#colorRafId = requestAnimationFrame(() => {
      const pathEl = this.#view.getLayerElement(layerId);
      if (!pathEl) return;

      if (colorHex) {
        pathEl.setAttribute("fill", colorHex);
      } else {
        // Color removed — resolve back to the layer's default fill
        const defaultFill = this.#resolveDefaultFill(layerId);
        pathEl.setAttribute("fill", defaultFill);
      }
    });
  }

  /**
   * Look up the default fill for a layer from the cached room payload.
   * Falls through: fill → defaultHex → "none".
   */
  #resolveDefaultFill(layerId) {
    if (!this.#activeRoomPayload) return "none";

    const layer = this.#activeRoomPayload.room.layers.find(
      (l) => l.id === layerId,
    );
    if (!layer) return "none";

    return layer.fill || layer.defaultHex || "none";
  }
}
