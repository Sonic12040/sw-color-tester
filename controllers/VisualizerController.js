/**
 * VisualizerController — subscribes to AppState and applies surgical
 * DOM updates to the SVG rendered by VisualizerView.
 *
 * Responsibilities:
 *   • On "roomChanged"       → full re-render via VisualizerView.render()
 *   • On "roomColorsChanged" → rAF-batched fill update on the target <path>
 *   • On "lightingChanged"   → update environment fill + shadow/source opacity
 *   • On "favoritesChanged"  → re-render the paint bucket strip
 *   • On "customRoomsChanged"→ (informational — no render side-effect)
 *
 * All DOM writes are funnelled through requestAnimationFrame to stay in
 * sync with the browser's compositor and avoid forced reflows.
 */

import { VisualizerView } from "../views/VisualizerView.js";
import { STOCK_ROOMS } from "../constants.js";
import { ApplyColorCommand } from "../commands/ApplyColorCommand.js";
import { ChangeLightingCommand } from "../commands/ChangeLightingCommand.js";
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

  /** @type {number} Pending rAF id for lighting updates */
  #lightingRafId = 0;

  /** @type {Function[]} Unsubscribe callbacks returned by EventEmitter.on() */
  #unsubs = [];

  // ── Control panel DOM references ────────────────────────────
  /** @type {HTMLSelectElement|null} */ #roomSelect = null;
  /** @type {HTMLElement|null} */ #lightingButtons = null;
  /** @type {HTMLSelectElement|null} */ #floorSelect = null;
  /** @type {HTMLElement|null} */ #floorVariantGroup = null;
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
    this.#lightingButtons = document.getElementById("lighting-buttons");
    this.#floorSelect = document.getElementById("floor-select");
    this.#floorVariantGroup = document.getElementById("floor-variant-group");
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
    cancelAnimationFrame(this.#lightingRafId);
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
      this.#state.on("lightingChanged", (detail) =>
        this.#onLightingChanged(detail),
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

    // Apply current lighting to the freshly-rendered SVG
    this.#applyLighting(this.#state.getTimeOfDay());

    // Render the paint bucket with current favorites
    this.#updatePaintBucket();

    // Populate / refresh control panel widgets
    this.#populateRoomSelector();
    this.#populateLightingButtons();
    this.#populateFloorVariants();
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

  /**
   * Dispatch a ChangeLightingCommand.
   * @param {string} presetName — e.g. "daylight", "evening"
   */
  changeLighting(presetName) {
    this.#commandBus.execute(new ChangeLightingCommand(presetName));
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

    // Lighting buttons (delegated)
    if (this.#lightingButtons) {
      this.#lightingButtons.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-preset]");
        if (!btn) return;
        this.changeLighting(btn.dataset.preset);
        // Update aria-checked state
        for (const b of this.#lightingButtons.querySelectorAll("button")) {
          b.setAttribute(
            "aria-checked",
            String(b.dataset.preset === btn.dataset.preset),
          );
        }
      });
    }

    // Floor variant selector
    if (this.#floorSelect) {
      this.#floorSelect.addEventListener("change", () => {
        this.#applyFloorVariant(this.#floorSelect.value);
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

  /**
   * Populate lighting preset buttons from the active room's lightingPresets.
   */
  #populateLightingButtons() {
    if (!this.#lightingButtons || !this.#activeRoomPayload) return;

    const presets = this.#activeRoomPayload.room.lightingPresets;
    if (!presets) return;

    const activePreset = this.#state.getTimeOfDay();
    this.#lightingButtons.innerHTML = "";

    for (const key of Object.keys(presets)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.preset = key;
      btn.textContent = key;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", String(key === activePreset));
      this.#lightingButtons.appendChild(btn);
    }
  }

  /**
   * Populate the floor variant <select> from the first "static" layer
   * with a `variants` array. Hide the group if none found.
   */
  #populateFloorVariants() {
    if (!this.#floorSelect || !this.#activeRoomPayload) return;

    const floorLayer = this.#activeRoomPayload.room.layers.find(
      (l) => l.variants && l.variants.length,
    );

    if (!floorLayer) {
      // Hide the whole group
      if (this.#floorVariantGroup) this.#floorVariantGroup.hidden = true;
      return;
    }

    if (this.#floorVariantGroup) this.#floorVariantGroup.hidden = false;

    this.#floorSelect.innerHTML = "";

    for (const v of floorLayer.variants) {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.name || v.id;
      if (v.id === floorLayer.activeVariantId) opt.selected = true;
      this.#floorSelect.appendChild(opt);
    }
  }

  /**
   * Apply a floor variant selection: update the layer data and SVG fill.
   * @param {string} variantId
   */
  #applyFloorVariant(variantId) {
    if (!this.#activeRoomPayload) return;

    const floorLayer = this.#activeRoomPayload.room.layers.find(
      (l) => l.variants && l.variants.length,
    );
    if (!floorLayer) return;

    const variant = floorLayer.variants.find((v) => v.id === variantId);
    if (!variant) return;

    // Update the live data so subsequent renders remember the choice
    floorLayer.activeVariantId = variantId;
    floorLayer.fill = variant.fill;

    // Surgical DOM update
    const el = this.#view.getLayerElement(floorLayer.id);
    if (el) el.setAttribute("fill", variant.fill);
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
   * Falls through: activeVariant → fill → defaultHex → "none".
   */
  #resolveDefaultFill(layerId) {
    if (!this.#activeRoomPayload) return "none";

    const layer = this.#activeRoomPayload.room.layers.find(
      (l) => l.id === layerId,
    );
    if (!layer) return "none";

    // Static variant
    if (layer.variants && layer.activeVariantId) {
      const variant = layer.variants.find(
        (v) => v.id === layer.activeVariantId,
      );
      if (variant) return variant.fill;
    }

    return layer.fill || layer.defaultHex || "none";
  }

  // ────────────────────────────────────────────────────────────
  // Private — Lighting updates
  // ────────────────────────────────────────────────────────────

  /**
   * Handle "lightingChanged".
   * @param {{ preset: string }} detail
   */
  #onLightingChanged({ preset }) {
    cancelAnimationFrame(this.#lightingRafId);

    this.#lightingRafId = requestAnimationFrame(() => {
      this.#applyLighting(preset);
    });
  }

  /**
   * Walk the optical-stack layers in the current room and update
   * their SVG attributes to match the given lighting preset.
   *
   * - environment  → fill = preset.temperatureHex
   * - shadow       → opacity = preset.shadowOpacity
   * - light-source → opacity = preset.sourceOpacity
   *
   * @param {string} presetName — key into room.lightingPresets
   */
  #applyLighting(presetName) {
    if (!this.#activeRoomPayload) return;

    const { lightingPresets, layers } = this.#activeRoomPayload.room;
    const preset = lightingPresets?.[presetName];
    if (!preset) return;

    for (const layer of layers) {
      const el = this.#view.getLayerElement(layer.id);
      if (!el) continue;

      switch (layer.type) {
        case "environment":
          el.setAttribute("fill", preset.temperatureHex);
          break;

        case "shadow":
          el.setAttribute("opacity", String(preset.shadowOpacity));
          break;

        case "light-source":
          el.setAttribute("opacity", String(preset.sourceOpacity));
          break;

        // paintable / static / furniture — untouched by lighting
        default:
          break;
      }
    }
  }
}
