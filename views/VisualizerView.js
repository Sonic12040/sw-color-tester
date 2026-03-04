/**
 * VisualizerView — Hybrid Masking Engine for Photorealistic Room Rendering.
 *
 * Photorealistic Hybrid ("Sandwich" Architecture):
 *   1. Base Plate   — high-res JPEG photo of the room (type: "image")
 *   2. Color Masks  — SVG <path> with mix-blend-mode: multiply, allowing
 *                     photographic shadows/textures to bleed through
 *   3. Occlusion    — transparent PNG of furniture/plants (type: "image")
 *                     at high zIndex, masking color bleed automatically
 *
 * Zero external dependencies.  All DOM construction uses SVG namespacing.
 */

import { STOCK_ROOMS } from "../constants.js";

// ── SVG Namespace ────────────────────────────────────────────
const SVG_NS = "http://www.w3.org/2000/svg";

// ── Layer types that receive pointer interaction ─────────────
const INTERACTIVE_TYPES = new Set(["paintable"]);

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
   * @param {object} roomPayload — full Room Scene Graph JSON object
   *   e.g. `{ version, room: { id, viewport, layers, … } }`
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

    // Sort layers by zIndex (Painter's Algorithm)
    const sorted = [...room.layers].sort((a, b) => a.zIndex - b.zIndex);

    // Construct each layer element and append
    for (const layer of sorted) {
      const el = this.#buildLayer(layer, room, appliedColors);
      svg.appendChild(el);
      this.#layerElements.set(layer.id, el);
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
  // Private — Layer routing
  // ────────────────────────────────────────────────────────────

  /**
   * Route to the correct builder based on layer type.
   * @param {object} layer
   * @param {object} room
   * @param {Map<string, string>} appliedColors
   * @returns {SVGElement}
   */
  #buildLayer(layer, room, appliedColors) {
    if (layer.type === "image") {
      return this.#buildImageLayer(layer);
    }
    return this.#buildLayerPath(layer, room, appliedColors);
  }

  // ────────────────────────────────────────────────────────────
  // Private — <image> construction (Hybrid Masking Engine)
  // ────────────────────────────────────────────────────────────

  /**
   * Build an SVG <image> element for photographic base plates and
   * occlusion masks.  Supports blend modes and optional pointer-events
   * override from the layer descriptor.
   *
   * @param {object} layer — must have `href`, and typically `width`/`height`
   * @returns {SVGImageElement}
   */
  #buildImageLayer(layer) {
    const imgEl = document.createElementNS(SVG_NS, "image");

    // ── Identity ──────────────────────────────────────────────
    imgEl.setAttribute("id", layer.id);
    imgEl.dataset.layerId = layer.id;
    imgEl.dataset.type = layer.type;

    // ── Source & dimensions ───────────────────────────────────
    imgEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", layer.href);
    imgEl.setAttribute("href", layer.href); // SVG 2 native href

    // Position defaults to origin; dimensions default to 100% of viewport
    imgEl.setAttribute("x", String(layer.x ?? 0));
    imgEl.setAttribute("y", String(layer.y ?? 0));
    imgEl.setAttribute("width", String(layer.width ?? "100%"));
    imgEl.setAttribute("height", String(layer.height ?? "100%"));
    imgEl.setAttribute(
      "preserveAspectRatio",
      layer.preserveAspectRatio ?? "xMidYMid meet",
    );

    // ── Blend mode ────────────────────────────────────────────
    if (layer.blendMode) {
      imgEl.style.mixBlendMode = layer.blendMode;
    }

    // ── Opacity ───────────────────────────────────────────────
    if (layer.opacity != null && layer.opacity !== 1) {
      imgEl.setAttribute("opacity", String(layer.opacity));
    }

    // ── Pointer events (occlusion layers are non-interactive) ─
    imgEl.style.pointerEvents = layer.pointerEvents ?? "none";

    return imgEl;
  }

  // ────────────────────────────────────────────────────────────
  // Private — Layer <path> construction
  // ────────────────────────────────────────────────────────────

  /**
   * Build a single <path> from a layer descriptor.  In the hybrid
   * architecture these are paintable colour-mask regions.
   *
   * @param {object} layer — one entry from the room's `layers` array
   * @param {object} room  — the full room object
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

    // ── Blend mode ────────────────────────────────────────────
    if (layer.blendMode) {
      pathEl.style.mixBlendMode = layer.blendMode;
    }

    // ── Pointer events ────────────────────────────────────────
    if (INTERACTIVE_TYPES.has(layer.type)) {
      pathEl.classList.add("layer-paintable");
      pathEl.style.cursor = "pointer";
      pathEl.setAttribute("role", "button");
      pathEl.setAttribute("tabindex", "0");

      if (layer.label) {
        pathEl.setAttribute("aria-label", layer.label);
      }
    } else {
      pathEl.style.pointerEvents = "none";
    }

    return pathEl;
  }

  /**
   * Determine the fill value for a layer, considering:
   *   1. User-applied color (from AppState roomColors)
   *   2. Layer-level fill / defaultHex
   *
   * @param {object} layer
   * @param {Map<string, string>} appliedColors
   * @returns {string} A CSS color value
   */
  #resolveFill(layer, appliedColors) {
    // 1. User override (paintable layers only)
    if (appliedColors.has(layer.id)) {
      return appliedColors.get(layer.id);
    }

    // 2. Explicit fill or defaultHex
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
