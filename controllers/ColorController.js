/**
 * Controller layer — coordinates user events, commands, and rendering.
 */

import {
  CSS_CLASSES,
  ELEMENT_IDS,
  DATA_ATTRIBUTES,
  URL_PARAMS,
  TIMING,
  THRESHOLDS,
  getTilesContainerId,
} from "../utils/config.js";
import {
  ToggleFavoriteCommand,
  ToggleHiddenCommand,
  BulkFavoriteCommand,
  BulkHideCommand,
  UnhideGroupCommand,
  ClearFavoritesCommand,
  ClearHiddenCommand,
} from "../commands/index.js";

const plural = (n, word, suffix = "s") =>
  `${n} ${word}${n === 1 ? "" : suffix}`;

export class ColorController {
  #handlingCommand = false;

  constructor(
    model,
    state,
    view,
    dialog,
    exportService,
    lrvFilter,
    modalController,
    commandBus,
  ) {
    this.model = model;
    this.state = state;
    this.view = view;
    this.dialog = dialog;
    this.exportService = exportService;
    this.lrvFilter = lrvFilter;
    this.modalController = modalController;
    this.commandBus = commandBus;

    commandBus.setHandler((cmd) => this.#executeCommand(cmd));

    this.#subscribeToStateEvents();
  }

  /**
   * Subscribe to AppState events for rendering triggered by non-command sources
   * (e.g. LrvFilterController setting LRV range directly on state).
   * Skipped when #handlingCommand is true — #executeCommand handles its own rendering.
   */
  #subscribeToStateEvents() {
    const renderIfExternal = () => {
      if (!this.#handlingCommand) this.render();
    };
    this.state.on("favoritesChanged", renderIfExternal);
    this.state.on("hiddenChanged", renderIfExternal);
    this.state.on("lrvChanged", renderIfExternal);
    this.state.on("neutralBgChanged", () => this.#applyNeutralBg());
  }

  /**
   * Execute a command with state diffing — applies surgical DOM updates
   * when the change is small, or falls back to full render for bulk changes.
   * @param {ColorCommand} command - Command to execute
   */
  #executeCommand(command) {
    this.#handlingCommand = true;
    try {
      this.#executeCommandInner(command);
    } finally {
      this.#handlingCommand = false;
    }
  }

  #executeCommandInner(command) {
    const prevFavorites = new Set(this.state.getFavoriteSet());
    const prevHidden = new Set(this.state.getHiddenSet());

    const stateChanged = command.execute();
    if (!stateChanged) return;

    const newFavorites = this.state.getFavoriteSet();
    const newHidden = this.state.getHiddenSet();

    const addedFavs = [...newFavorites.difference(prevFavorites)];
    const removedFavs = [...prevFavorites.difference(newFavorites)];
    const addedHidden = [...newHidden.difference(prevHidden)];
    const removedHidden = [...prevHidden.difference(newHidden)];

    const totalChanges =
      addedFavs.length +
      removedFavs.length +
      addedHidden.length +
      removedHidden.length;

    // Fall back to full render for bulk changes
    if (totalChanges === 0 || totalChanges > THRESHOLDS.SURGICAL_DIFF) {
      this.render();
      return;
    }

    this.view.favoriteIds = newFavorites;
    this.view.hiddenIds = newHidden;
    this.view.designerPickIds = this.model.getDesignerPickIds();

    requestAnimationFrame(() => {
      this.#applyFavoriteDiff(addedFavs, removedFavs);
      this.#applyHiddenDiff(addedHidden, removedHidden);
      this.#updateLrvCount();
    });
  }

  /**
   * Apply surgical DOM updates for favorite state changes.
   * - Toggle heart icon fill on all tile instances
   * - Add/remove tiles from the favorites section
   * @param {string[]} added - Newly favorited color IDs
   * @param {string[]} removed - Unfavorited color IDs
   */
  #applyFavoriteDiff(added, removed) {
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
   * @param {string[]} added - Newly hidden color IDs
   * @param {string[]} removed - Unhidden color IDs
   */
  #applyHiddenDiff(added, removed) {
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
        this.#updateSectionHeaderCount(sectionId);
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

      if (!favoriteSet.has(colorId) && this.#passesLrvFilter(color, lrvRange)) {
        const sections = this.model.getColorSectionIds(colorId);
        for (const sectionId of sections.familySectionIds) {
          this.view.addTileToSection(sectionId, color);
          this.#updateSectionHeaderCount(sectionId);
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
   * @param {Object} color - The color object
   * @param {{min: number, max: number}} lrvRange - Current LRV range
   * @returns {boolean} Whether the color is within the LRV range
   */
  #passesLrvFilter(color, lrvRange) {
    if (lrvRange.min === 0 && lrvRange.max === 100) return true;
    const lrv = color.lrv ?? 0;
    return lrv >= lrvRange.min && lrv <= lrvRange.max;
  }

  /**
   * Update a section header count by counting its current tiles.
   * @param {string} sectionId - The section ID
   */
  #updateSectionHeaderCount(sectionId) {
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
   */
  #updateLrvCount() {
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
      const totalActive = this.model.getActiveColors().length;
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
    this.modalController.setupListeners();
    this.lrvFilter.setup();
    this.#applyNeutralBg();
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

      this.modalController.open(colorId);
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
      this.model.getActiveColors().length,
    );

    const colorFamilies = this.model.groupByFamily(visibleColors);
    const sortedFamilies = this.model.sortFamiliesByPriority([
      ...colorFamilies.keys(),
    ]);

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
   */
  #getEventHandlerRegistry() {
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
        handler: (colorId) => this.modalController.open(colorId),
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

    const handlers = this.#getEventHandlerRegistry();

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
      exportFavBtn.addEventListener("click", () =>
        this.handleExportFavorites(),
      );
    }

    const clearFavBtn = document.getElementById(
      ELEMENT_IDS.CLEAR_FAVORITES_BTN,
    );
    if (clearFavBtn) {
      clearFavBtn.addEventListener("click", () => this.handleClearFavorites());
    }

    const clearHiddenBtn = document.getElementById(
      ELEMENT_IDS.CLEAR_HIDDEN_BTN,
    );
    if (clearHiddenBtn) {
      clearHiddenBtn.addEventListener("click", () => this.handleClearHidden());
    }

    const neutralBgBtn = document.getElementById(ELEMENT_IDS.NEUTRAL_BG_TOGGLE);
    if (neutralBgBtn) {
      neutralBgBtn.addEventListener("click", () =>
        this.state.toggleNeutralBg(),
      );
    }
  }

  /**
   * Apply or remove the neutral evaluation background based on state.
   * Toggles the body class and updates the toggle button's aria-pressed.
   */
  #applyNeutralBg() {
    const isActive = this.state.getNeutralBg();
    document.body.classList.toggle("neutral-bg", isActive);
    const btn = document.getElementById(ELEMENT_IDS.NEUTRAL_BG_TOGGLE);
    if (btn) btn.setAttribute("aria-pressed", String(isActive));
  }

  // --- EVENT HANDLERS (Delegate to Commands) ---

  handleFavoriteButton(colorId) {
    this.commandBus.execute(new ToggleFavoriteCommand(colorId));
  }

  handleHideButton(colorId) {
    this.commandBus.execute(new ToggleHiddenCommand(colorId));
  }

  async handleBulkFavoriteButton(groupId, groupName) {
    const groupColors = this.model.getFamilyColors(groupName);
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
      message: `Are you sure you want to ${action} all ${plural(count, "color")} in "${groupName}"?`,
      confirmText: allFavorited ? "Remove All" : "Add All",
      cancelText: "Cancel",
      confirmClass: allFavorited ? "btn-danger" : "btn-primary",
    });

    if (confirmed) {
      const command = new BulkFavoriteCommand(groupId, groupName, groupColors);
      this.commandBus.execute(command);

      const actionPastTense = allFavorited ? "removed from" : "added to";
      this.dialog.toast({
        message: `${plural(count, "color")} ${actionPastTense} favorites.`,
        onUndo: () => command.undo(),
      });
    }
  }

  async handleBulkHideButton(groupId, groupName) {
    const groupColors = this.model.getFamilyColors(groupName);
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
      message: `Are you sure you want to ${action} all ${plural(count, "color")} in "${groupName}"?`,
      confirmText: allHidden ? "Unhide All" : "Hide All",
      cancelText: "Cancel",
      confirmClass: allHidden ? "btn-primary" : "btn-danger",
    });

    if (confirmed) {
      const command = new BulkHideCommand(groupId, groupName, groupColors);
      this.commandBus.execute(command);

      const actionPastTense = allHidden ? "unhidden" : "hidden";
      this.dialog.toast({
        message: `${plural(count, "color")} ${actionPastTense}.`,
        onUndo: () => command.undo(),
      });
    }
  }

  handleUnhideButton(familyName) {
    if (familyName) {
      const command = new UnhideGroupCommand(familyName);
      this.commandBus.execute(command);
    }
  }

  async handleClearFavorites() {
    const count = this.state.getFavoriteSet().size;

    if (count === 0) {
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: "Clear All Favorites?",
      message: `Are you sure you want to remove all ${plural(count, "favorite color")}? This action cannot be undone.`,
      confirmText: "Clear All",
      cancelText: "Cancel",
      confirmClass: "btn-danger",
    });

    if (confirmed) {
      const command = new ClearFavoritesCommand();
      this.commandBus.execute(command);

      this.dialog.toast({
        message: `${plural(count, "favorite")} cleared.`,
        onUndo: () => command.undo(),
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
      message: `Are you sure you want to unhide all ${plural(count, "hidden color")}? They will reappear in the color list.`,
      confirmText: "Unhide All",
      cancelText: "Cancel",
      confirmClass: "btn-primary",
    });

    if (confirmed) {
      const command = new ClearHiddenCommand();
      this.commandBus.execute(command);

      this.dialog.toast({
        message: `${plural(count, "color")} unhidden.`,
        onUndo: () => command.undo(),
      });
    }
  }

  handleExportFavorites() {
    const favoriteSet = this.state.getFavoriteSet();

    if (favoriteSet.size === 0) {
      this.dialog.toast({
        message: "No favorites to export.",
        onUndo: null,
        duration: TIMING.TOAST_DURATION_MS,
      });
      return;
    }

    const favoriteColors = [];
    for (const id of favoriteSet) {
      const color = this.model.getColorById(id);
      if (color) favoriteColors.push(color);
    }

    const { count } = this.exportService.exportColors(favoriteColors);

    this.dialog.toast({
      message: `${plural(count, "favorite")} exported.`,
      onUndo: null,
      duration: TIMING.TOAST_DURATION_MS,
    });
  }
}
