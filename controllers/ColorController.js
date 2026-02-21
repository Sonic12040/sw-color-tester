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
  URL_PARAMS,
  getTilesContainerId,
} from "../utils/config.js";
import { APP_VERSION } from "../version.js";
import {
  colorDetailModal,
  confirmationModal,
  toastNotification,
} from "../utils/templates.js";
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
    this.model = model;
    this.state = state;
    this.view = view;
  }

  /**
   * Execute a command with state diffing — applies surgical DOM updates
   * when the change is small, or falls back to full render for bulk changes.
   * @private
   * @param {ColorCommand} command - Command to execute
   */
  _executeCommand(command) {
    // Snapshot state before command
    const prevFavorites = new Set(this.state.getFavoriteSet());
    const prevHidden = new Set(this.state.getHiddenSet());

    const stateChanged = command.execute();
    if (!stateChanged) return;

    // Compute diffs
    const newFavorites = this.state.getFavoriteSet();
    const newHidden = this.state.getHiddenSet();

    const addedFavs = [];
    const removedFavs = [];
    const addedHidden = [];
    const removedHidden = [];

    for (const id of newFavorites) {
      if (!prevFavorites.has(id)) addedFavs.push(id);
    }
    for (const id of prevFavorites) {
      if (!newFavorites.has(id)) removedFavs.push(id);
    }
    for (const id of newHidden) {
      if (!prevHidden.has(id)) addedHidden.push(id);
    }
    for (const id of prevHidden) {
      if (!newHidden.has(id)) removedHidden.push(id);
    }

    const totalChanges =
      addedFavs.length +
      removedFavs.length +
      addedHidden.length +
      removedHidden.length;

    // Fall back to full render for bulk changes (threshold: > 10 individual changes)
    if (totalChanges === 0 || totalChanges > 10) {
      this.render();
      return;
    }

    // Update the view's cached Sets so surgical methods use current state
    this.view.favoriteIds = newFavorites;
    this.view.hiddenIds = newHidden;

    // Apply surgical updates
    this._applyFavoriteDiff(addedFavs, removedFavs);
    this._applyHiddenDiff(addedHidden, removedHidden);

    // Update LRV count display
    this._updateLrvCount();
  }

  /**
   * Apply surgical DOM updates for favorite state changes.
   * - Toggle heart icon fill on all tile instances
   * - Add/remove tiles from the favorites section
   * @private
   * @param {string[]} added - Newly favorited color IDs
   * @param {string[]} removed - Unfavorited color IDs
   */
  _applyFavoriteDiff(added, removed) {
    const favoriteSet = this.state.getFavoriteSet();

    // Process added favorites
    for (const colorId of added) {
      // Update heart icon on all tile instances
      this.view.updateTileFavoriteState(colorId, true);

      // Add tile to favorites section
      const color = this.model.getColorById(colorId);
      if (color) {
        this.view.addTileToSection("favorites", color, {
          showHideButton: false,
        });
      }
    }

    // Process removed favorites
    for (const colorId of removed) {
      // Update heart icon on all tile instances
      this.view.updateTileFavoriteState(colorId, false);

      // Remove tile from favorites section
      this.view.removeTileFromSection("favorites", colorId);
    }

    // Show empty state if needed
    if (removed.length > 0) {
      this.view.showEmptyStateIfNeeded(
        "favorites",
        "No favorite colors yet.",
        "Click the heart icon on any color to add it to your favorites.",
      );
    }

    // Update favorites section header count
    const newCount = favoriteSet.size;
    const title = newCount > 0 ? `Favorites (${newCount})` : "Favorites";
    this.view.updateSectionHeader("favorites", title);

    // Update accordion open/close if transitioning from 0 to some or some to 0
    if (added.length > 0 && favoriteSet.size === added.length) {
      // Went from 0 to some — open the accordion
      const header = document.getElementById("favorites-header");
      const content = document.getElementById("favorites");
      if (header && content) {
        header.setAttribute("aria-expanded", "true");
        content.setAttribute("aria-hidden", "false");
        content.removeAttribute("inert");
      }
    }
  }

  /**
   * Apply surgical DOM updates for hidden state changes.
   * - Toggle eye icon on all tile instances
   * - Add/remove tiles from the hidden section
   * - Add/remove tiles from family/category sections
   * @private
   * @param {string[]} added - Newly hidden color IDs
   * @param {string[]} removed - Unhidden color IDs
   */
  _applyHiddenDiff(added, removed) {
    const hiddenSet = this.state.getHiddenSet();
    const favoriteSet = this.state.getFavoriteSet();
    const lrvRange = this.state.getLrvRange();

    // Process newly hidden colors
    for (const colorId of added) {
      // Update eye icon on all tile instances
      this.view.updateTileHiddenState(colorId, true);

      const color = this.model.getColorById(colorId);
      if (!color) continue;

      // Remove tile from family/category sections
      const sections = this.model.getColorSectionIds(colorId);
      for (const sectionId of [
        ...sections.familySectionIds,
        ...sections.categorySectionIds,
      ]) {
        this.view.removeTileFromSection(sectionId, colorId);
        // Update section header count
        this._updateSectionHeaderCount(sectionId);
      }

      // Add tile to hidden section (only if not in a fully-hidden group)
      this.view.addTileToSection("hidden", color, {
        showFavoriteButton: false,
      });
    }

    // Process unhidden colors
    for (const colorId of removed) {
      // Update eye icon on all tile instances
      this.view.updateTileHiddenState(colorId, false);

      const color = this.model.getColorById(colorId);
      if (!color) continue;

      // Remove from hidden section
      this.view.removeTileFromSection("hidden", colorId);

      // Add back to family/category sections if passes LRV filter and not favorited
      if (!favoriteSet.has(colorId) && this._passesLrvFilter(color, lrvRange)) {
        const sections = this.model.getColorSectionIds(colorId);
        for (const sectionId of [
          ...sections.familySectionIds,
          ...sections.categorySectionIds,
        ]) {
          this.view.addTileToSection(sectionId, color);
          this._updateSectionHeaderCount(sectionId);
        }
      }
    }

    // Show empty state in hidden section if needed
    if (removed.length > 0) {
      this.view.showEmptyStateIfNeeded(
        "hidden",
        "No hidden colors.",
        "Click the eye icon on any color to hide it.",
      );
    }

    // Update hidden section header
    const hiddenCount = hiddenSet.size;
    const hiddenTitle =
      hiddenCount > 0 ? `Hidden Colors (${hiddenCount})` : "Hidden Colors";
    this.view.updateSectionHeader("hidden", hiddenTitle);
  }

  /**
   * Check if a color passes the current LRV filter range.
   * @private
   * @param {Object} color - The color object
   * @param {{min: number, max: number}} lrvRange - Current LRV range
   * @returns {boolean} Whether the color is within the LRV range
   */
  _passesLrvFilter(color, lrvRange) {
    if (lrvRange.min === 0 && lrvRange.max === 100) return true;
    const lrv = color.lrv ?? 0;
    return lrv >= lrvRange.min && lrv <= lrvRange.max;
  }

  /**
   * Update a section header count by counting its current tiles.
   * @private
   * @param {string} sectionId - The section ID
   */
  _updateSectionHeaderCount(sectionId) {
    const containerId = getTilesContainerId(sectionId);
    const container = document.getElementById(containerId);
    if (!container) return;

    const tileCount = container.querySelectorAll(
      `.${CSS_CLASSES.COLOR_TILE}`,
    ).length;

    // Extract group name from sectionId for display
    const header = document.getElementById(`${sectionId}-header`);
    if (!header) return;
    const span = header.querySelector("span");
    if (!span) return;

    // Parse existing title to get the base name (before the count)
    const currentText = span.textContent;
    const baseName = currentText.replace(/\s*\(\d+\)\s*$/, "");
    span.textContent = `${baseName} (${tileCount})`;
  }

  /**
   * Update the LRV count display without re-rendering.
   * @private
   */
  _updateLrvCount() {
    if (this.state.isLrvFilterActive()) {
      const favoriteCount = this.state.getFavoriteSet().size;
      const hiddenSet = this.state.getHiddenSet();
      const favoriteSet = this.state.getFavoriteSet();
      const lrvRange = this.state.getLrvRange();
      const visibleColors = this.model.getVisibleColors(
        hiddenSet,
        favoriteSet,
        lrvRange,
      );
      const totalActive = this.model.getActiveColorCount();
      this.view.updateLrvCount(
        true,
        visibleColors.length + favoriteCount,
        totalActive,
      );
    } else {
      this.view.updateLrvCount(false, 0, 0);
    }
  }

  /**
   * Show confirmation dialog and return a Promise
   * @param {Object} options - Confirmation options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Confirmation message
   * @param {string} options.confirmText - Confirm button text
   * @param {string} options.cancelText - Cancel button text
   * @param {string} options.confirmClass - CSS class for confirm button
   * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
   */
  showConfirmation(options) {
    return new Promise((resolve) => {
      // Create confirmation modal
      const modalHTML = confirmationModal(options);

      // Insert into DOM
      document.body.insertAdjacentHTML("beforeend", modalHTML);

      const overlay = document.getElementById(ELEMENT_IDS.CONFIRM_OVERLAY);
      const confirmBtn = document.getElementById(ELEMENT_IDS.CONFIRM_CONFIRM);
      const cancelBtn = document.getElementById(ELEMENT_IDS.CONFIRM_CANCEL);

      // Focus confirm button for keyboard accessibility
      setTimeout(() => confirmBtn.focus(), 100);

      // Handle confirm
      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };

      // Handle cancel
      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      // Cleanup function
      const cleanup = () => {
        overlay.classList.add("closing");
        setTimeout(() => {
          overlay.remove();
        }, 300); // Match animation duration
      };

      // Event listeners
      confirmBtn.addEventListener("click", handleConfirm);
      cancelBtn.addEventListener("click", handleCancel);

      // Close on overlay click
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          handleCancel();
        }
      });

      // Close on Escape key
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          handleCancel();
          document.removeEventListener("keydown", handleEscape);
        }
      };
      document.addEventListener("keydown", handleEscape);
    });
  }

  /**
   * Show toast notification with undo action
   * @param {Object} options - Toast options
   * @param {string} options.message - Toast message
   * @param {Function} options.onUndo - Callback when undo is clicked
   * @param {number} options.duration - Auto-dismiss duration in ms (default: 5000)
   * @returns {void}
   */
  showToast({ message, onUndo, duration = 5000 }) {
    const toastId = `toast-${Date.now()}`;
    const toastHTML = toastNotification({
      message,
      actionText: "Undo",
      id: toastId,
    });

    // Insert into DOM
    document.body.insertAdjacentHTML("beforeend", toastHTML);

    const toast = document.getElementById(toastId);
    const actionBtn = toast.querySelector(`.${CSS_CLASSES.TOAST_ACTION}`);
    const closeBtn = toast.querySelector(`.${CSS_CLASSES.TOAST_CLOSE}`);

    let timeoutId = null;
    let isDismissed = false;

    // Auto-dismiss after duration
    const scheduleAutoDismiss = () => {
      timeoutId = setTimeout(() => {
        dismissToast();
      }, duration);
    };

    // Dismiss toast
    const dismissToast = () => {
      if (isDismissed) return;
      isDismissed = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      toast.classList.add(CSS_CLASSES.TOAST_HIDING);
      setTimeout(() => {
        toast.remove();
      }, 300); // Match animation duration
    };

    // Handle undo
    const handleUndo = () => {
      if (isDismissed) return;
      dismissToast();
      if (onUndo) {
        onUndo();
      }
    };

    // Event listeners
    actionBtn.addEventListener("click", handleUndo);
    closeBtn.addEventListener("click", dismissToast);

    // Start auto-dismiss timer
    scheduleAutoDismiss();
  }

  /**
   * Initialize the application
   */
  init() {
    this.setupEventListeners();
    this.setupHeaderButtons();
    this.setupModalListeners();
    this.setupLrvFilter();
    this.render();
    this.checkSharedColor();
  }

  /**
   * Check for a shared color in the URL and auto-open its modal
   */
  checkSharedColor() {
    const params = new URLSearchParams(globalThis.location.search);
    const colorId = params.get(URL_PARAMS.COLOR);
    if (colorId) {
      // Clean the ?color= param from the URL so it doesn't persist
      params.delete(URL_PARAMS.COLOR);
      const remaining = params.toString();
      const newUrl =
        globalThis.location.pathname + (remaining ? `?${remaining}` : "");
      globalThis.history.replaceState({}, "", newUrl);

      this.openModal(colorId);
    }
  }

  /**
   * Setup LRV range slider filter
   */
  setupLrvFilter() {
    const minSlider = document.getElementById(ELEMENT_IDS.LRV_SLIDER_MIN);
    const maxSlider = document.getElementById(ELEMENT_IDS.LRV_SLIDER_MAX);
    const minValue = document.getElementById(ELEMENT_IDS.LRV_VALUE_MIN);
    const maxValue = document.getElementById(ELEMENT_IDS.LRV_VALUE_MAX);
    const rangeFill = document.getElementById(ELEMENT_IDS.LRV_RANGE_FILL);
    const resetBtn = document.getElementById(ELEMENT_IDS.LRV_RESET);

    if (!minSlider || !maxSlider) return;

    // Initialize from state
    const { min, max } = this.state.getLrvRange();
    minSlider.value = min;
    maxSlider.value = max;

    const updateSliderUI = () => {
      const minVal = Number(minSlider.value);
      const maxVal = Number(maxSlider.value);

      // Update displayed values
      minValue.textContent = minVal;
      maxValue.textContent = maxVal;

      // Update aria values
      minSlider.setAttribute("aria-valuenow", minVal);
      maxSlider.setAttribute("aria-valuenow", maxVal);

      // Update range fill position
      rangeFill.style.left = `${minVal}%`;
      rangeFill.style.right = `${100 - maxVal}%`;

      // Show/hide reset button
      const isActive = minVal > 0 || maxVal < 100;
      resetBtn.hidden = !isActive;
    };

    // Debounce render to avoid excessive re-renders during drag
    let renderTimeout = null;
    const debouncedRender = () => {
      if (renderTimeout) clearTimeout(renderTimeout);
      renderTimeout = setTimeout(() => {
        const minVal = Number(minSlider.value);
        const maxVal = Number(maxSlider.value);
        this.state.setLrvRange(minVal, maxVal);
        this.render();
      }, 80);
    };

    // Prevent min from crossing max and vice versa
    minSlider.addEventListener("input", () => {
      if (Number(minSlider.value) > Number(maxSlider.value)) {
        minSlider.value = maxSlider.value;
      }
      updateSliderUI();
      debouncedRender();
    });

    maxSlider.addEventListener("input", () => {
      if (Number(maxSlider.value) < Number(minSlider.value)) {
        maxSlider.value = minSlider.value;
      }
      updateSliderUI();
      debouncedRender();
    });

    // Reset button
    resetBtn.addEventListener("click", () => {
      minSlider.value = 0;
      maxSlider.value = 100;
      updateSliderUI();
      this.state.setLrvRange(0, 100);
      this.render();
    });

    // Set initial UI state
    updateSliderUI();
  }

  /**
   * Setup modal event listeners (close button, overlay click, escape key)
   */
  setupModalListeners() {
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
  }

  /**
   * Open modal with color details
   * @param {string} colorId - The ID of the color to display
   */
  openModal(colorId) {
    // Save current scroll position to URL
    const scrollPosition =
      globalThis.scrollY || document.documentElement.scrollTop;
    this.state.setScrollPosition(scrollPosition);

    const color = this.model.getColorById(colorId);

    if (!color) {
      console.error("Color not found:", colorId);
      return;
    }

    // Get coordinating colors via O(1) Map lookups
    const coordinatingColors = {};
    if (color.coordinatingColors) {
      if (color.coordinatingColors.coord1ColorId) {
        coordinatingColors.coord1 = this.model.getColorById(
          color.coordinatingColors.coord1ColorId,
        );
      }
      if (color.coordinatingColors.coord2ColorId) {
        coordinatingColors.coord2 = this.model.getColorById(
          color.coordinatingColors.coord2ColorId,
        );
      }
      if (color.coordinatingColors.whiteColorId) {
        coordinatingColors.white = this.model.getColorById(
          color.coordinatingColors.whiteColorId,
        );
      }
    }

    // Get similar colors via O(1) Map lookups
    const similarColors = [];
    if (color.similarColors && Array.isArray(color.similarColors)) {
      for (const similarId of color.similarColors) {
        const similarColor = this.model.getColorById(similarId);
        if (similarColor) {
          similarColors.push(similarColor);
        }
      }
    }

    // Remove existing modal if present
    const existingModal = document.getElementById(
      ELEMENT_IDS.COLOR_DETAIL_MODAL,
    );
    if (existingModal) {
      existingModal.remove();
    }

    // Check if color is favorited or hidden via O(1) Set lookups
    const isFavorited = this.state.getFavoriteSet().has(colorId);
    const isHidden = this.state.getHiddenSet().has(colorId);

    // Create and insert modal
    const modalHTML = colorDetailModal(
      color,
      coordinatingColors,
      similarColors,
      isFavorited,
      isHidden,
    );
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Trigger animation
    requestAnimationFrame(() => {
      const modal = document.getElementById(ELEMENT_IDS.COLOR_DETAIL_MODAL);
      if (modal) {
        modal.classList.add("active");

        // Focus the close button for accessibility
        const closeButton = modal.querySelector(`.${CSS_CLASSES.MODAL_CLOSE}`);
        if (closeButton) {
          closeButton.focus();
        }

        // Set up accordion functionality
        const accordionTrigger = modal.querySelector(
          ".modal__accordion-trigger",
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
          `.${CSS_CLASSES.MODAL_ACTION_BUTTON_FAVORITE}`,
        );
        const shareButton = modal.querySelector(
          `.${CSS_CLASSES.MODAL_ACTION_BUTTON_SHARE}`,
        );
        const copyButton = modal.querySelector(
          `.${CSS_CLASSES.MODAL_ACTION_BUTTON_COPY}`,
        );
        const hideButton = modal.querySelector(
          `.${CSS_CLASSES.MODAL_ACTION_BUTTON_HIDE}`,
        );
        const storeButton = modal.querySelector(
          `.${CSS_CLASSES.MODAL_ACTION_BUTTON_STORE}`,
        );

        if (favoriteButton) {
          favoriteButton.addEventListener("click", () => {
            this.handleFavoriteButton(colorId);
            // Update button UI
            const currentlyFavorited = this.state.getFavoriteSet().has(colorId);
            const heartSvg = favoriteButton.querySelector("svg");
            const buttonText = favoriteButton.querySelector("span");
            if (heartSvg && buttonText) {
              heartSvg.setAttribute(
                "fill",
                currentlyFavorited ? "currentColor" : "none",
              );
              buttonText.textContent = currentlyFavorited
                ? "Favorited"
                : "Add to Favorites";
              favoriteButton.setAttribute(
                "aria-label",
                `${currentlyFavorited ? "Remove from" : "Add to"} favorites`,
              );
            }
          });
        }

        if (shareButton) {
          shareButton.addEventListener("click", async () => {
            await this.handleShare(color);
          });
        }

        if (copyButton) {
          copyButton.addEventListener("click", async () => {
            await this.handleCopyColorCode(color);
          });
        }

        if (hideButton) {
          hideButton.addEventListener("click", () => {
            this.handleHideButton(colorId);
            // Update button UI
            const currentlyHidden = this.state.getHiddenSet().has(colorId);
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
                `${currentlyHidden ? "Show" : "Hide"} color`,
              );
            }
          });
        }

        if (storeButton) {
          storeButton.addEventListener("click", () => {
            this.showToast({
              message: `Visit your local Sherwin-Williams store and ask for: ${color.name} or ${color.brandKey} ${color.colorNumber} (Location: ${color.storeStripLocator})`,
              duration: 8000,
            });
          });
        }

        // Set up clickable mini tiles (coordinating & similar colors)
        const clickableTiles = modal.querySelectorAll(
          `.${CSS_CLASSES.MODAL_MINI_TILE_CLICKABLE}`,
        );
        clickableTiles.forEach((tile) => {
          const handleClick = () => {
            const tileColorId = tile.getAttribute(DATA_ATTRIBUTES.ID);
            if (tileColorId) {
              this.openModal(tileColorId);
            }
          };

          tile.addEventListener("click", handleClick);
          tile.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          });
        });
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
        `?${URL_PARAMS.COLOR}=${color.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        // Provide visual feedback
        const shareButton = document.querySelector(
          `.${CSS_CLASSES.MODAL_ACTION_BUTTON_SHARE} span`,
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
   * Handle copying color code to clipboard
   * @param {Object} color - The color to copy
   */
  async handleCopyColorCode(color) {
    const colorCode = `${color.name} (SW ${color.colorNumber})
Hex: ${color.hex}
RGB: rgb(${color.red}, ${color.green}, ${color.blue})
HSL: hsl(${Math.round(color.hue * 360)}°, ${Math.round(
      color.saturation * 100,
    )}%, ${Math.round(color.lightness * 100)}%)`;

    try {
      await navigator.clipboard.writeText(colorCode);
      // Provide visual feedback
      const copyButton = document.querySelector(
        `.${CSS_CLASSES.MODAL_ACTION_BUTTON_COPY} span`,
      );
      if (copyButton) {
        const originalText = copyButton.textContent;
        copyButton.textContent = "Copied!";
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
      console.error("Error copying color code:", err);
      // Fallback: show toast with the color code
      this.showToast({
        message: `Color Code: ${colorCode}`,
        duration: 5000,
      });
    }
  }

  /**
   * Close the modal
   */
  closeModal() {
    const modal = document.getElementById(ELEMENT_IDS.COLOR_DETAIL_MODAL);
    if (modal) {
      modal.classList.remove("active");

      // Remove modal after animation
      setTimeout(() => {
        modal.remove();
        // Restore body scrolling
        document.body.style.overflow = "";

        // Restore scroll position from URL
        const savedScrollPosition = this.state.getScrollPosition();
        if (savedScrollPosition > 0) {
          globalThis.scrollTo({
            top: savedScrollPosition,
            behavior: "instant",
          });
          // Clear scroll position from URL after restoring
          this.state.setScrollPosition(0);
        }
      }, 300);
    }
  }

  /**
   * Main render orchestration
   */
  render() {
    const favoriteSet = this.state.getFavoriteSet();
    const hiddenSet = this.state.getHiddenSet();
    const lrvRange = this.state.getLrvRange();

    // Get color data from model (pass Sets for O(1) lookups)
    const favoriteColors = this.model.getFavoriteColors(favoriteSet);
    const hiddenColors = this.model.getHiddenColors(hiddenSet);
    const visibleColors = this.model.getVisibleColors(
      hiddenSet,
      favoriteSet,
      lrvRange,
    );

    // Update LRV count display (reuse surgical helper)
    this.view.updateLrvCount(
      this.state.isLrvFilterActive(),
      visibleColors.length + favoriteColors.length,
      this.model.getActiveColorCount(),
    );

    // Group and sort
    const colorFamilies = this.model.groupByFamily(visibleColors);
    const sortedFamilies = this.model.sortFamiliesByPriority(
      Object.keys(colorFamilies),
    );

    const colorCategories = this.model.groupByCategory(visibleColors);
    const sortedCategories = Object.keys(colorCategories).sort((a, b) =>
      a.localeCompare(b),
    );

    // Get hidden groups (excluding favorited colors)
    const hiddenFamilies = this.model.getHiddenFamilies(hiddenSet, favoriteSet);
    const hiddenCategories = this.model.getHiddenCategories(
      hiddenSet,
      favoriteSet,
    );

    // Render via view (pass Sets for O(1) template lookups)
    this.view.render({
      favoriteColors,
      hiddenColors,
      colorFamilies,
      sortedFamilies,
      colorCategories,
      sortedCategories,
      hiddenFamilies,
      hiddenCategories,
      favoriteSet,
      hiddenSet,
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
        handler: (familyName) => this.handleUnhideButton(familyName, null),
      },
      {
        selector: `.${CSS_CLASSES.COLOR_TILE_CATEGORY}`,
        getAttribute: DATA_ATTRIBUTES.CATEGORY,
        excludeIfContains: `.${CSS_CLASSES.COLOR_TILE_UNHIDE_BUTTON}`,
        handler: (categoryName) => this.handleUnhideButton(null, categoryName),
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
    const exportFavBtn = document.getElementById(
      ELEMENT_IDS.EXPORT_FAVORITES_BTN,
    );
    if (exportFavBtn) {
      exportFavBtn.addEventListener("click", () => {
        this.handleExportFavorites();
      });
    }

    const clearFavBtn = document.getElementById(
      ELEMENT_IDS.CLEAR_FAVORITES_BTN,
    );
    if (clearFavBtn) {
      clearFavBtn.addEventListener("click", () => {
        this.handleClearFavorites();
      });
    }

    const clearHiddenBtn = document.getElementById(
      ELEMENT_IDS.CLEAR_HIDDEN_BTN,
    );
    if (clearHiddenBtn) {
      clearHiddenBtn.addEventListener("click", () => {
        this.handleClearHidden();
      });
    }
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
  async handleBulkFavoriteButton(groupId, groupName) {
    const groupColors = this.model.getColorsForId(groupId, () => groupName);
    const favoriteSet = this.state.getFavoriteSet();
    const hiddenSet = this.state.getHiddenSet();
    const allFavorited = groupColors.every((color) =>
      favoriteSet.has(color.id),
    );

    // Use visible count (excluding hidden & already-favorited) to match accordion header
    const visibleCount = groupColors.filter(
      (c) => !hiddenSet.has(c.id) && !favoriteSet.has(c.id),
    ).length;
    const count = allFavorited ? groupColors.length : visibleCount;

    const action = allFavorited ? "unfavorite" : "favorite";
    const actionTitle = allFavorited
      ? "Remove from Favorites?"
      : "Add to Favorites?";

    const confirmed = await this.showConfirmation({
      title: actionTitle,
      message: `Are you sure you want to ${action} all ${count} color${
        count === 1 ? "" : "s"
      } in "${groupName}"?`,
      confirmText: allFavorited ? "Remove All" : "Add All",
      cancelText: "Cancel",
      confirmClass: allFavorited ? "btn-danger" : "btn-primary",
    });

    if (confirmed) {
      // Pass precomputed colors to avoid a second getColorsForId call inside execute()
      const command = new BulkFavoriteCommand(
        this.model,
        this.state,
        groupId,
        groupName,
        groupColors,
      );
      this._executeCommand(command);

      // Show undo toast
      const actionPastTense = allFavorited ? "removed from" : "added to";
      this.showToast({
        message: `${count} color${
          count === 1 ? "" : "s"
        } ${actionPastTense} favorites.`,
        onUndo: () => {
          const stateChanged = command.undo();
          if (stateChanged) {
            this.render();
          }
        },
      });
    }
  }

  /**
   * Handle bulk hide button click (family/category)
   */
  async handleBulkHideButton(groupId, groupName) {
    const groupColors = this.model.getColorsForId(groupId, () => groupName);
    const hiddenSet = this.state.getHiddenSet();
    const favoriteSet = this.state.getFavoriteSet();
    const allHidden = groupColors.every((color) => hiddenSet.has(color.id));

    // Use visible count (excluding hidden & favorited) to match accordion header
    const visibleCount = groupColors.filter(
      (c) => !hiddenSet.has(c.id) && !favoriteSet.has(c.id),
    ).length;
    const count = allHidden ? groupColors.length : visibleCount;

    const action = allHidden ? "unhide" : "hide";
    const actionTitle = allHidden ? "Unhide All Colors?" : "Hide All Colors?";

    const confirmed = await this.showConfirmation({
      title: actionTitle,
      message: `Are you sure you want to ${action} all ${count} color${
        count === 1 ? "" : "s"
      } in "${groupName}"?`,
      confirmText: allHidden ? "Unhide All" : "Hide All",
      cancelText: "Cancel",
      confirmClass: allHidden ? "btn-primary" : "btn-danger",
    });

    if (confirmed) {
      // Pass precomputed colors to avoid a second getColorsForId call inside execute()
      const command = new BulkHideCommand(
        this.model,
        this.state,
        groupId,
        groupName,
        groupColors,
      );
      this._executeCommand(command);

      // Show undo toast
      const actionPastTense = allHidden ? "unhidden" : "hidden";
      this.showToast({
        message: `${count} color${count === 1 ? "" : "s"} ${actionPastTense}.`,
        onUndo: () => {
          const stateChanged = command.undo();
          if (stateChanged) {
            this.render();
          }
        },
      });
    }
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
        familyName,
      );
      this._executeCommand(command);
    } else if (categoryName) {
      const command = new UnhideGroupCommand(
        this.model,
        this.state,
        "category",
        categoryName,
      );
      this._executeCommand(command);
    }
  }

  /**
   * Handle clear all favorites button click
   */
  async handleClearFavorites() {
    const count = this.state.getFavoriteSet().size;

    if (count === 0) {
      return; // Nothing to clear
    }

    const confirmed = await this.showConfirmation({
      title: "Clear All Favorites?",
      message: `Are you sure you want to remove all ${count} favorite color${
        count === 1 ? "" : "s"
      }? This action cannot be undone.`,
      confirmText: "Clear All",
      cancelText: "Cancel",
      confirmClass: "btn-danger",
    });

    if (confirmed) {
      const command = new ClearFavoritesCommand(this.model, this.state);
      this._executeCommand(command);

      // Show undo toast
      this.showToast({
        message: `${count} favorite${count === 1 ? "" : "s"} cleared.`,
        onUndo: () => {
          const stateChanged = command.undo();
          if (stateChanged) {
            this.render();
          }
        },
      });
    }
  }

  /**
   * Handle clear all hidden button click
   */
  async handleClearHidden() {
    const count = this.state.getHiddenSet().size;

    if (count === 0) {
      return; // Nothing to clear
    }

    const confirmed = await this.showConfirmation({
      title: "Unhide All Colors?",
      message: `Are you sure you want to unhide all ${count} hidden color${
        count === 1 ? "" : "s"
      }? They will reappear in the color list.`,
      confirmText: "Unhide All",
      cancelText: "Cancel",
      confirmClass: "btn-primary",
    });

    if (confirmed) {
      const command = new ClearHiddenCommand(this.model, this.state);
      this._executeCommand(command);

      // Show undo toast
      this.showToast({
        message: `${count} color${count === 1 ? "" : "s"} unhidden.`,
        onUndo: () => {
          const stateChanged = command.undo();
          if (stateChanged) {
            this.render();
          }
        },
      });
    }
  }

  /**
   * Handle export favorites button click
   */
  handleExportFavorites() {
    const favoriteSet = this.state.getFavoriteSet();

    if (favoriteSet.size === 0) {
      this.showToast({
        message: "No favorites to export.",
        onUndo: null,
        duration: 3000,
      });
      return;
    }

    // Get color details for all favorites via O(1) Map lookups (iterate Set directly)
    const favoriteColors = [];
    for (const id of favoriteSet) {
      const color = this.model.getColorById(id);
      if (color) favoriteColors.push(color);
    }

    // Create export data
    const exportData = {
      exportDate: new Date().toISOString(),
      appVersion: APP_VERSION,
      count: favoriteColors.length,
      colors: favoriteColors.map((color) => ({
        id: color.id,
        name: color.name,
        number: color.colorNumber,
        hex: color.hex,
        rgb: color.rgb,
        hsl: {
          h: Math.round(color.hue * 360),
          s: Math.round(color.saturation * 100),
          l: Math.round(color.lightness * 100),
        },
        lrv: color.lrv,
        family: color.colorFamilyNames?.[0] || null,
      })),
    };

    // Create and download JSON file
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date()
      .toISOString()
      .replaceAll(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `sw-favorites-${timestamp}.json`;

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    // Clean up
    URL.revokeObjectURL(url);

    // Show success toast
    this.showToast({
      message: `${favoriteColors.length} favorite${
        favoriteColors.length === 1 ? "" : "s"
      } exported.`,
      onUndo: null,
      duration: 3000,
    });
  }
}
