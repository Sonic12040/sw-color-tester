/**
 * ColorController - Controller Layer
 * Handles user interactions and coordinates Model & View
 * Responsibilities:
 * - Handle user events
 * - Orchestrate rendering
 * - Coordinate Model and View
 * - Application initialization
 */

import { CSS_CLASSES, ELEMENT_IDS, DATA_ATTRIBUTES } from "../utils/config.js";

export class ColorController {
  constructor(model, state, view) {
    this.model = model;
    this.state = state;
    this.view = view;
  }

  /**
   * Initialize the application
   */
  init() {
    this.setupEventListeners();
    this.setupHeaderButtons();
    this.render();
  }

  /**
   * Main render orchestration
   */
  render() {
    const favorites = this.state.getFavorites();
    const hidden = this.state.getHidden();

    // Get color data from model
    const favoriteColors = this.model.getFavoriteColors(favorites);
    const hiddenColors = this.model.getHiddenColors(hidden);
    const visibleColors = this.model.getVisibleColors(hidden);

    // Group and sort
    const colorFamilies = this.model.groupByFamily(visibleColors);
    const sortedFamilies = this.model.sortFamiliesByPriority(
      Object.keys(colorFamilies)
    );

    const colorCategories = this.model.groupByCategory(visibleColors);
    const sortedCategories = Object.keys(colorCategories).sort((a, b) =>
      a.localeCompare(b)
    );

    // Get hidden groups
    const hiddenFamilies = this.model.getHiddenFamilies(hidden);
    const hiddenCategories = this.model.getHiddenCategories(hidden);

    // Render via view
    this.view.render({
      favoriteColors,
      hiddenColors,
      visibleColors,
      colorFamilies,
      sortedFamilies,
      colorCategories,
      sortedCategories,
      hiddenFamilies,
      hiddenCategories,
    });
  }

  /**
   * Event handler registry - maps selectors to handlers
   * Strategy pattern to eliminate nested conditionals
   * @private
   */
  _getEventHandlerRegistry() {
    return [
      {
        selector: `.${CSS_CLASSES.COLOR_TILE_FAVORITE_BUTTON}`,
        getAttribute: DATA_ATTRIBUTES.ID,
        handler: (colorId) => this.handleFavoriteButton(colorId),
      },
      {
        selector: `.${CSS_CLASSES.COLOR_TILE_HIDE_BUTTON}`,
        getAttribute: DATA_ATTRIBUTES.ID,
        handler: (colorId) => this.handleHideButton(colorId),
      },
      {
        selector: `.${CSS_CLASSES.BULK_ACTIONS_FAVORITE_BUTTON}`,
        handler: (element) => {
          const groupId = element.getAttribute(DATA_ATTRIBUTES.FAMILY);
          const groupName = element.getAttribute(DATA_ATTRIBUTES.NAME);
          this.handleBulkFavoriteButton(groupId, groupName);
        },
      },
      {
        selector: `.${CSS_CLASSES.BULK_ACTIONS_HIDE_BUTTON}`,
        handler: (element) => {
          const groupId = element.getAttribute(DATA_ATTRIBUTES.FAMILY);
          const groupName = element.getAttribute(DATA_ATTRIBUTES.NAME);
          this.handleBulkHideButton(groupId, groupName);
        },
      },
      {
        selector: `.${CSS_CLASSES.COLOR_TILE_UNHIDE_BUTTON}`,
        handler: (element) => {
          const familyName = element.getAttribute(DATA_ATTRIBUTES.FAMILY);
          const categoryName = element.getAttribute(DATA_ATTRIBUTES.CATEGORY);
          this.handleUnhideButton(familyName, categoryName);
        },
      },
      {
        selector: `.${CSS_CLASSES.COLOR_TILE_FAMILY}`,
        getAttribute: DATA_ATTRIBUTES.FAMILY,
        excludeIfContains: `.${CSS_CLASSES.COLOR_TILE_UNHIDE_BUTTON}`,
        handler: (familyName) => this.handleFamilyTileClick(familyName),
      },
      {
        selector: `.${CSS_CLASSES.COLOR_TILE_CATEGORY}`,
        getAttribute: DATA_ATTRIBUTES.CATEGORY,
        excludeIfContains: `.${CSS_CLASSES.COLOR_TILE_UNHIDE_BUTTON}`,
        handler: (categoryName) => this.handleCategoryTileClick(categoryName),
      },
    ];
  }

  /**
   * Setup delegated event listeners on accordion
   * Uses strategy pattern with handler registry for extensibility
   */
  setupEventListeners() {
    const accordion = document.getElementById(ELEMENT_IDS.COLOR_ACCORDION);

    if (!accordion) {
      console.error("Accordion container not found");
      return;
    }

    const handlers = this._getEventHandlerRegistry();

    // Single delegated click handler using handler registry
    accordion.addEventListener("click", (e) => {
      for (const config of handlers) {
        const element = e.target.closest(config.selector);

        // Skip if element not found or contains excluded element
        if (!element) continue;
        if (
          config.excludeIfContains &&
          e.target.closest(config.excludeIfContains)
        ) {
          continue;
        }

        // Prevent default behavior and stop propagation
        e.preventDefault();
        e.stopPropagation();

        // Get attribute value if specified, otherwise pass element
        const value = config.getAttribute
          ? element.getAttribute(config.getAttribute)
          : element;

        config.handler(value);
        return; // Handler found and executed, stop searching
      }
    });
  }

  /**
   * Setup header button event listeners
   */
  setupHeaderButtons() {
    const clearFavBtn = document.getElementById(
      ELEMENT_IDS.CLEAR_FAVORITES_BTN
    );
    if (clearFavBtn) {
      clearFavBtn.addEventListener("click", () => {
        this.handleClearFavorites();
      });
    }

    const clearHiddenBtn = document.getElementById(
      ELEMENT_IDS.CLEAR_HIDDEN_BTN
    );
    if (clearHiddenBtn) {
      clearHiddenBtn.addEventListener("click", () => {
        this.handleClearHidden();
      });
    }
  }

  // --- EVENT HANDLERS ---

  /**
   * Private helper to unhide a group of colors (family or category)
   * @private
   * @param {string} groupType - Either 'family' or 'category'
   * @param {string} groupName - Name of the group to unhide
   */
  _unhideGroup(groupType, groupName) {
    const getColors =
      groupType === "family"
        ? this.model.getFamilyColors.bind(this.model)
        : this.model.getCategoryColors.bind(this.model);

    const colors = getColors(groupName);
    const colorIds = colors.map((color) => color.id);
    this.state.removeMultipleHidden(colorIds);
    this.render();
  }

  /**
   * Handle individual color favorite button click
   */
  handleFavoriteButton(colorId) {
    this.state.toggleFavorite(colorId);
    this.render();
  }

  /**
   * Handle individual color hide button click
   */
  handleHideButton(colorId) {
    this.state.toggleHidden(colorId);
    this.render();
  }

  /**
   * Handle bulk favorite button click (family/category)
   */
  handleBulkFavoriteButton(groupId, groupName) {
    const groupColors = this.model.getColorsForId(groupId, () => groupName);
    const favorites = this.state.getFavorites();

    // Check if all colors are already favorited
    const allFavorited = groupColors.every((color) =>
      favorites.includes(color.id)
    );
    const colorIds = groupColors.map((color) => color.id);

    if (allFavorited) {
      this.state.removeMultipleFavorites(colorIds);
    } else {
      this.state.addMultipleFavorites(colorIds);
    }
    this.render();
  }

  /**
   * Handle bulk hide button click (family/category)
   */
  handleBulkHideButton(groupId, groupName) {
    const groupColors = this.model.getColorsForId(groupId, () => groupName);
    const hidden = this.state.getHidden();

    // Check if all colors are already hidden
    const allHidden = groupColors.every((color) => hidden.includes(color.id));
    const colorIds = groupColors.map((color) => color.id);

    if (allHidden) {
      this.state.removeMultipleHidden(colorIds);
    } else {
      this.state.addMultipleHidden(colorIds);
    }
    this.render();
  }

  /**
   * Handle unhide button click (both family and category tiles)
   */
  handleUnhideButton(familyName, categoryName) {
    if (familyName) {
      this._unhideGroup("family", familyName);
    } else if (categoryName) {
      this._unhideGroup("category", categoryName);
    }
  }

  /**
   * Handle family tile click (unhide entire family)
   */
  handleFamilyTileClick(familyName) {
    this._unhideGroup("family", familyName);
  }

  /**
   * Handle category tile click (unhide entire category)
   */
  handleCategoryTileClick(categoryName) {
    this._unhideGroup("category", categoryName);
  }

  /**
   * Handle clear all favorites button click
   */
  handleClearFavorites() {
    this.state.clearFavorites();
    this.render();
  }

  /**
   * Handle clear all hidden button click
   */
  handleClearHidden() {
    this.state.clearHidden();
    this.render();
  }
}
