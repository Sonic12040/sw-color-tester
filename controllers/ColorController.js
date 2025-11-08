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

import {
  CSS_CLASSES,
  ELEMENT_IDS,
  DATA_ATTRIBUTES,
  ICONS,
} from "../utils/config.js";
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

    // Check if color is favorited or hidden
    const favorites = this.state.getFavorites();
    const isFavorited = favorites.includes(colorId);
    const hidden = this.state.getHidden();
    const isHidden = hidden.includes(colorId);

    // Create and insert modal
    const modalHTML = colorDetailModal(
      color,
      coordinatingColors,
      similarColors,
      isFavorited,
      isHidden
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

        // Set up accordion functionality
        const accordionTrigger = modal.querySelector(
          ".modal__accordion-trigger"
        );
        const accordionPanel = modal.querySelector(".modal__accordion-panel");

        if (accordionTrigger && accordionPanel) {
          accordionTrigger.addEventListener("click", () => {
            const isExpanded =
              accordionTrigger.getAttribute("aria-expanded") === "true";

            // Toggle expanded state
            accordionTrigger.setAttribute("aria-expanded", !isExpanded);
            accordionPanel.setAttribute("aria-hidden", isExpanded);

            // Toggle inert attribute for accessibility
            if (isExpanded) {
              accordionPanel.setAttribute("inert", "");
            } else {
              accordionPanel.removeAttribute("inert");
            }
          });
        }

        // Set up action button handlers
        const favoriteButton = modal.querySelector(
          ".modal__action-button--favorite"
        );
        const shareButton = modal.querySelector(".modal__action-button--share");
        const hideButton = modal.querySelector(".modal__action-button--hide");
        const storeButton = modal.querySelector(".modal__action-button--store");

        if (favoriteButton) {
          favoriteButton.addEventListener("click", () => {
            this.handleFavoriteButton(colorId);
            // Update button UI
            const currentlyFavorited = this.state
              .getFavorites()
              .includes(colorId);
            const heartSvg = favoriteButton.querySelector("svg");
            const buttonText = favoriteButton.querySelector("span");
            if (heartSvg && buttonText) {
              heartSvg.setAttribute(
                "fill",
                currentlyFavorited ? "currentColor" : "none"
              );
              buttonText.textContent = currentlyFavorited
                ? "Favorited"
                : "Add to Favorites";
              favoriteButton.setAttribute(
                "aria-label",
                `${currentlyFavorited ? "Remove from" : "Add to"} favorites`
              );
            }
          });
        }

        if (shareButton) {
          shareButton.addEventListener("click", async () => {
            await this.handleShare(color);
          });
        }

        if (hideButton) {
          hideButton.addEventListener("click", () => {
            this.handleHideButton(colorId);
            // Update button UI
            const currentlyHidden = this.state.getHidden().includes(colorId);
            const eyeSvg = hideButton.querySelector("svg");
            const buttonText = hideButton.querySelector("span");
            if (eyeSvg && buttonText) {
              // Update SVG icon
              eyeSvg.innerHTML = currentlyHidden ? ICONS.EYE : ICONS.EYE_OFF;
              buttonText.textContent = currentlyHidden
                ? "Hidden"
                : "Hide Color";
              hideButton.setAttribute(
                "aria-label",
                `${currentlyHidden ? "Show" : "Hide"} color`
              );
            }
          });
        }

        if (storeButton) {
          storeButton.addEventListener("click", () => {
            alert(
              `Visit your local Sherwin-Williams store and ask for:\n\n${color.name}\nLocation: ${color.storeStripLocator}`
            );
          });
        }
      }
    });

    // Prevent body scrolling
    document.body.style.overflow = "hidden";
  }

  /**
   * Share color via Web Share API or copy link
   */
  async handleShare(color) {
    const shareData = {
      title: `${color.name} - Sherwin-Williams`,
      text: `Check out this color: ${color.name} (${color.colorNumber})`,
      url:
        window.location.origin +
        window.location.pathname +
        `?color=${color.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        // Provide visual feedback
        const shareButton = document.querySelector(
          ".modal__action-button--share span"
        );
        if (shareButton) {
          const originalText = shareButton.textContent;
          shareButton.textContent = "Link Copied!";
          setTimeout(() => {
            shareButton.textContent = originalText;
          }, 2000);
        }
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
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
