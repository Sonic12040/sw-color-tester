/**
 * VisualizerView — Pure SVG rendering factory for Vector Scene Graph rooms.
 *
 * Parses a Room JSON payload into a fully-namespaced <svg> element:
 *   1. Builds <defs> (filters, gradients) from the room's `defs` array.
 *   2. Sorts `layers` by zIndex (Painter's Algorithm — back-to-front).
 *   3. Constructs <path> elements with the correct fill, blend-mode,
 *      filter, and data-* attributes for downstream controllers.
 *
 * Zero external dependencies.  All DOM construction uses the project's
 * shared `parseSVGContent` utility so nodes are properly SVG-namespaced.
 */

import { parseSVGContent } from "../utils/dom.js";
import { STOCK_ROOMS } from "../constants.js";

// ── SVG Namespace ────────────────────────────────────────────
const SVG_NS = "http://www.w3.org/2000/svg";

// ── Blend-mode defaults per layer type ───────────────────────
const BLEND_MODE_DEFAULTS = {
  shadow: "multiply",
  "light-source": "screen",
  environment: "soft-light",
};

// ── Layer types that receive pointer interaction ─────────────
const INTERACTIVE_TYPES = new Set(["paintable", "furniture"]);

export class VisualizerView {
  /** @type {HTMLElement|null} DOM wrapper the SVG is injected into */
  #container;

  /** @type {SVGSVGElement|null} Current rendered SVG root */
  #svgRoot = null;

  /** @type {Map<string, SVGPathElement>} Quick lookup: layerId → <path> */
  #layerElements = new Map();

  /** @type {HTMLElement|null} The paint-bucket strip element */
  #bucketStrip = null;

  /** @type {string|null} Currently selected color id from the strip */
  #selectedColorId = null;

  /** @type {((colorId: string) => void)|null} External callback for swatch selection */
  #onSwatchSelect = null;

  /** @type {((layerId: string, layerType: string) => void)|null} External callback for layer clicks */
  #onLayerClick = null;

  /**
   * @param {string|HTMLElement} container — element or CSS selector
   */
  constructor(container) {
    this.#container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;

    // Delegated click listener for interactive layers (survives re-renders)
    if (this.#container) {
      this.#container.addEventListener("click", (e) => {
        const pathEl = e.target.closest("path[data-type]");
        if (!pathEl) return;
        const type = pathEl.dataset.type;
        if (INTERACTIVE_TYPES.has(type) && this.#onLayerClick) {
          this.#onLayerClick(pathEl.dataset.layerId, type);
        }
      });
    }
  }

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────

  /**
   * Look up a room payload by its id across stock + custom rooms.
   * @param {string} roomId
   * @param {Array} [customRooms=[]] — user-imported rooms
   * @returns {object|undefined} The matching room wrapper ({ version, room })
   */
  static findRoomById(roomId, customRooms = []) {
    return (
      STOCK_ROOMS.find((r) => r.room.id === roomId) ||
      customRooms.find((r) => r.room.id === roomId)
    );
  }

  /**
   * Render a complete room SVG and inject it into the container.
   *
   * @param {object} roomPayload — full Vector Scene Graph JSON object
   *   e.g. `{ version, room: { id, viewport, defs, layers, … } }`
   * @param {Map<string, string>} [appliedColors] — Map<layerId, hex>
   *   Pre-applied colors (from AppState.roomColors) so the SVG renders
   *   with the user's current palette on first paint.
   * @returns {SVGSVGElement} The constructed <svg> element.
   */
  render(roomPayload, appliedColors = new Map()) {
    const { room } = roomPayload;

    // Tear down previous SVG
    this.#teardown();

    // Build the SVG skeleton
    const svg = this.#createSVGRoot(room.viewport);

    // 1. Parse <defs> (filters, gradients)
    const defsEl = this.#buildDefs(room.defs);
    svg.appendChild(defsEl);

    // 2. Sort layers by zIndex (Painter's Algorithm)
    const sorted = [...room.layers].sort((a, b) => a.zIndex - b.zIndex);

    // 3. Construct each <path> and append
    for (const layer of sorted) {
      const pathEl = this.#buildLayerPath(layer, room, appliedColors);
      svg.appendChild(pathEl);
      this.#layerElements.set(layer.id, pathEl);
    }

    // Inject into DOM
    this.#svgRoot = svg;
    if (this.#container) {
      this.#container.appendChild(svg);
    }

    return svg;
  }

  /**
   * Return the <path> element for a given layer id.
   * @param {string} layerId
   * @returns {SVGPathElement|undefined}
   */
  getLayerElement(layerId) {
    return this.#layerElements.get(layerId);
  }

  /**
   * Return the entire layerId → element map (for the controller).
   * @returns {Map<string, SVGPathElement>}
   */
  getLayerElements() {
    return this.#layerElements;
  }

  /**
   * Return the live SVG root element.
   * @returns {SVGSVGElement|null}
   */
  getSVGRoot() {
    return this.#svgRoot;
  }

  /** Remove the SVG from the DOM and clean up references. */
  destroy() {
    this.#teardown();
  }

  /**
   * Return the currently-selected paint bucket color id.
   * @returns {string|null}
   */
  getSelectedColorId() {
    return this.#selectedColorId;
  }

  /**
   * Register a callback invoked when the user clicks a swatch.
   * @param {(colorId: string) => void} callback
   */
  onSwatchSelect(callback) {
    this.#onSwatchSelect = callback;
  }

  /**
   * Register a callback invoked when the user clicks an interactive layer.
   * @param {(layerId: string, layerType: string) => void} callback
   */
  onLayerClick(callback) {
    this.#onLayerClick = callback;
  }

  /**
   * Reactively render (or re-render) the Paint Bucket strip.
   *
   * Call this whenever the favorites set changes. The strip is injected
   * as a sibling after the SVG inside `#container` (the visualizer
   * canvas wrapper).
   *
   * @param {Array<object>} favoriteColors — resolved color objects
   *   (each requires at minimum { id, hex, name, colorNumber, brandKey })
   */
  renderPaintBucket(favoriteColors) {
    // Tear down previous strip (if any)
    if (this.#bucketStrip) {
      this.#bucketStrip.remove();
      this.#bucketStrip = null;
    }

    if (!favoriteColors.length) return;

    // Build strip container
    const strip = document.createElement("div");
    strip.className = "paint-bucket";
    strip.setAttribute("role", "toolbar");
    strip.setAttribute("aria-label", "Favorite colors palette");

    // Build swatches
    for (const color of favoriteColors) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "paint-bucket__swatch";
      btn.dataset.colorId = color.id;
      btn.style.backgroundColor = color.hex;
      btn.setAttribute(
        "aria-label",
        `${color.brandKey} ${color.colorNumber} ${color.name}`,
      );
      btn.setAttribute("title", `${color.name} (${color.hex})`);

      if (color.id === this.#selectedColorId) {
        btn.classList.add("paint-bucket__swatch--selected");
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.setAttribute("aria-pressed", "false");
      }

      strip.appendChild(btn);
    }

    // Delegated click handler
    strip.addEventListener("click", (e) => {
      const btn = e.target.closest(".paint-bucket__swatch");
      if (!btn) return;

      const colorId = btn.dataset.colorId;

      // Toggle: clicking the same swatch deselects it
      if (this.#selectedColorId === colorId) {
        this.#selectedColorId = null;
      } else {
        this.#selectedColorId = colorId;
      }

      // Update aria-pressed on all swatches
      for (const s of strip.querySelectorAll(".paint-bucket__swatch")) {
        const isSelected = s.dataset.colorId === this.#selectedColorId;
        s.classList.toggle("paint-bucket__swatch--selected", isSelected);
        s.setAttribute("aria-pressed", String(isSelected));
      }

      // Notify the controller
      if (this.#selectedColorId && this.#onSwatchSelect) {
        this.#onSwatchSelect(this.#selectedColorId);
      }
    });

    this.#bucketStrip = strip;

    // Insert after the container (below the SVG canvas)
    if (this.#container) {
      this.#container.after(strip);
    }
  }

  // ────────────────────────────────────────────────────────────
  // Private — SVG skeleton
  // ────────────────────────────────────────────────────────────

  /**
   * Create the root <svg> with the room's viewport.
   * @param {{ width: number, height: number }} viewport
   * @returns {SVGSVGElement}
   */
  #createSVGRoot(viewport) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("xmlns", SVG_NS);
    svg.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Room visualizer");
    svg.style.display = "block";
    return svg;
  }

  // ────────────────────────────────────────────────────────────
  // Private — <defs> construction
  // ────────────────────────────────────────────────────────────

  /**
   * Build an SVG <defs> element from the room's `defs` array.
   * Supports:
   *   • type "filter"          → <filter id="…">…inner SVG…</filter>
   *   • type "radialGradient"  → <radialGradient id="…" …attrs>…stops…</radialGradient>
   *   • type "linearGradient"  → <linearGradient id="…" …attrs>…stops…</linearGradient>
   *
   * @param {Array} defs
   * @returns {SVGDefsElement}
   */
  #buildDefs(defs = []) {
    const defsEl = document.createElementNS(SVG_NS, "defs");

    for (const def of defs) {
      switch (def.type) {
        case "filter":
          this.#appendFilter(defsEl, def);
          break;

        case "radialGradient":
        case "linearGradient":
          this.#appendGradient(defsEl, def);
          break;

        default:
          // Unknown def type — skip silently (forward-compatible)
          break;
      }
    }

    return defsEl;
  }

  /**
   * Append a <filter> node parsed from the def's svgFilterNode string.
   * Uses parseSVGContent so child <feTurbulence>, <feBlend>, etc. are
   * correctly SVG-namespaced.
   */
  #appendFilter(defsEl, def) {
    const filterEl = document.createElementNS(SVG_NS, "filter");
    filterEl.setAttribute("id", def.id);
    // Allow the filter to extend beyond the element's bounding box
    filterEl.setAttribute("x", "0");
    filterEl.setAttribute("y", "0");
    filterEl.setAttribute("width", "100%");
    filterEl.setAttribute("height", "100%");

    const children = parseSVGContent(def.svgFilterNode);
    filterEl.appendChild(children);
    defsEl.appendChild(filterEl);
  }

  /**
   * Append a <radialGradient> or <linearGradient> from the def.
   * `def.svgNode` contains the <stop> markup; `def.attrs` holds the
   * element-level attributes (cx, cy, r, x1, y1, etc.).
   */
  #appendGradient(defsEl, def) {
    const gradientEl = document.createElementNS(SVG_NS, def.type);
    gradientEl.setAttribute("id", def.id);

    if (def.attrs) {
      for (const [attr, value] of Object.entries(def.attrs)) {
        gradientEl.setAttribute(attr, value);
      }
    }

    const stops = parseSVGContent(def.svgNode);
    gradientEl.appendChild(stops);
    defsEl.appendChild(gradientEl);
  }

  // ────────────────────────────────────────────────────────────
  // Private — Layer <path> construction
  // ────────────────────────────────────────────────────────────

  /**
   * Build a single <path> from a layer descriptor.
   *
   * @param {object} layer — one entry from the room's `layers` array
   * @param {object} room  — the full room object (for lightingPresets)
   * @param {Map<string, string>} appliedColors — pre-applied user colors
   * @returns {SVGPathElement}
   */
  #buildLayerPath(layer, room, appliedColors) {
    const pathEl = document.createElementNS(SVG_NS, "path");

    // ── Identity ──────────────────────────────────────────────
    pathEl.setAttribute("id", layer.id);
    pathEl.setAttribute("d", layer.path);

    // ── Data attributes for downstream controllers ────────────
    pathEl.dataset.layerId = layer.id;
    pathEl.dataset.type = layer.type;

    if (layer.physicalAreaSqFt != null) {
      pathEl.dataset.areaSqFt = String(layer.physicalAreaSqFt);
    }

    // ── Fill resolution ───────────────────────────────────────
    pathEl.setAttribute("fill", this.#resolveFill(layer, appliedColors));
    // ── Stroke (for decorative line layers like floor planks) ─
    if (layer.stroke) {
      pathEl.setAttribute("stroke", layer.stroke);
      pathEl.setAttribute("stroke-width", String(layer.strokeWidth || 1));
    }
    // ── Texture / filter ──────────────────────────────────────
    if (layer.texture) {
      // texture holds something like "url(#texture-drywall)"
      pathEl.setAttribute("filter", layer.texture);
    }

    // ── Blend mode (optical stack layers) ─────────────────────
    const blendMode =
      layer.blendMode || BLEND_MODE_DEFAULTS[layer.type] || null;
    if (blendMode) {
      pathEl.style.mixBlendMode = blendMode;
    }

    // ── Pointer events ────────────────────────────────────────
    if (INTERACTIVE_TYPES.has(layer.type)) {
      pathEl.style.cursor = "pointer";
      pathEl.setAttribute("role", "button");
      pathEl.setAttribute("tabindex", "0");

      if (layer.label) {
        pathEl.setAttribute("aria-label", layer.label);
      }
    } else {
      pathEl.style.pointerEvents = "none";
    }

    // ── Shoppable metadata ────────────────────────────────────
    if (layer.shoppable) {
      pathEl.dataset.shoppable = JSON.stringify(layer.shoppable);
    }

    return pathEl;
  }

  /**
   * Determine the fill value for a layer, considering:
   *   1. User-applied color (from AppState roomColors)
   *   2. Static variant (activeVariantId)
   *   3. Layer-level fill / defaultHex
   *
   * @param {object} layer
   * @param {Map<string, string>} appliedColors
   * @returns {string} A CSS color or url(#gradient) reference
   */
  #resolveFill(layer, appliedColors) {
    // 1. User override (paintable layers only)
    if (appliedColors.has(layer.id)) {
      return appliedColors.get(layer.id);
    }

    // 2. Static variant
    if (layer.variants && layer.activeVariantId) {
      const variant = layer.variants.find(
        (v) => v.id === layer.activeVariantId,
      );
      if (variant) return variant.fill;
    }

    // 3. Explicit fill or defaultHex
    return layer.fill || layer.defaultHex || "none";
  }

  // ────────────────────────────────────────────────────────────
  // Private — Lifecycle helpers
  // ────────────────────────────────────────────────────────────

  /** Remove the current SVG and reset internal maps. */
  #teardown() {
    if (this.#svgRoot && this.#svgRoot.parentNode) {
      this.#svgRoot.parentNode.removeChild(this.#svgRoot);
    }
    this.#svgRoot = null;
    this.#layerElements.clear();

    if (this.#bucketStrip) {
      this.#bucketStrip.remove();
      this.#bucketStrip = null;
    }
  }
}
