/**
 * ColorView - View Layer
 * Handles all DOM manipulation and rendering
 * Responsibilities:
 * - Render HTML to DOM
 * - Update display state
 * - Manage accordion UI behavior
 * - No business logic or state management
 */

import {
  createAccordionItem,
  colorTemplate,
  familyTileTemplate,
  parseHTML,
} from "../utils/templates.js";
import {
  PREFIX,
  CSS_CLASSES,
  DATA_ATTRIBUTES,
  ICONS,
  ELEMENT_IDS,
  createGroupId,
  getTilesContainerId,
} from "../utils/config.js";

/** @private Performance helpers — safe no-ops if Performance API unavailable */
function _perfMark(name) {
  try {
    performance.mark(name);
  } catch {}
}
function _perfMeasure(name, startMark) {
  try {
    performance.measure(name, startMark);
  } catch {}
}

export class ColorView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    /** @type {Set<string>} */
    this.favoriteIds = new Set();
    /** @type {Set<string>} */
    this.hiddenIds = new Set();
    /** @type {Set<string>} */
    this.designerPickIds = new Set();

    // Setup accordion delegation once — survives innerHTML rebuilds
    this.#setupAccordionDelegation();
  }

  /**
   * Main render method - orchestrates complete UI update
   * @param {Object} renderData - All data needed for rendering
   */
  render(renderData) {
    _perfMark("view:render:start");
    const {
      favoriteColors,
      hiddenColors,
      colorFamilies,
      sortedFamilies,
      hiddenFamilies,
    } = renderData;

    // Store Sets for template rendering (avoid recreating from color arrays)
    this.favoriteIds = renderData.favoriteSet || new Set();
    this.hiddenIds = renderData.hiddenSet || new Set();
    this.designerPickIds = renderData.designerPickIds || new Set();

    // Save accordion state before rebuilding
    const expandedSections = this.#saveAccordionState();

    // Build and insert accordion HTML
    _perfMark("view:build-accordion:start");
    const accordionHTML = this.buildAccordionHTML(
      favoriteColors.length,
      hiddenColors.length,
      sortedFamilies,
      colorFamilies,
    );
    this.container.innerHTML = accordionHTML;
    _perfMeasure("view:build-accordion", "view:build-accordion:start");

    // Populate all sections
    _perfMark("view:favorites:start");
    this.renderFavoritesSection(favoriteColors);
    _perfMeasure("view:favorites", "view:favorites:start");

    _perfMark("view:hidden:start");
    this.renderHiddenSection(hiddenColors, hiddenFamilies);
    _perfMeasure("view:hidden", "view:hidden:start");

    _perfMark("view:sections:start");
    this.renderColorSections(sortedFamilies, colorFamilies);
    _perfMeasure("view:sections", "view:sections:start");

    // Restore accordion state after rebuilding
    this.#restoreAccordionState(expandedSections);

    _perfMeasure("view:render", "view:render:start");
  }

  /**
   * Save which accordion sections are currently expanded and their scroll positions
   * @returns {Map<string, {expanded: boolean, scrollTop: number}>} Map of section states
   */
  #saveAccordionState() {
    const sectionStates = new Map();
    const headers = this.container.querySelectorAll(
      `.${CSS_CLASSES.ACCORDION_HEADER}`,
    );

    for (const header of headers) {
      const sectionId = header.getAttribute("aria-controls");
      if (sectionId) {
        const content = document.getElementById(sectionId);
        const isExpanded = header.getAttribute("aria-expanded") === "true";
        const scrollTop = content ? content.scrollTop : 0;

        sectionStates.set(sectionId, {
          expanded: isExpanded,
          scrollTop: scrollTop,
        });
      }
    }

    return sectionStates;
  }

  /**
   * Restore accordion state and scroll positions after re-rendering
   * @param {Map<string, {expanded: boolean, scrollTop: number}>} sectionStates - Map of section states
   */
  #restoreAccordionState(sectionStates) {
    if (!sectionStates || sectionStates.size === 0) return;

    // Use requestAnimationFrame to ensure DOM has settled before restoring state
    requestAnimationFrame(() => {
      const headers = this.container.querySelectorAll(
        `.${CSS_CLASSES.ACCORDION_HEADER}`,
      );

      for (const header of headers) {
        const sectionId = header.getAttribute("aria-controls");
        const state = sectionStates.get(sectionId);

        if (sectionId && state) {
          const content = document.getElementById(sectionId);

          if (content) {
            // Restore expanded state
            if (state.expanded) {
              header.setAttribute("aria-expanded", "true");
              content.setAttribute("aria-hidden", "false");
              content.removeAttribute("inert");
            }

            // Restore scroll position (needs another frame to ensure content is rendered)
            if (state.scrollTop > 0) {
              requestAnimationFrame(() => {
                content.scrollTop = state.scrollTop;
              });
            }
          }
        }
      }
    });
  }

  /**
   * Build the complete accordion HTML structure
   */
  buildAccordionHTML(
    favoriteCount,
    hiddenCount,
    sortedFamilies,
    colorFamilies,
  ) {
    let accordionHTML = "";

    // 1. Favorites section (open only if there are favorites)
    const favoritesTitle =
      favoriteCount > 0 ? `Favorites (${favoriteCount})` : "Favorites";
    accordionHTML += createAccordionItem(
      "favorites",
      favoritesTitle,
      "",
      favoriteCount > 0,
    );

    // 2. Hidden section
    const hiddenTitle =
      hiddenCount > 0 ? `Hidden Colors (${hiddenCount})` : "Hidden Colors";
    accordionHTML += createAccordionItem("hidden", hiddenTitle, "");

    // 3. Color family sections
    for (const family of sortedFamilies) {
      const count = colorFamilies[family].length;
      accordionHTML += createAccordionItem(
        createGroupId(family, PREFIX.FAMILY),
        `${family} (${count})`,
        family, // Original name for bulk actions
        false,
        true, // Show bulk actions for color families
      );
    }

    return accordionHTML;
  }

  /**
   * Render the favorites section with color tiles
   */
  renderFavoritesSection(favoriteColors) {
    const favoritesContainer = document.getElementById(
      ELEMENT_IDS.FAVORITES_TILES,
    );

    if (favoriteColors.length > 0) {
      const fragment = document.createDocumentFragment();
      for (const color of favoriteColors) {
        fragment.appendChild(
          colorTemplate(color, {
            showHideButton: false,
            favoriteIds: this.favoriteIds,
            hiddenIds: this.hiddenIds,
            designerPickIds: this.designerPickIds,
          }),
        );
      }
      favoritesContainer.innerHTML = "";
      favoritesContainer.appendChild(fragment);
    } else {
      favoritesContainer.innerHTML = `
        <div class="${CSS_CLASSES.EMPTY_MESSAGE}">
          <span class="empty-message__text">No favorite colors yet.</span>
          <span class="empty-message__hint">Click the heart icon on any color to add it to your favorites.</span>
        </div>
      `;
    }
  }

  /**
   * Render the hidden section with family tiles, category tiles, and individual colors
   */
  renderHiddenSection(hiddenColors, hiddenFamilies) {
    const hiddenContainer = document.getElementById(ELEMENT_IDS.HIDDEN_TILES);
    hiddenContainer.innerHTML = "";

    // Add individual hidden colors (excluding those in completely hidden families)
    const hiddenFamilyNames = new Set(hiddenFamilies.map((f) => f.name));
    const individualHiddenColors = hiddenColors.filter((color) => {
      if (color.colorFamilyNames && color.colorFamilyNames.length > 0) {
        return !hiddenFamilyNames.has(color.colorFamilyNames[0]);
      }
      return true;
    });

    if (hiddenFamilies.length === 0 && individualHiddenColors.length === 0) {
      hiddenContainer.innerHTML = `
        <div class="${CSS_CLASSES.EMPTY_MESSAGE}">
          <span class="empty-message__text">No hidden colors.</span>
          <span class="empty-message__hint">Click the eye icon on any color to hide it.</span>
        </div>
      `;
    } else {
      const fragment = document.createDocumentFragment();
      for (const family of hiddenFamilies) {
        fragment.appendChild(
          parseHTML(familyTileTemplate(family.name, family.count)),
        );
      }
      for (const color of individualHiddenColors) {
        fragment.appendChild(
          colorTemplate(color, {
            showFavoriteButton: false,
            favoriteIds: this.favoriteIds,
            hiddenIds: this.hiddenIds,
            designerPickIds: this.designerPickIds,
          }),
        );
      }
      hiddenContainer.appendChild(fragment);
    }
  }

  /**
   * Render all family and category sections with their color tiles
   */
  renderColorSections(sortedFamilies, colorFamilies) {
    // Populate color family sections
    for (const family of sortedFamilies) {
      const familyId = createGroupId(family, PREFIX.FAMILY);
      const familyContainer = document.getElementById(
        getTilesContainerId(familyId),
      );
      const familyColors = colorFamilies[family];

      const fragment = document.createDocumentFragment();
      for (const color of familyColors) {
        fragment.appendChild(
          colorTemplate(color, {
            favoriteIds: this.favoriteIds,
            hiddenIds: this.hiddenIds,
            designerPickIds: this.designerPickIds,
          }),
        );
      }
      familyContainer.appendChild(fragment);
    }
  }

  // ============================================
  // SURGICAL UPDATE METHODS
  // Patch individual DOM elements instead of full rebuild
  // ============================================

  /**
   * Update the favorite icon state on all instances of a tile across the DOM.
   * @param {string} colorId - The color ID
   * @param {boolean} isFavorited - Whether the color is now favorited
   */
  updateTileFavoriteState(colorId, isFavorited) {
    const buttons = this.container.querySelectorAll(
      `.${CSS_CLASSES.COLOR_TILE_FAVORITE_BUTTON}[${DATA_ATTRIBUTES.ID}="${colorId}"]`,
    );
    for (const btn of buttons) {
      const svg = btn.querySelector("svg");
      if (!svg) continue;

      // Determine icon color from the existing stroke attribute
      const iconColor = svg.getAttribute("stroke") || "currentColor";
      svg.setAttribute("fill", isFavorited ? iconColor : "none");

      const label = isFavorited ? "Unfavorite" : "Favorite";
      const colorEl = btn.closest(`.${CSS_CLASSES.COLOR_TILE}`);
      const colorName = colorEl
        ? colorEl.querySelector(`.${CSS_CLASSES.COLOR_TILE_NAME} strong`)
            ?.textContent || ""
        : "";
      btn.setAttribute("aria-label", `${label} color`);
      btn.setAttribute("title", `${label} ${colorName}`.trim());
    }
  }

  /**
   * Update the hidden icon state on all instances of a tile across the DOM.
   * @param {string} colorId - The color ID
   * @param {boolean} isHidden - Whether the color is now hidden
   */
  updateTileHiddenState(colorId, isHidden) {
    const buttons = this.container.querySelectorAll(
      `.${CSS_CLASSES.COLOR_TILE_HIDE_BUTTON}[${DATA_ATTRIBUTES.ID}="${colorId}"]`,
    );
    for (const btn of buttons) {
      const svg = btn.querySelector("svg");
      if (!svg) continue;

      svg.innerHTML = isHidden ? ICONS.EYE : ICONS.EYE_OFF;

      const label = isHidden ? "Unhide" : "Hide";
      const colorEl = btn.closest(`.${CSS_CLASSES.COLOR_TILE}`);
      const colorName = colorEl
        ? colorEl.querySelector(`.${CSS_CLASSES.COLOR_TILE_NAME} strong`)
            ?.textContent || ""
        : "";
      btn.setAttribute("aria-label", `${label} color`);
      btn.setAttribute("title", `${label} ${colorName}`.trim());
    }
  }

  /**
   * Add a single color tile to a section's tile grid.
   * @param {string} sectionId - The accordion section ID (e.g. 'family-red')
   * @param {Object} color - The color object
   * @param {Object} options - Options for colorTemplate
   */
  addTileToSection(sectionId, color, options = {}) {
    const containerId = getTilesContainerId(sectionId);
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove empty-message placeholder if present
    const emptyMsg = container.querySelector(`.${CSS_CLASSES.EMPTY_MESSAGE}`);
    if (emptyMsg) emptyMsg.remove();

    const node = colorTemplate(color, {
      favoriteIds: this.favoriteIds,
      hiddenIds: this.hiddenIds,
      designerPickIds: this.designerPickIds,
      ...options,
    });
    container.appendChild(node);
  }

  /**
   * Remove a single color tile from a section's tile grid.
   * @param {string} sectionId - The accordion section ID
   * @param {string} colorId - The color ID to remove
   */
  removeTileFromSection(sectionId, colorId) {
    const containerId = getTilesContainerId(sectionId);
    const container = document.getElementById(containerId);
    if (!container) return;

    const tile = container.querySelector(
      `.${CSS_CLASSES.COLOR_TILE}[${DATA_ATTRIBUTES.ID}="${colorId}"]`,
    );
    if (tile) tile.remove();
  }

  /**
   * Show the empty-state message in a section if it has no tiles left.
   * @param {string} sectionId - The accordion section ID
   * @param {string} emptyText - Primary text
   * @param {string} emptyHint - Hint text
   */
  showEmptyStateIfNeeded(sectionId, emptyText, emptyHint) {
    const containerId = getTilesContainerId(sectionId);
    const container = document.getElementById(containerId);
    if (!container) return;

    const tiles = container.querySelectorAll(`.${CSS_CLASSES.COLOR_TILE}`);
    if (tiles.length === 0) {
      container.innerHTML = `
        <div class="${CSS_CLASSES.EMPTY_MESSAGE}">
          <span class="empty-message__text">${emptyText}</span>
          <span class="empty-message__hint">${emptyHint}</span>
        </div>
      `;
    }
  }

  /**
   * Update only the text of an accordion section header (e.g. count changes).
   * @param {string} sectionId - The accordion section ID
   * @param {string} newTitle - The full new title text (e.g. "Favorites (3)")
   */
  updateSectionHeader(sectionId, newTitle) {
    const header = document.getElementById(`${sectionId}-header`);
    if (!header) return;
    const span = header.querySelector("span");
    if (span) span.textContent = newTitle;
  }

  /**
   * Update LRV count display
   * @param {boolean} isActive - Whether the LRV filter is active
   * @param {number} visibleCount - Number of visible colors
   * @param {number} totalActive - Total number of active colors
   */
  updateLrvCount(isActive, visibleCount, totalActive) {
    const countEl = document.getElementById(ELEMENT_IDS.LRV_COUNT);
    if (countEl) {
      if (isActive) {
        countEl.textContent = `Showing ${visibleCount} of ${totalActive} colors`;
      }
      countEl.classList.toggle("lrv-filter__count--visible", isActive);
    }
  }

  /**
   * Setup accordion behavior via event delegation (called once in constructor).
   * Handles click and keyboard navigation on accordion headers.
   */
  #setupAccordionDelegation() {
    // Click delegation
    this.container.addEventListener("click", (e) => {
      const header = e.target.closest(`.${CSS_CLASSES.ACCORDION_HEADER}`);
      if (header) {
        this.toggleAccordionItem(header);
      }
    });

    // Keyboard delegation
    this.container.addEventListener("keydown", (e) => {
      const header = e.target.closest(`.${CSS_CLASSES.ACCORDION_HEADER}`);
      if (!header) return;

      const allHeaders = [
        ...this.container.querySelectorAll(`.${CSS_CLASSES.ACCORDION_HEADER}`),
      ];
      const index = allHeaders.indexOf(header);

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          this.toggleAccordionItem(header);
          break;
        case "ArrowDown":
          e.preventDefault();
          allHeaders[(index + 1) % allHeaders.length].focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          allHeaders[index === 0 ? allHeaders.length - 1 : index - 1].focus();
          break;
        case "Home":
          e.preventDefault();
          allHeaders[0].focus();
          break;
        case "End":
          e.preventDefault();
          allHeaders.at(-1).focus();
          break;
      }
    });
  }

  /**
   * Toggle accordion item open/closed
   */
  toggleAccordionItem(clickedHeader) {
    const isExpanded = clickedHeader.getAttribute("aria-expanded") === "true";
    const content = document.getElementById(
      clickedHeader.getAttribute("aria-controls"),
    );

    // Close all other accordion items
    for (const header of document.querySelectorAll(
      `.${CSS_CLASSES.ACCORDION_HEADER}`,
    )) {
      if (header !== clickedHeader) {
        header.setAttribute("aria-expanded", "false");
        const otherContent = document.getElementById(
          header.getAttribute("aria-controls"),
        );
        otherContent.setAttribute("aria-hidden", "true");
        otherContent.setAttribute("inert", "");
      }
    }

    // Toggle clicked item
    if (isExpanded) {
      clickedHeader.setAttribute("aria-expanded", "false");
      content.setAttribute("aria-hidden", "true");
      content.setAttribute("inert", "");
    } else {
      clickedHeader.setAttribute("aria-expanded", "true");
      content.setAttribute("aria-hidden", "false");
      content.removeAttribute("inert");
    }
  }
}
