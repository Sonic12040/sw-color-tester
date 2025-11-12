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
  categoryTileTemplate,
} from "../utils/templates.js";
import {
  PREFIX,
  CSS_CLASSES,
  ELEMENT_IDS,
  createGroupId,
  getTilesContainerId,
} from "../utils/config.js";

export class ColorView {
  constructor(containerId) {
    console.log("=== COLORVIEW.JS CONSTRUCTOR ===");
    this.container = document.getElementById(containerId);
    this.categoryIdToName = {};
    this.categoryNameToId = {};
    this.favoriteIds = [];
    this.hiddenIds = [];
    console.log("✅ ColorView constructed");
  }

  /**
   * Main render method - orchestrates complete UI update
   * @param {Object} renderData - All data needed for rendering
   */
  render(renderData) {
    console.log("--- ColorView.render() ---");
    // Performance instrumentation (best-effort; safe in older browsers)
    try {
      performance.mark("view:render:start");
    } catch {}
    const {
      favoriteColors,
      hiddenColors,
      colorFamilies,
      sortedFamilies,
      colorCategories,
      sortedCategories,
      hiddenFamilies,
      hiddenCategories,
    } = renderData;

    // Store IDs for template rendering
    this.favoriteIds = favoriteColors.map((c) => c.id);
    this.hiddenIds = hiddenColors.map((c) => c.id);

    // Save accordion state before rebuilding
    const expandedSections = this._saveAccordionState();

    // Build and insert accordion HTML
    try {
      performance.mark("view:build-accordion:start");
    } catch {}
    const accordionHTML = this.buildAccordionHTML(
      favoriteColors.length,
      hiddenColors.length,
      sortedFamilies,
      colorFamilies,
      sortedCategories,
      colorCategories
    );
    this.container.innerHTML = accordionHTML;
    try {
      performance.measure("view:build-accordion", "view:build-accordion:start");
    } catch {}

    // Populate all sections
    try {
      performance.mark("view:favorites:start");
    } catch {}
    this.renderFavoritesSection(favoriteColors);
    try {
      performance.measure("view:favorites", "view:favorites:start");
    } catch {}

    try {
      performance.mark("view:hidden:start");
    } catch {}
    this.renderHiddenSection(hiddenColors, hiddenFamilies, hiddenCategories);
    try {
      performance.measure("view:hidden", "view:hidden:start");
    } catch {}

    try {
      performance.mark("view:sections:start");
    } catch {}
    this.renderColorSections(
      sortedFamilies,
      colorFamilies,
      sortedCategories,
      colorCategories
    );
    try {
      performance.measure("view:sections", "view:sections:start");
    } catch {}

    // Setup accordion interaction
    try {
      performance.mark("view:setup:start");
    } catch {}
    this.setupAccordionBehavior();
    try {
      performance.measure("view:setup", "view:setup:start");
    } catch {}

    // Restore accordion state after rebuilding
    this._restoreAccordionState(expandedSections);

    // Finalize perf summary
    try {
      performance.measure("view:render", "view:render:start");
      const getD = (name) => {
        const e = performance.getEntriesByName(name);
        let last;
        if (typeof e.at === "function") {
          last = e.at(-1);
        } else {
          last = e.length ? e[e.length - 1] : undefined;
        }
        return last ? Number(last.duration).toFixed(1) : "0.0";
      };
      console.log("[perf] view render (ms)", {
        total: getD("view:render"),
        build: getD("view:build-accordion"),
        favorites: getD("view:favorites"),
        hidden: getD("view:hidden"),
        sections: getD("view:sections"),
        setup: getD("view:setup"),
      });
      performance.clearMarks("view:render:start");
      performance.clearMarks("view:build-accordion:start");
      performance.clearMarks("view:favorites:start");
      performance.clearMarks("view:hidden:start");
      performance.clearMarks("view:sections:start");
      performance.clearMarks("view:setup:start");
      performance.clearMeasures("view:render");
      performance.clearMeasures("view:build-accordion");
      performance.clearMeasures("view:favorites");
      performance.clearMeasures("view:hidden");
      performance.clearMeasures("view:sections");
      performance.clearMeasures("view:setup");
    } catch {}
    console.log("✅ ColorView render complete");
  }

  /**
   * Save which accordion sections are currently expanded and their scroll positions
   * @private
   * @returns {Map<string, {expanded: boolean, scrollTop: number}>} Map of section states
   */
  _saveAccordionState() {
    const sectionStates = new Map();
    const headers = this.container.querySelectorAll(
      `.${CSS_CLASSES.ACCORDION_HEADER}`
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
   * @private
   * @param {Map<string, {expanded: boolean, scrollTop: number}>} sectionStates - Map of section states
   */
  _restoreAccordionState(sectionStates) {
    if (!sectionStates || sectionStates.size === 0) return;

    // Use requestAnimationFrame to ensure DOM has settled before restoring state
    requestAnimationFrame(() => {
      const headers = this.container.querySelectorAll(
        `.${CSS_CLASSES.ACCORDION_HEADER}`
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
    sortedCategories,
    colorCategories
  ) {
    let accordionHTML = "";

    // 1. Favorites section (open by default)
    const favoritesTitle =
      favoriteCount > 0 ? `Favorites (${favoriteCount})` : "Favorites";
    accordionHTML += createAccordionItem("favorites", favoritesTitle, "", true);

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
        true // Show bulk actions for color families
      );
    }

    // 4. Color category sections
    for (const category of sortedCategories) {
      const count = colorCategories[category].length;
      const categoryId = createGroupId(category, PREFIX.CATEGORY);

      // Store mapping for later use
      this.categoryIdToName[categoryId] = category;
      this.categoryNameToId[category] = categoryId;

      accordionHTML += createAccordionItem(
        categoryId,
        `${category} Collection (${count})`,
        category, // Original name for bulk actions
        false,
        true // Show bulk actions for color categories
      );
    }

    return accordionHTML;
  }

  /**
   * Render the favorites section with color tiles
   */
  renderFavoritesSection(favoriteColors) {
    const favoritesContainer = document.getElementById(
      ELEMENT_IDS.FAVORITES_TILES
    );

    if (favoriteColors.length > 0) {
      const html = favoriteColors
        .map((color) =>
          colorTemplate(color, {
            showHideButton: false,
            favoriteIds: this.favoriteIds,
            hiddenIds: this.hiddenIds,
          })
        )
        .join("");
      favoritesContainer.innerHTML = html;
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
  renderHiddenSection(hiddenColors, hiddenFamilies, hiddenCategories) {
    const hiddenContainer = document.getElementById(ELEMENT_IDS.HIDDEN_TILES);
    hiddenContainer.innerHTML = ""; // Clear existing hidden tiles
    let html = "";

    // Add hidden family tiles first
    for (const family of hiddenFamilies) {
      html += familyTileTemplate(family.name, family.count);
    }

    // Add hidden category tiles
    for (const category of hiddenCategories) {
      html += categoryTileTemplate(category.name, category.count);
    }

    // Add individual hidden colors (excluding those in completely hidden families or categories)
    const hiddenFamilyNames = new Set(hiddenFamilies.map((f) => f.name));
    const hiddenCategoryNames = new Set(hiddenCategories.map((c) => c.name));
    const individualHiddenColors = hiddenColors.filter((color) => {
      // Check if color belongs to a completely hidden family
      let inHiddenFamily = false;
      if (color.colorFamilyNames && color.colorFamilyNames.length > 0) {
        const primaryFamily = color.colorFamilyNames[0];
        inHiddenFamily = hiddenFamilyNames.has(primaryFamily);
      }

      // Check if color belongs to any completely hidden category
      let inHiddenCategory = false;
      if (
        color.brandedCollectionNames &&
        color.brandedCollectionNames.length > 0
      ) {
        inHiddenCategory = color.brandedCollectionNames.some((category) =>
          hiddenCategoryNames.has(category)
        );
      }

      // Include color only if it's not in a completely hidden family or category
      return !inHiddenFamily && !inHiddenCategory;
    });

    if (individualHiddenColors.length > 0) {
      html += individualHiddenColors
        .map((color) =>
          colorTemplate(color, {
            showFavoriteButton: false,
            favoriteIds: this.favoriteIds,
            hiddenIds: this.hiddenIds,
          })
        )
        .join("");
    }

    if (
      hiddenFamilies.length === 0 &&
      hiddenCategories.length === 0 &&
      individualHiddenColors.length === 0
    ) {
      hiddenContainer.innerHTML = `
        <div class="${CSS_CLASSES.EMPTY_MESSAGE}">
          <span class="empty-message__text">No hidden colors.</span>
          <span class="empty-message__hint">Click the eye icon on any color to hide it.</span>
        </div>
      `;
    } else {
      hiddenContainer.innerHTML = html;
    }
  }

  /**
   * Render all family and category sections with their color tiles
   */
  renderColorSections(
    sortedFamilies,
    colorFamilies,
    sortedCategories,
    colorCategories
  ) {
    // Populate color family sections
    for (const family of sortedFamilies) {
      const familyId = createGroupId(family, PREFIX.FAMILY);
      const familyContainer = document.getElementById(
        getTilesContainerId(familyId)
      );
      const familyColors = colorFamilies[family];

      familyContainer.innerHTML = familyColors
        .map((color) =>
          colorTemplate(color, {
            favoriteIds: this.favoriteIds,
            hiddenIds: this.hiddenIds,
          })
        )
        .join("");
    }

    // Populate color category sections
    for (const category of sortedCategories) {
      const categoryId = createGroupId(category, PREFIX.CATEGORY);
      const categoryContainer = document.getElementById(
        getTilesContainerId(categoryId)
      );
      const categoryColors = colorCategories[category];

      categoryContainer.innerHTML = categoryColors
        .map((color) =>
          colorTemplate(color, {
            favoriteIds: this.favoriteIds,
            hiddenIds: this.hiddenIds,
          })
        )
        .join("");
    }
  }

  /**
   * Setup accordion behavior with keyboard navigation
   */
  setupAccordionBehavior() {
    const headers = document.querySelectorAll(
      `.${CSS_CLASSES.ACCORDION_HEADER}`
    );
    const headersArray = [...headers];

    for (const [index, header] of headersArray.entries()) {
      header.addEventListener("click", () => {
        this.toggleAccordionItem(header);
      });

      // Keyboard support
      header.addEventListener("keydown", (e) => {
        switch (e.key) {
          case "Enter":
          case " ":
            e.preventDefault();
            this.toggleAccordionItem(header);
            break;
          case "ArrowDown":
            e.preventDefault();
            this.focusNextHeader(headersArray, index);
            break;
          case "ArrowUp":
            e.preventDefault();
            this.focusPreviousHeader(headersArray, index);
            break;
          case "Home":
            e.preventDefault();
            headersArray[0].focus();
            break;
          case "End":
            e.preventDefault();
            headersArray.at(-1).focus();
            break;
        }
      });
    }
  }

  /**
   * Toggle accordion item open/closed
   */
  toggleAccordionItem(clickedHeader) {
    const isExpanded = clickedHeader.getAttribute("aria-expanded") === "true";
    const content = document.getElementById(
      clickedHeader.getAttribute("aria-controls")
    );

    // Close all other accordion items
    for (const header of document.querySelectorAll(
      `.${CSS_CLASSES.ACCORDION_HEADER}`
    )) {
      if (header !== clickedHeader) {
        header.setAttribute("aria-expanded", "false");
        const otherContent = document.getElementById(
          header.getAttribute("aria-controls")
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

  /**
   * Focus next accordion header (keyboard navigation)
   */
  focusNextHeader(headers, currentIndex) {
    const nextIndex = (currentIndex + 1) % headers.length;
    headers[nextIndex].focus();
  }

  /**
   * Focus previous accordion header (keyboard navigation)
   */
  focusPreviousHeader(headers, currentIndex) {
    const prevIndex =
      currentIndex === 0 ? headers.length - 1 : currentIndex - 1;
    headers[prevIndex].focus();
  }

  /**
   * Get DOM element by ID
   */
  getElement(id) {
    return document.getElementById(id);
  }

  /**
   * Clear the view
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
