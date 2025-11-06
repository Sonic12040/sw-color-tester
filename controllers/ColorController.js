/**
 * ColorController - Controller Layer
 * Handles user interactions and coordinates Model & View
 * Responsibilities:
 * - Handle user events
 * - Orchestrate rendering
 * - Coordinate Model and View
 * - Application initialization
 */

import {
  CSS_CLASSES,
  ELEMENT_IDS,
  DATA_ATTRIBUTES,
  convertIdToName,
} from "../utils/config.js";

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
   * Setup delegated event listeners on accordion
   */
  setupEventListeners() {
    const accordion = document.getElementById(ELEMENT_IDS.COLOR_ACCORDION);

    if (!accordion) {
      console.error("Accordion container not found");
      return;
    }

    // Single delegated click handler for all interactive elements
    accordion.addEventListener("click", (e) => {
      // Individual color favorite button
      const favoriteBtn = e.target.closest(
        `.${CSS_CLASSES.COLOR_TILE_FAVORITE_BUTTON}`
      );
      if (favoriteBtn) {
        e.stopPropagation();
        const colorId = favoriteBtn.getAttribute(DATA_ATTRIBUTES.ID);
        this.handleFavoriteButton(colorId);
        return;
      }

      // Individual color hide button
      const hideBtn = e.target.closest(
        `.${CSS_CLASSES.COLOR_TILE_HIDE_BUTTON}`
      );
      if (hideBtn) {
        e.stopPropagation();
        const colorId = hideBtn.getAttribute(DATA_ATTRIBUTES.ID);
        this.handleHideButton(colorId);
        return;
      }

      // Bulk favorite button for family/category
      const bulkFavoriteBtn = e.target.closest(
        `.${CSS_CLASSES.BULK_ACTIONS_FAVORITE_BUTTON}`
      );
      if (bulkFavoriteBtn) {
        e.stopPropagation();
        const groupId = bulkFavoriteBtn.getAttribute(DATA_ATTRIBUTES.FAMILY);
        this.handleBulkFavoriteButton(groupId);
        return;
      }

      // Bulk hide button for family/category
      const bulkHideBtn = e.target.closest(
        `.${CSS_CLASSES.BULK_ACTIONS_HIDE_BUTTON}`
      );
      if (bulkHideBtn) {
        e.stopPropagation();
        const groupId = bulkHideBtn.getAttribute(DATA_ATTRIBUTES.FAMILY);
        this.handleBulkHideButton(groupId);
        return;
      }

      // Unhide button (for both family and category tiles)
      const unhideBtn = e.target.closest(
        `.${CSS_CLASSES.COLOR_TILE_UNHIDE_BUTTON}`
      );
      if (unhideBtn) {
        e.stopPropagation();
        const familyName = unhideBtn.getAttribute(DATA_ATTRIBUTES.FAMILY);
        const categoryName = unhideBtn.getAttribute(DATA_ATTRIBUTES.CATEGORY);
        this.handleUnhideButton(familyName, categoryName);
        return;
      }

      // Family tile click (unhide entire family)
      const familyTile = e.target.closest(`.${CSS_CLASSES.COLOR_TILE_FAMILY}`);
      if (
        familyTile &&
        !e.target.closest(`.${CSS_CLASSES.COLOR_TILE_UNHIDE_BUTTON}`)
      ) {
        const familyName = familyTile.getAttribute(DATA_ATTRIBUTES.FAMILY);
        this.handleFamilyTileClick(familyName);
        return;
      }

      // Category tile click (unhide entire category)
      const categoryTile = e.target.closest(
        `.${CSS_CLASSES.COLOR_TILE_CATEGORY}`
      );
      if (
        categoryTile &&
        !e.target.closest(`.${CSS_CLASSES.COLOR_TILE_UNHIDE_BUTTON}`)
      ) {
        const categoryName = categoryTile.getAttribute(
          DATA_ATTRIBUTES.CATEGORY
        );
        this.handleCategoryTileClick(categoryName);
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
  handleBulkFavoriteButton(groupId) {
    const groupColors = this.model.getColorsForId(groupId, convertIdToName);
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
  handleBulkHideButton(groupId) {
    const groupColors = this.model.getColorsForId(groupId, convertIdToName);
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
