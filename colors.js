import { colorData } from "./constants.js";
import { URLState } from "./url-parameter-utilities.js";
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
  FAMILY_ORDER,
  createGroupId,
  getTilesContainerId,
} from "./config.js";

// Color utility functions are now imported from templates.js
const { generateHSLColor, generateAccessibleText } = TemplateUtils;

// --- ACCORDION FUNCTIONS ---
// All template functions are now imported from templates.js

// Category name mapping for ID conversion
const categoryIdToName = {};
const categoryNameToId = {};

// --- RENDERING ---
function renderColors() {
  const favorites = URLState.getFavorites();
  const hidden = URLState.getHidden();
  const container = document.getElementById(ELEMENT_IDS.COLOR_ACCORDION);

  // Get all colors (excluding archived)
  const allColors = colorData.filter((c) => !c.archived);

  // Get favorite and hidden colors
  const favoriteColors = allColors.filter((c) => favorites.includes(c.id));
  const hiddenColors = allColors.filter((c) => hidden.includes(c.id));

  // Group colors by family (excluding hidden colors)
  const visibleColors = allColors.filter((c) => !hidden.includes(c.id));
  const colorFamilies = {};

  visibleColors.forEach((color) => {
    // Handle multiple color families - use the first one as primary
    const primaryFamily =
      color.colorFamilyNames && color.colorFamilyNames.length > 0
        ? color.colorFamilyNames[0]
        : "Other";

    if (!colorFamilies[primaryFamily]) {
      colorFamilies[primaryFamily] = [];
    }
    colorFamilies[primaryFamily].push(color);
  });

  // Sort families alphabetically, but put common color families first
  const sortedFamilies = Object.keys(colorFamilies).sort((a, b) => {
    const aIndex = FAMILY_ORDER.indexOf(a);
    const bIndex = FAMILY_ORDER.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  // Build accordion HTML
  let accordionHTML = "";

  // 1. Favorites section (open by default)
  const favoritesCount = favoriteColors.length;
  accordionHTML += createAccordionItem(
    "favorites",
    `Favorites${favoritesCount > 0 ? ` (${favoritesCount})` : ""}`,
    true
  );

  // 2. Hidden section
  const hiddenCount = hiddenColors.length;
  accordionHTML += createAccordionItem(
    "hidden",
    `Hidden Colors${hiddenCount > 0 ? ` (${hiddenCount})` : ""}`
  );

  // 3. Color family sections (moved before categories)
  for (const family of sortedFamilies) {
    const count = colorFamilies[family].length;
    accordionHTML += createAccordionItem(
      createGroupId(family, PREFIX.FAMILY),
      `${family} (${count})`,
      false,
      true // Show bulk actions for color families
    );
  }

  // 4. Group colors by categories (branded collections)
  const colorCategories = {};
  visibleColors.forEach((color) => {
    if (
      color.brandedCollectionNames &&
      color.brandedCollectionNames.length > 0
    ) {
      color.brandedCollectionNames.forEach((category) => {
        if (!colorCategories[category]) {
          colorCategories[category] = [];
        }
        colorCategories[category].push(color);
      });
    }
  });

  // Sort categories alphabetically
  const sortedCategories = Object.keys(colorCategories).sort();

  // 5. Color category sections (moved after families)
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

  container.innerHTML = accordionHTML;

  // Populate favorites section
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

  // Populate hidden section
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
  const hiddenFamilyNames = hiddenFamilies.map((f) => f.name);
  const hiddenCategoryNames = hiddenCategories.map((c) => c.name);
  const individualHiddenColors = hiddenColors.filter((color) => {
    // Check if color belongs to a completely hidden family
    let inHiddenFamily = false;
    if (color.colorFamilyNames && color.colorFamilyNames.length > 0) {
      const primaryFamily = color.colorFamilyNames[0];
      inHiddenFamily = hiddenFamilyNames.includes(primaryFamily);
    }

    // Check if color belongs to any completely hidden category
    let inHiddenCategory = false;
    if (
      color.brandedCollectionNames &&
      color.brandedCollectionNames.length > 0
    ) {
      inHiddenCategory = color.brandedCollectionNames.some((category) =>
        hiddenCategoryNames.includes(category)
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

  // Populate color family sections (moved before categories)
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

  // Populate color category sections (moved after families)
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

  // Add accordion functionality
  setupAccordionBehavior();

  // Attach color button event listeners
  attachColorButtonListeners();
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
          headersArray[headersArray.length - 1].focus();
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
    }
  }

  // Toggle clicked item
  if (isExpanded) {
    clickedHeader.setAttribute("aria-expanded", "false");
    content.setAttribute("aria-hidden", "true");
  } else {
    clickedHeader.setAttribute("aria-expanded", "true");
    content.setAttribute("aria-hidden", "false");
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
function convertFamilyIdToName(familyId) {
  // Convert family-red-purple to Red Purple, family-neutral to Neutral, etc.
  // Also handle category IDs using mapping
  if (familyId.startsWith("category-")) {
    // Use the mapping if available, otherwise fall back to string conversion
    if (categoryIdToName[familyId]) {
      return categoryIdToName[familyId];
    }
    return familyId
      .replace("category-", "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return familyId
    .replace("family-", "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getFamilyColors(familyName) {
  return colorData.filter((color) => {
    if (!color.colorFamilyNames || color.archived) return false;

    // Check if any of the color's families match the target family
    return color.colorFamilyNames.some(
      (family) => family.toLowerCase() === familyName.toLowerCase()
    );
  });
}

function getCategoryColors(categoryName) {
  return colorData.filter((color) => {
    if (!color.brandedCollectionNames || color.archived) return false;

    // Check if any of the color's categories match the target category
    return color.brandedCollectionNames.some(
      (category) => category.toLowerCase() === categoryName.toLowerCase()
    );
  });
}

function getColorsForId(id) {
  // Handle both family and category IDs
  if (id.startsWith("family-")) {
    const familyName = convertFamilyIdToName(id);
    return getFamilyColors(familyName);
  } else if (id.startsWith("category-")) {
    const categoryName = convertFamilyIdToName(id);
    return getCategoryColors(categoryName);
  }
  return [];
}

function getHiddenFamilies() {
  const hidden = URLState.getHidden();
  const allFamilies = {};

  // Get all color families and their colors
  colorData
    .filter((c) => !c.archived)
    .forEach((color) => {
      if (color.colorFamilyNames && color.colorFamilyNames.length > 0) {
        const primaryFamily = color.colorFamilyNames[0];
        if (!allFamilies[primaryFamily]) {
          allFamilies[primaryFamily] = [];
        }
        allFamilies[primaryFamily].push(color);
      }
    });

  // Find families where ALL colors are hidden
  const hiddenFamilies = [];
  Object.keys(allFamilies).forEach((familyName) => {
    const familyColors = allFamilies[familyName];
    const allHidden =
      familyColors.length > 0 &&
      familyColors.every((color) => hidden.includes(color.id));
    if (allHidden) {
      hiddenFamilies.push({
        name: familyName,
        count: familyColors.length,
      });
    }
  });

  return hiddenFamilies;
}

function getHiddenCategories() {
  const hidden = URLState.getHidden();
  const allCategories = {};

  // Get all color categories and their colors
  colorData
    .filter((c) => !c.archived)
    .forEach((color) => {
      if (
        color.brandedCollectionNames &&
        color.brandedCollectionNames.length > 0
      ) {
        color.brandedCollectionNames.forEach((category) => {
          if (!allCategories[category]) {
            allCategories[category] = [];
          }
          allCategories[category].push(color);
        });
      }
    });

  // Find categories where ALL colors are hidden
  const hiddenCategories = [];
  Object.keys(allCategories).forEach((categoryName) => {
    const categoryColors = allCategories[categoryName];
    const allHidden =
      categoryColors.length > 0 &&
      categoryColors.every((color) => hidden.includes(color.id));

    if (allHidden) {
      hiddenCategories.push({
        name: categoryName,
        count: categoryColors.length,
      });
    }
  });

  return hiddenCategories;
}

// --- EVENT LISTENER UTILITIES ---
/**
 * Creates a simple button event handler that prevents event propagation
 * @param {string} selector - CSS selector for buttons
 * @param {string} dataAttribute - Data attribute to read from button
 * @param {Function} callback - Function to call with the attribute value
 */
function createSimpleButtonHandler(cssClass, dataAttribute, callback) {
  for (const btn of document.querySelectorAll(`.${cssClass}`)) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const value = btn.getAttribute(dataAttribute);
      callback(value);
      renderColors();
    });
  }
}

/**
 * Creates a bulk action button handler for family/category operations
 * @param {string} selector - CSS selector for buttons
 * @param {string} dataAttribute - Data attribute to read from button
 * @param {Function} getCurrentState - Function that returns current state array
 * @param {Function} addMultiple - Function to add multiple items
 * @param {Function} removeMultiple - Function to remove multiple items
 */
function createBulkActionHandler(
  cssClass,
  dataAttribute,
  getCurrentState,
  addMultiple,
  removeMultiple
) {
  for (const btn of document.querySelectorAll(`.${cssClass}`)) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const groupId = btn.getAttribute(dataAttribute);
      const groupColors = getColorsForId(groupId);
      const currentState = getCurrentState();

      // Check if all colors are already in the current state
      const allInState = groupColors.every((color) =>
        currentState.includes(color.id)
      );
      const colorIds = groupColors.map((color) => color.id);

      if (allInState) {
        removeMultiple(colorIds);
      } else {
        addMultiple(colorIds);
      }
      renderColors();
    });
  }
}

/**
 * Creates a tile click handler with button exclusion logic
 * @param {string} selector - CSS selector for tiles
 * @param {string} dataAttribute - Data attribute to read from tile
 * @param {string} excludeButtonSelector - Selector for buttons to exclude from tile clicks
 * @param {Function} getColors - Function to get colors for the tile
 * @param {Function} unhideColors - Function to unhide the colors
 */
function createTileClickHandler(
  cssClass,
  dataAttribute,
  excludeButtonSelector,
  getColors,
  unhideColors
) {
  for (const tile of document.querySelectorAll(`.${cssClass}`)) {
    tile.addEventListener("click", (e) => {
      // Only trigger if not clicking the excluded button
      if (!e.target.closest(excludeButtonSelector)) {
        const name = tile.getAttribute(dataAttribute);
        const colors = getColors(name);
        const colorIds = colors.map((color) => color.id);
        unhideColors(colorIds);
        renderColors();
      }
    });
  }
}

// --- EVENT LISTENERS ---
function attachColorButtonListeners() {
  // Simple individual color actions
  createSimpleButtonHandler(
    CSS_CLASSES.FAVORITE_BTN,
    DATA_ATTRIBUTES.ID,
    (id) => URLState.toggleFavorite(id)
  );
  createSimpleButtonHandler(CSS_CLASSES.HIDE_BTN, DATA_ATTRIBUTES.ID, (id) =>
    URLState.toggleHidden(id)
  );

  // Bulk actions for families/categories
  createBulkActionHandler(
    CSS_CLASSES.BULK_FAVORITE_BTN,
    DATA_ATTRIBUTES.FAMILY,
    () => URLState.getFavorites(),
    (colorIds) => URLState.addMultipleFavorites(colorIds),
    (colorIds) => URLState.removeMultipleFavorites(colorIds)
  );

  createBulkActionHandler(
    CSS_CLASSES.BULK_HIDE_BTN,
    DATA_ATTRIBUTES.FAMILY,
    () => URLState.getHidden(),
    (colorIds) => URLState.addMultipleHidden(colorIds),
    (colorIds) => URLState.removeMultipleHidden(colorIds)
  );

  // Unhide button actions
  createSimpleButtonHandler(
    CSS_CLASSES.FAMILY_UNHIDE_BTN,
    DATA_ATTRIBUTES.FAMILY,
    (familyName) => {
      const familyColors = getFamilyColors(familyName);
      const colorIds = familyColors.map((color) => color.id);
      URLState.removeMultipleHidden(colorIds);
    }
  );

  createSimpleButtonHandler(
    CSS_CLASSES.CATEGORY_UNHIDE_BTN,
    DATA_ATTRIBUTES.CATEGORY,
    (categoryName) => {
      const categoryColors = getCategoryColors(categoryName);
      const colorIds = categoryColors.map((color) => color.id);
      URLState.removeMultipleHidden(colorIds);
    }
  );

  // Tile click handlers for unhiding
  createTileClickHandler(
    CSS_CLASSES.FAMILY_TILE,
    DATA_ATTRIBUTES.FAMILY,
    `.${CSS_CLASSES.FAMILY_UNHIDE_BTN}`,
    getFamilyColors,
    URLState.removeMultipleHidden
  );

  createTileClickHandler(
    CSS_CLASSES.CATEGORY_TILE,
    DATA_ATTRIBUTES.CATEGORY,
    `.${CSS_CLASSES.CATEGORY_UNHIDE_BTN}`,
    getCategoryColors,
    URLState.removeMultipleHidden
  );
}

// --- INITIALIZE ---
renderColors();
const clearFavBtn = document.getElementById(ELEMENT_IDS.CLEAR_FAVORITES_BTN);
if (clearFavBtn) {
  clearFavBtn.addEventListener("click", () => {
    URLState.clearFavorites();
    renderColors();
  });
}
const clearHiddenBtn = document.getElementById(ELEMENT_IDS.CLEAR_HIDDEN_BTN);
if (clearHiddenBtn) {
  clearHiddenBtn.addEventListener("click", () => {
    URLState.clearHidden();
    renderColors();
  });
}
