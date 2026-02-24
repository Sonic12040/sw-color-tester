/**
 * Controller layer — coordinates user events, commands, and rendering.
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
  constructor(model, state, view, dialog) {
    this.model = model;
    this.state = state;
    this.view = view;
    this.dialog = dialog;
  }

  /**
   * Execute a command with state diffing — applies surgical DOM updates
   * when the change is small, or falls back to full render for bulk changes.
   * @private
   * @param {ColorCommand} command - Command to execute
   */
  _executeCommand(command) {
    const prevFavorites = new Set(this.state.getFavoriteSet());
    const prevHidden = new Set(this.state.getHiddenSet());

    const stateChanged = command.execute();
    if (!stateChanged) return;

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

    // Fall back to full render for bulk changes
    if (totalChanges === 0 || totalChanges > 10) {
      this.render();
      return;
    }

    this.view.favoriteIds = newFavorites;
    this.view.hiddenIds = newHidden;
    this.view.designerPickIds = this.model.getDesignerPickIds();

    this._applyFavoriteDiff(addedFavs, removedFavs);
    this._applyHiddenDiff(addedHidden, removedHidden);
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

    for (const colorId of added) {
      this.view.updateTileFavoriteState(colorId, true);

      const color = this.model.getColorById(colorId);
      if (color) {
        this.view.addTileToSection("favorites", color, {
          showHideButton: false,
        });
      }
    }

    for (const colorId of removed) {
      this.view.updateTileFavoriteState(colorId, false);
      this.view.removeTileFromSection("favorites", colorId);
    }

    if (removed.length > 0) {
      this.view.showEmptyStateIfNeeded(
        "favorites",
        "No favorite colors yet.",
        "Click the heart icon on any color to add it to your favorites.",
      );
    }

    const newCount = favoriteSet.size;
    const title = newCount > 0 ? `Favorites (${newCount})` : "Favorites";
    this.view.updateSectionHeader("favorites", title);

    // Open accordion when transitioning from 0 favorites to some
    if (added.length > 0 && favoriteSet.size === added.length) {
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
   * - Add/remove tiles from family sections
   * @private
   * @param {string[]} added - Newly hidden color IDs
   * @param {string[]} removed - Unhidden color IDs
   */
  _applyHiddenDiff(added, removed) {
    const hiddenSet = this.state.getHiddenSet();
    const favoriteSet = this.state.getFavoriteSet();
    const lrvRange = this.state.getLrvRange();

    for (const colorId of added) {
      this.view.updateTileHiddenState(colorId, true);

      const color = this.model.getColorById(colorId);
      if (!color) continue;

      const sections = this.model.getColorSectionIds(colorId);
      for (const sectionId of sections.familySectionIds) {
        this.view.removeTileFromSection(sectionId, colorId);
        this._updateSectionHeaderCount(sectionId);
      }

      // Add tile to hidden section
      this.view.addTileToSection("hidden", color, {
        showFavoriteButton: false,
      });
    }

    for (const colorId of removed) {
      this.view.updateTileHiddenState(colorId, false);

      const color = this.model.getColorById(colorId);
      if (!color) continue;

      this.view.removeTileFromSection("hidden", colorId);

      if (!favoriteSet.has(colorId) && this._passesLrvFilter(color, lrvRange)) {
        const sections = this.model.getColorSectionIds(colorId);
        for (const sectionId of sections.familySectionIds) {
          this.view.addTileToSection(sectionId, color);
          this._updateSectionHeaderCount(sectionId);
        }
      }
    }

    if (removed.length > 0) {
      this.view.showEmptyStateIfNeeded(
        "hidden",
        "No hidden colors.",
        "Click the eye icon on any color to hide it.",
      );
    }

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

    const header = document.getElementById(`${sectionId}-header`);
    if (!header) return;
    const span = header.querySelector("span");
    if (!span) return;

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
   * Initialize the application.
   */
  init() {
    this.setupToolbar();
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
   * Setup toolbar toggle button to show/hide the toolbar panel
   */
  setupToolbar() {
    const toggle = document.getElementById(ELEMENT_IDS.TOOLBAR_TOGGLE);
    const panel = document.getElementById(ELEMENT_IDS.TOOLBAR_PANEL);

    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", !isExpanded);
      panel.hidden = isExpanded;
    });
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

    const { min, max } = this.state.getLrvRange();
    minSlider.value = min;
    maxSlider.value = max;

    const updateSliderUI = () => {
      const minVal = Number(minSlider.value);
      const maxVal = Number(maxSlider.value);

      minValue.textContent = minVal;
      maxValue.textContent = maxVal;

      minSlider.setAttribute("aria-valuenow", minVal);
      maxSlider.setAttribute("aria-valuenow", maxVal);

      rangeFill.style.left = `${minVal}%`;
      rangeFill.style.right = `${100 - maxVal}%`;

      const isActive = minVal > 0 || maxVal < 100;
      resetBtn.classList.toggle("lrv-filter__reset--visible", isActive);
    };

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

    resetBtn.addEventListener("click", () => {
      minSlider.value = 0;
      maxSlider.value = 100;
      updateSliderUI();
      this.state.setLrvRange(0, 100);
      this.render();
    });

    // Set initial state
    updateSliderUI();
  }

  /**
   * Setup modal event listeners (close button, overlay click, escape key)
   */
  setupModalListeners() {
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains(CSS_CLASSES.MODAL_OVERLAY)) {
        this.closeModal();
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest(`.${CSS_CLASSES.MODAL_CLOSE}`)) {
        this.closeModal();
      }
    });

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
    // Save scroll position before opening modal
    const scrollPosition =
      globalThis.scrollY || document.documentElement.scrollTop;
    this.state.setScrollPosition(scrollPosition);

    const color = this.model.getColorById(colorId);

    if (!color) {
      console.error("Color not found:", colorId);
      return;
    }

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

    const similarColors = [];
    if (color.similarColors && Array.isArray(color.similarColors)) {
      for (const similarId of color.similarColors) {
        const similarColor = this.model.getColorById(similarId);
        if (similarColor) {
          similarColors.push(similarColor);
        }
      }
    }

    const existingModal = document.getElementById(
      ELEMENT_IDS.COLOR_DETAIL_MODAL,
    );
    if (existingModal) {
      existingModal.remove();
    }

    const isFavorited = this.state.getFavoriteSet().has(colorId);
    const isHidden = this.state.getHiddenSet().has(colorId);

    const modalHTML = colorDetailModal(
      color,
      coordinatingColors,
      similarColors,
      isFavorited,
      isHidden,
    );
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    requestAnimationFrame(() => {
      const modal = document.getElementById(ELEMENT_IDS.COLOR_DETAIL_MODAL);
      if (modal) {
        modal.classList.add("active");

        const closeButton = modal.querySelector(`.${CSS_CLASSES.MODAL_CLOSE}`);
        if (closeButton) {
          closeButton.focus();
        }

        const accordionTrigger = modal.querySelector(
          ".modal__accordion-trigger",
        );
        const accordionPanel = modal.querySelector(".modal__accordion-panel");

        if (accordionTrigger && accordionPanel) {
          accordionTrigger.addEventListener("click", () => {
            const isExpanded =
              accordionTrigger.getAttribute("aria-expanded") === "true";

            accordionTrigger.setAttribute("aria-expanded", !isExpanded);
            accordionPanel.setAttribute("aria-hidden", isExpanded);

            if (isExpanded) {
              accordionPanel.setAttribute("inert", "");
            } else {
              accordionPanel.removeAttribute("inert");
            }
          });
        }

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
            const currentlyHidden = this.state.getHiddenSet().has(colorId);
            const eyeSvg = hideButton.querySelector("svg");
            const buttonText = hideButton.querySelector("span");
            if (eyeSvg && buttonText) {
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
            this.dialog.toast({
              message: `Visit your local Sherwin-Williams store and ask for: ${color.name} or ${color.brandKey} ${color.colorNumber} (Location: ${color.storeStripLocator})`,
              duration: 8000,
            });
          });
        }

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
        await navigator.clipboard.writeText(shareData.url);
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
      this.dialog.toast({
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

      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = "";

        // Restore scroll position
        const savedScrollPosition = this.state.getScrollPosition();
        if (savedScrollPosition > 0) {
          globalThis.scrollTo({
            top: savedScrollPosition,
            behavior: "instant",
          });
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

    const favoriteColors = this.model.getFavoriteColors(favoriteSet);
    const hiddenColors = this.model.getHiddenColors(hiddenSet);
    const visibleColors = this.model.getVisibleColors(
      hiddenSet,
      favoriteSet,
      lrvRange,
    );

    this.view.updateLrvCount(
      this.state.isLrvFilterActive(),
      visibleColors.length + favoriteColors.length,
      this.model.getActiveColorCount(),
    );

    const colorFamilies = this.model.groupByFamily(visibleColors);
    const sortedFamilies = this.model.sortFamiliesByPriority(
      Object.keys(colorFamilies),
    );

    const hiddenFamilies = this.model.getHiddenFamilies(hiddenSet, favoriteSet);

    this.view.render({
      favoriteColors,
      hiddenColors,
      colorFamilies,
      sortedFamilies,
      hiddenFamilies,
      favoriteSet,
      hiddenSet,
      designerPickIds: this.model.getDesignerPickIds(),
    });
  }

  /**
   * Event handler registry — maps selectors to handlers.
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
          if (familyName) this.handleUnhideButton(familyName);
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
        handler: (familyName) => this.handleUnhideButton(familyName),
      },
    ];
  }

  /**
   * Setup delegated event listeners on accordion.
   */
  setupEventListeners() {
    const accordion = document.getElementById(ELEMENT_IDS.COLOR_ACCORDION);

    if (!accordion) {
      console.error("Accordion container not found");
      return;
    }

    const handlers = this._getEventHandlerRegistry();

    accordion.addEventListener("click", (e) => {
      for (const config of handlers) {
        const element = e.target.closest(config.selector);

        if (!element) continue;
        if (
          config.excludeIfContains &&
          e.target.closest(config.excludeIfContains)
        ) {
          continue;
        }

        e.preventDefault();
        e.stopPropagation();

        const value = config.getAttribute
          ? element.getAttribute(config.getAttribute)
          : element;

        config.handler(value);
        return;
      }
    });
  }

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

  handleFavoriteButton(colorId) {
    const command = new ToggleFavoriteCommand(this.model, this.state, colorId);
    this._executeCommand(command);
  }

  handleHideButton(colorId) {
    const command = new ToggleHiddenCommand(this.model, this.state, colorId);
    this._executeCommand(command);
  }

  async handleBulkFavoriteButton(groupId, groupName) {
    const groupColors = this.model.getColorsForId(groupId, () => groupName);
    const favoriteSet = this.state.getFavoriteSet();
    const hiddenSet = this.state.getHiddenSet();
    const allFavorited = groupColors.every((color) =>
      favoriteSet.has(color.id),
    );

    // Use visible count to match accordion header
    const visibleCount = groupColors.filter(
      (c) => !hiddenSet.has(c.id) && !favoriteSet.has(c.id),
    ).length;
    const count = allFavorited ? groupColors.length : visibleCount;

    const action = allFavorited ? "unfavorite" : "favorite";
    const actionTitle = allFavorited
      ? "Remove from Favorites?"
      : "Add to Favorites?";

    const confirmed = await this.dialog.confirm({
      title: actionTitle,
      message: `Are you sure you want to ${action} all ${count} color${
        count === 1 ? "" : "s"
      } in "${groupName}"?`,
      confirmText: allFavorited ? "Remove All" : "Add All",
      cancelText: "Cancel",
      confirmClass: allFavorited ? "btn-danger" : "btn-primary",
    });

    if (confirmed) {
      // Precomputed colors avoid a second getColorsForId call inside execute()
      const command = new BulkFavoriteCommand(
        this.model,
        this.state,
        groupId,
        groupName,
        groupColors,
      );
      this._executeCommand(command);

      const actionPastTense = allFavorited ? "removed from" : "added to";
      this.dialog.toast({
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

  async handleBulkHideButton(groupId, groupName) {
    const groupColors = this.model.getColorsForId(groupId, () => groupName);
    const hiddenSet = this.state.getHiddenSet();
    const favoriteSet = this.state.getFavoriteSet();
    const allHidden = groupColors.every((color) => hiddenSet.has(color.id));

    // Use visible count to match accordion header
    const visibleCount = groupColors.filter(
      (c) => !hiddenSet.has(c.id) && !favoriteSet.has(c.id),
    ).length;
    const count = allHidden ? groupColors.length : visibleCount;

    const action = allHidden ? "unhide" : "hide";
    const actionTitle = allHidden ? "Unhide All Colors?" : "Hide All Colors?";

    const confirmed = await this.dialog.confirm({
      title: actionTitle,
      message: `Are you sure you want to ${action} all ${count} color${
        count === 1 ? "" : "s"
      } in "${groupName}"?`,
      confirmText: allHidden ? "Unhide All" : "Hide All",
      cancelText: "Cancel",
      confirmClass: allHidden ? "btn-primary" : "btn-danger",
    });

    if (confirmed) {
      // Precomputed colors avoid a second getColorsForId call inside execute()
      const command = new BulkHideCommand(
        this.model,
        this.state,
        groupId,
        groupName,
        groupColors,
      );
      this._executeCommand(command);

      const actionPastTense = allHidden ? "unhidden" : "hidden";
      this.dialog.toast({
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

  handleUnhideButton(familyName) {
    if (familyName) {
      const command = new UnhideGroupCommand(
        this.model,
        this.state,
        familyName,
      );
      this._executeCommand(command);
    }
  }

  async handleClearFavorites() {
    const count = this.state.getFavoriteSet().size;

    if (count === 0) {
      return;
    }

    const confirmed = await this.dialog.confirm({
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

      this.dialog.toast({
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

  async handleClearHidden() {
    const count = this.state.getHiddenSet().size;

    if (count === 0) {
      return;
    }

    const confirmed = await this.dialog.confirm({
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

      this.dialog.toast({
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

  handleExportFavorites() {
    const favoriteSet = this.state.getFavoriteSet();

    if (favoriteSet.size === 0) {
      this.dialog.toast({
        message: "No favorites to export.",
        onUndo: null,
        duration: 3000,
      });
      return;
    }

    const favoriteColors = [];
    for (const id of favoriteSet) {
      const color = this.model.getColorById(id);
      if (color) favoriteColors.push(color);
    }

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

    URL.revokeObjectURL(url);

    this.dialog.toast({
      message: `${favoriteColors.length} favorite${
        favoriteColors.length === 1 ? "" : "s"
      } exported.`,
      onUndo: null,
      duration: 3000,
    });
  }
}
