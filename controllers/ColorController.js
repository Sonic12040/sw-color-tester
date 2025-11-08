/**
 * ColorController - Controller Layer
 * Handles user interactions and coordinates Model & View
 * Implements Dependency Inversion Principle via Command Pattern
 * Responsibilities:
 * - Handle user events
 * - Delegate to Commands (business logic)
 * - Orchestrate rendering
 * - Application initialization
 */

import { CSS_CLASSES, ELEMENT_IDS, DATA_ATTRIBUTES } from "../utils/config.js";
import { colorDetailModal } from "../utils/templates.js";
import {
  ToggleFavoriteCommand,
  ToggleHiddenCommand,
  BulkFavoriteCommand,
  BulkHideCommand,
  UnhideGroupCommand,
  ClearFavoritesCommand,
  ClearHiddenCommand,
} from "../commands/index.js";

export class ColorController {
  constructor(model, state, view) {
    console.log("=== COLORCONTROLLER.JS CONSTRUCTOR ===");
    this.model = model;
    this.state = state;
    this.view = view;
    console.log("✅ ColorController constructed");
  }

  /**
   * Execute a command and re-render if state changed
   * @private
   * @param {ColorCommand} command - Command to execute
   */
  _executeCommand(command) {
    const stateChanged = command.execute();
    if (stateChanged) {
      this.render();
    }
  }

  /**
   * Initialize the application
   */
  init() {
    console.log("--- ColorController.init() ---");
    this.setupEventListeners();
    this.setupHeaderButtons();
    this.setupModalListeners();
    this.render();
    console.log("✅ ColorController initialized");
  }

  /**
   * Setup modal event listeners (close button, overlay click, escape key)
   */
  setupModalListeners() {
    console.log("--- Setting up modal listeners ---");
    // Close modal when clicking overlay
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains(CSS_CLASSES.MODAL_OVERLAY)) {
        this.closeModal();
      }
    });

    // Close modal when clicking close button
    document.addEventListener("click", (e) => {
      if (e.target.closest(`.${CSS_CLASSES.MODAL_CLOSE}`)) {
        this.closeModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeModal();
      }
    });
    console.log("✅ Modal listeners set up");
  }

  /**
   * Open modal with color details
   * @param {string} colorId - The ID of the color to display
   */
  openModal(colorId) {
    const allColors = this.model.getActiveColors();
    const color = allColors.find((c) => c.id === colorId);

    if (!color) {
      console.error("Color not found:", colorId);
      return;
    }

    // Get coordinating colors
    const coordinatingColors = {};
    if (color.coordinatingColors) {
      if (color.coordinatingColors.coord1ColorId) {
        coordinatingColors.coord1 = allColors.find(
          (c) => c.id === color.coordinatingColors.coord1ColorId
        );
      }
      if (color.coordinatingColors.coord2ColorId) {
        coordinatingColors.coord2 = allColors.find(
          (c) => c.id === color.coordinatingColors.coord2ColorId
        );
      }
      if (color.coordinatingColors.whiteColorId) {
        coordinatingColors.white = allColors.find(
          (c) => c.id === color.coordinatingColors.whiteColorId
        );
      }
    }

    // Get similar colors
    const similarColors = [];
    if (color.similarColors && Array.isArray(color.similarColors)) {
      for (const similarId of color.similarColors) {
        const similarColor = allColors.find((c) => c.id === similarId);
        if (similarColor) {
          similarColors.push(similarColor);
        }
      }
    }

    // Remove existing modal if present
    const existingModal = document.getElementById("color-detail-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Create and insert modal
    const modalHTML = colorDetailModal(
      color,
      coordinatingColors,
      similarColors
    );
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Trigger animation
    requestAnimationFrame(() => {
      const modal = document.getElementById("color-detail-modal");
      if (modal) {
        modal.classList.add("active");

        // Focus the close button for accessibility
        const closeButton = modal.querySelector(`.${CSS_CLASSES.MODAL_CLOSE}`);
        if (closeButton) {
          closeButton.focus();
        }
      }
    });

    // Prevent body scrolling
    document.body.style.overflow = "hidden";
  }

  /**
   * Close the modal
   */
  closeModal() {
    const modal = document.getElementById("color-detail-modal");
    if (modal) {
      modal.classList.remove("active");

      // Remove modal after animation
      setTimeout(() => {
        modal.remove();
        // Restore body scrolling
        document.body.style.overflow = "";
      }, 300);
    }
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
    const visibleColors = this.model.getVisibleColors(hidden, favorites);

    // Group and sort
    const colorFamilies = this.model.groupByFamily(visibleColors);
    const sortedFamilies = this.model.sortFamiliesByPriority(
      Object.keys(colorFamilies)
    );

    const colorCategories = this.model.groupByCategory(visibleColors);
    const sortedCategories = Object.keys(colorCategories).sort((a, b) =>
      a.localeCompare(b)
    );

    // Get hidden groups (excluding favorited colors)
    const hiddenFamilies = this.model.getHiddenFamilies(hidden, favorites);
    const hiddenCategories = this.model.getHiddenCategories(hidden, favorites);

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
        selector: `.${CSS_CLASSES.COLOR_TILE_VIEW_BUTTON}`,
        getAttribute: DATA_ATTRIBUTES.ID,
        handler: (colorId) => this.openModal(colorId),
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
    console.log("--- Setting up event listeners ---");
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
    console.log("✅ Delegated event listener set up for accordion");
  }

  /**
   * Setup header button event listeners
   */
  setupHeaderButtons() {
    console.log("--- Setting up header buttons ---");
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
    console.log("✅ Header buttons set up");
  }

  // --- EVENT HANDLERS (Delegate to Commands) ---

  /**
   * Handle individual color favorite button click
   */
  handleFavoriteButton(colorId) {
    const command = new ToggleFavoriteCommand(this.model, this.state, colorId);
    this._executeCommand(command);
  }

  /**
   * Handle individual color hide button click
   */
  handleHideButton(colorId) {
    const command = new ToggleHiddenCommand(this.model, this.state, colorId);
    this._executeCommand(command);
  }

  /**
   * Handle bulk favorite button click (family/category)
   */
  handleBulkFavoriteButton(groupId, groupName) {
    const command = new BulkFavoriteCommand(
      this.model,
      this.state,
      groupId,
      groupName
    );
    this._executeCommand(command);
  }

  /**
   * Handle bulk hide button click (family/category)
   */
  handleBulkHideButton(groupId, groupName) {
    const command = new BulkHideCommand(
      this.model,
      this.state,
      groupId,
      groupName
    );
    this._executeCommand(command);
  }

  /**
   * Handle unhide button click (both family and category tiles)
   */
  handleUnhideButton(familyName, categoryName) {
    if (familyName) {
      const command = new UnhideGroupCommand(
        this.model,
        this.state,
        "family",
        familyName
      );
      this._executeCommand(command);
    } else if (categoryName) {
      const command = new UnhideGroupCommand(
        this.model,
        this.state,
        "category",
        categoryName
      );
      this._executeCommand(command);
    }
  }

  /**
   * Handle family tile click (unhide entire family)
   */
  handleFamilyTileClick(familyName) {
    const command = new UnhideGroupCommand(
      this.model,
      this.state,
      "family",
      familyName
    );
    this._executeCommand(command);
  }

  /**
   * Handle category tile click (unhide entire category)
   */
  handleCategoryTileClick(categoryName) {
    const command = new UnhideGroupCommand(
      this.model,
      this.state,
      "category",
      categoryName
    );
    this._executeCommand(command);
  }

  /**
   * Handle clear all favorites button click
   */
  handleClearFavorites() {
    const command = new ClearFavoritesCommand(this.model, this.state);
    this._executeCommand(command);
  }

  /**
   * Handle clear all hidden button click
   */
  handleClearHidden() {
    const command = new ClearHiddenCommand(this.model, this.state);
    this._executeCommand(command);
  }
}
