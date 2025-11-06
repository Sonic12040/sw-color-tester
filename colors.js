import { colorData } from "./constants.js";
import { ColorModel } from "./models/ColorModel.js";
import { AppState } from "./models/AppState.js";
import { ColorView } from "./views/ColorView.js";
import {
  CSS_CLASSES,
  ELEMENT_IDS,
  DATA_ATTRIBUTES,
  convertIdToName,
} from "./config.js";

// Initialize MVC components
const colorModel = new ColorModel(colorData);
const appState = new AppState();
const colorView = new ColorView(ELEMENT_IDS.COLOR_ACCORDION);

// --- MAIN RENDERING FUNCTION ---
function renderColors() {
  const favorites = appState.getFavorites();
  const hidden = appState.getHidden();

  // Get color data from model
  const favoriteColors = colorModel.getFavoriteColors(favorites);
  const hiddenColors = colorModel.getHiddenColors(hidden);
  const visibleColors = colorModel.getVisibleColors(hidden);

  // Group and sort
  const colorFamilies = colorModel.groupByFamily(visibleColors);
  const sortedFamilies = colorModel.sortFamiliesByPriority(
    Object.keys(colorFamilies)
  );

  const colorCategories = colorModel.groupByCategory(visibleColors);
  const sortedCategories = Object.keys(colorCategories).sort((a, b) =>
    a.localeCompare(b)
  );

  // Get hidden groups
  const hiddenFamilies = colorModel.getHiddenFamilies(hidden);
  const hiddenCategories = colorModel.getHiddenCategories(hidden);

  // Render via view
  colorView.render({
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

// --- HELPER FUNCTIONS ---
// Now delegating to ColorModel

function getFamilyColors(familyName) {
  return colorModel.getFamilyColors(familyName);
}

function getCategoryColors(categoryName) {
  return colorModel.getCategoryColors(categoryName);
}

function getColorsForId(id) {
  return colorModel.getColorsForId(id, convertIdToName);
}

function getHiddenFamilies() {
  return colorModel.getHiddenFamilies(appState.getHidden());
}

function getHiddenCategories() {
  return colorModel.getHiddenCategories(appState.getHidden());
}

// --- EVENT DELEGATION ---

// Handler for individual color favorite button
function handleFavoriteButton(colorId) {
  appState.toggleFavorite(colorId);
  renderColors();
}

// Handler for individual color hide button
function handleHideButton(colorId) {
  appState.toggleHidden(colorId);
  renderColors();
}

// Handler for bulk favorite button (family/category)
function handleBulkFavoriteButton(groupId) {
  const groupColors = getColorsForId(groupId);
  const favorites = appState.getFavorites();

  // Check if all colors are already favorited
  const allFavorited = groupColors.every((color) =>
    favorites.includes(color.id)
  );
  const colorIds = groupColors.map((color) => color.id);

  if (allFavorited) {
    appState.removeMultipleFavorites(colorIds);
  } else {
    appState.addMultipleFavorites(colorIds);
  }
  renderColors();
}

// Handler for bulk hide button (family/category)
function handleBulkHideButton(groupId) {
  const groupColors = getColorsForId(groupId);
  const hidden = appState.getHidden();

  // Check if all colors are already hidden
  const allHidden = groupColors.every((color) => hidden.includes(color.id));
  const colorIds = groupColors.map((color) => color.id);

  if (allHidden) {
    appState.removeMultipleHidden(colorIds);
  } else {
    appState.addMultipleHidden(colorIds);
  }
  renderColors();
}

// Handler for unhide button (both family and category tiles)
function handleUnhideButton(familyName, categoryName) {
  if (familyName) {
    const familyColors = getFamilyColors(familyName);
    const colorIds = familyColors.map((color) => color.id);
    appState.removeMultipleHidden(colorIds);
  } else if (categoryName) {
    const categoryColors = getCategoryColors(categoryName);
    const colorIds = categoryColors.map((color) => color.id);
    appState.removeMultipleHidden(colorIds);
  }
  renderColors();
}

// Handler for family tile click (unhide entire family)
function handleFamilyTileClick(familyName) {
  const familyColors = getFamilyColors(familyName);
  const colorIds = familyColors.map((color) => color.id);
  appState.removeMultipleHidden(colorIds);
  renderColors();
}

// Handler for category tile click (unhide entire category)
function handleCategoryTileClick(categoryName) {
  const categoryColors = getCategoryColors(categoryName);
  const colorIds = categoryColors.map((color) => color.id);
  appState.removeMultipleHidden(colorIds);
  renderColors();
}

/**
 * Sets up a single delegated event listener on the accordion container
 * This replaces hundreds of individual button listeners with one efficient delegated listener
 * Benefits:
 * - Massive performance improvement (1 listener instead of 100s)
 * - Works with dynamically added elements
 * - Lower memory usage
 * - Cleaner event handler management
 */
function setupEventDelegation() {
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
      handleFavoriteButton(colorId);
      return;
    }

    // Individual color hide button
    const hideBtn = e.target.closest(`.${CSS_CLASSES.COLOR_TILE_HIDE_BUTTON}`);
    if (hideBtn) {
      e.stopPropagation();
      const colorId = hideBtn.getAttribute(DATA_ATTRIBUTES.ID);
      handleHideButton(colorId);
      return;
    }

    // Bulk favorite button for family/category
    const bulkFavoriteBtn = e.target.closest(
      `.${CSS_CLASSES.BULK_ACTIONS_FAVORITE_BUTTON}`
    );
    if (bulkFavoriteBtn) {
      e.stopPropagation();
      const groupId = bulkFavoriteBtn.getAttribute(DATA_ATTRIBUTES.FAMILY);
      handleBulkFavoriteButton(groupId);
      return;
    }

    // Bulk hide button for family/category
    const bulkHideBtn = e.target.closest(
      `.${CSS_CLASSES.BULK_ACTIONS_HIDE_BUTTON}`
    );
    if (bulkHideBtn) {
      e.stopPropagation();
      const groupId = bulkHideBtn.getAttribute(DATA_ATTRIBUTES.FAMILY);
      handleBulkHideButton(groupId);
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
      handleUnhideButton(familyName, categoryName);
      return;
    }

    // Family tile click (unhide entire family)
    const familyTile = e.target.closest(`.${CSS_CLASSES.COLOR_TILE_FAMILY}`);
    if (
      familyTile &&
      !e.target.closest(`.${CSS_CLASSES.COLOR_TILE_UNHIDE_BUTTON}`)
    ) {
      const familyName = familyTile.getAttribute(DATA_ATTRIBUTES.FAMILY);
      handleFamilyTileClick(familyName);
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
      const categoryName = categoryTile.getAttribute(DATA_ATTRIBUTES.CATEGORY);
      handleCategoryTileClick(categoryName);
    }
  });
}

// --- INITIALIZE ---
// Set up event delegation once at startup (not on every render)
setupEventDelegation();

// Initial render
renderColors();

// Header button listeners (outside accordion, so not delegated)
const clearFavBtn = document.getElementById(ELEMENT_IDS.CLEAR_FAVORITES_BTN);
if (clearFavBtn) {
  clearFavBtn.addEventListener("click", () => {
    appState.clearFavorites();
    renderColors();
  });
}
const clearHiddenBtn = document.getElementById(ELEMENT_IDS.CLEAR_HIDDEN_BTN);
if (clearHiddenBtn) {
  clearHiddenBtn.addEventListener("click", () => {
    appState.clearHidden();
    renderColors();
  });
}
