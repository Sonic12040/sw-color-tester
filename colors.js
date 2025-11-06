import { colorData } from "./constants.js";
import { ColorModel } from "./models/ColorModel.js";
import { AppState } from "./models/AppState.js";
import {
  createAccordionItem,
  colorTemplate,
  familyTileTemplate,
  categoryTileTemplate,
  TemplateUtils,
} from "./templates.js";
import {
  PREFIX,
  CSS_CLASSES,
  ELEMENT_IDS,
  DATA_ATTRIBUTES,
  createGroupId,
  getTilesContainerId,
  convertIdToName,
} from "./config.js";

// Color utility functions are now imported from templates.js
const { generateHSLColor, generateAccessibleText } = TemplateUtils;

// Initialize Model and State
const colorModel = new ColorModel(colorData);
const appState = new AppState();

// --- ACCORDION FUNCTIONS ---
// All template functions are now imported from templates.js

// Category name mapping for ID conversion
const categoryIdToName = {};
const categoryNameToId = {};

// --- RENDERING HELPER FUNCTIONS ---

/**
 * Prepare and filter color data based on favorites and hidden status
 * @deprecated Now uses ColorModel methods directly
 */
function prepareColorData(favorites, hidden) {
  return {
    allColors: colorModel.getActiveColors(),
    favoriteColors: colorModel.getFavoriteColors(favorites),
    hiddenColors: colorModel.getHiddenColors(hidden),
    visibleColors: colorModel.getVisibleColors(hidden),
  };
}

/**
 * Group colors by their primary family
 * @deprecated Now uses ColorModel.groupByFamily
 */
function groupColorsByFamily(visibleColors) {
  return colorModel.groupByFamily(visibleColors);
}

/**
 * Sort family names by priority order, then alphabetically
 * @deprecated Now uses ColorModel.sortFamiliesByPriority
 */
function sortFamiliesByPriority(familyKeys) {
  return colorModel.sortFamiliesByPriority(familyKeys);
}

/**
 * Group colors by their branded collection categories
 * @deprecated Now uses ColorModel.groupByCategory
 */
function groupColorsByCategory(visibleColors) {
  return colorModel.groupByCategory(visibleColors);
}

/**
 * Build the complete accordion HTML structure
 */
function buildAccordionHTML(
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
  accordionHTML += createAccordionItem("favorites", favoritesTitle, true);

  // 2. Hidden section
  const hiddenTitle =
    hiddenCount > 0 ? `Hidden Colors (${hiddenCount})` : "Hidden Colors";
  accordionHTML += createAccordionItem("hidden", hiddenTitle);

  // 3. Color family sections
  for (const family of sortedFamilies) {
    const count = colorFamilies[family].length;
    accordionHTML += createAccordionItem(
      createGroupId(family, PREFIX.FAMILY),
      `${family} (${count})`,
      false,
      true // Show bulk actions for color families
    );
  }

  // 4. Color category sections
  for (const category of sortedCategories) {
    const count = colorCategories[category].length;
    const categoryId = createGroupId(category, PREFIX.CATEGORY);

    // Store mapping for later use
    categoryIdToName[categoryId] = category;
    categoryNameToId[category] = categoryId;

    accordionHTML += createAccordionItem(
      categoryId,
      `${category} Collection (${count})`,
      false,
      true // Show bulk actions for color categories
    );
  }

  return accordionHTML;
}

/**
 * Populate the favorites section with color tiles
 */
function populateFavoritesSection(favoriteColors) {
  const favoritesContainer = document.getElementById(
    ELEMENT_IDS.FAVORITES_TILES
  );

  if (favoriteColors.length > 0) {
    for (const color of favoriteColors) {
      favoritesContainer.insertAdjacentHTML(
        "beforeend",
        colorTemplate(color, { showHideButton: false })
      );
    }
  } else {
    favoritesContainer.innerHTML = `<div class="${CSS_CLASSES.EMPTY_MESSAGE}">No favorite colors yet. Click the heart icon on any color to add it to your favorites.</div>`;
  }
}

/**
 * Populate the hidden section with family tiles, category tiles, and individual colors
 */
function populateHiddenSection(hiddenColors) {
  const hiddenContainer = document.getElementById(ELEMENT_IDS.HIDDEN_TILES);
  hiddenContainer.innerHTML = ""; // Clear existing hidden tiles

  const hiddenFamilies = getHiddenFamilies();
  const hiddenCategories = getHiddenCategories();

  // Add hidden family tiles first
  for (const family of hiddenFamilies) {
    hiddenContainer.insertAdjacentHTML(
      "beforeend",
      familyTileTemplate(family.name, family.count)
    );
  }

  // Add hidden category tiles
  for (const category of hiddenCategories) {
    hiddenContainer.insertAdjacentHTML(
      "beforeend",
      categoryTileTemplate(category.name, category.count)
    );
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

  for (const color of individualHiddenColors) {
    hiddenContainer.insertAdjacentHTML(
      "beforeend",
      colorTemplate(color, { showFavoriteButton: false })
    );
  }

  if (
    hiddenFamilies.length === 0 &&
    hiddenCategories.length === 0 &&
    individualHiddenColors.length === 0
  ) {
    hiddenContainer.innerHTML = `<div class="${CSS_CLASSES.EMPTY_MESSAGE}">No hidden colors. Click the eye icon on any color to hide it.</div>`;
  }
}

/**
 * Populate all family and category sections with their color tiles
 */
function populateColorSections(
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

    for (const color of familyColors) {
      familyContainer.insertAdjacentHTML("beforeend", colorTemplate(color));
    }
  }

  // Populate color category sections
  for (const category of sortedCategories) {
    const categoryId = createGroupId(category, PREFIX.CATEGORY);
    const categoryContainer = document.getElementById(
      getTilesContainerId(categoryId)
    );
    const categoryColors = colorCategories[category];

    for (const color of categoryColors) {
      categoryContainer.insertAdjacentHTML("beforeend", colorTemplate(color));
    }
  }
}

// --- MAIN RENDERING FUNCTION ---
function renderColors() {
  const favorites = appState.getFavorites();
  const hidden = appState.getHidden();
  const container = document.getElementById(ELEMENT_IDS.COLOR_ACCORDION);

  // Prepare color data
  const { favoriteColors, hiddenColors, visibleColors } = prepareColorData(
    favorites,
    hidden
  );

  // Group and sort families
  const colorFamilies = groupColorsByFamily(visibleColors);
  const sortedFamilies = sortFamiliesByPriority(Object.keys(colorFamilies));

  // Group and sort categories
  const colorCategories = groupColorsByCategory(visibleColors);
  const sortedCategories = Object.keys(colorCategories).sort((a, b) =>
    a.localeCompare(b)
  );

  // Build and insert accordion HTML
  const accordionHTML = buildAccordionHTML(
    favoriteColors.length,
    hiddenColors.length,
    sortedFamilies,
    colorFamilies,
    sortedCategories,
    colorCategories
  );
  container.innerHTML = accordionHTML;

  // Populate all sections
  populateFavoritesSection(favoriteColors);
  populateHiddenSection(hiddenColors);
  populateColorSections(
    sortedFamilies,
    colorFamilies,
    sortedCategories,
    colorCategories
  );

  // Add accordion functionality
  setupAccordionBehavior();
}

// --- ACCORDION BEHAVIOR ---
function setupAccordionBehavior() {
  const headers = document.querySelectorAll(`.${CSS_CLASSES.ACCORDION_HEADER}`);
  const headersArray = [...headers];

  for (const [index, header] of headersArray.entries()) {
    header.addEventListener("click", () => {
      toggleAccordionItem(header);
    });

    // Keyboard support
    header.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          toggleAccordionItem(header);
          break;
        case "ArrowDown":
          e.preventDefault();
          focusNextHeader(headersArray, index);
          break;
        case "ArrowUp":
          e.preventDefault();
          focusPreviousHeader(headersArray, index);
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

function toggleAccordionItem(clickedHeader) {
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

function focusNextHeader(headers, currentIndex) {
  const nextIndex = (currentIndex + 1) % headers.length;
  headers[nextIndex].focus();
}

function focusPreviousHeader(headers, currentIndex) {
  const prevIndex = currentIndex === 0 ? headers.length - 1 : currentIndex - 1;
  headers[prevIndex].focus();
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
