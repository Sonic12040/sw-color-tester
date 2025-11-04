import { colorData } from "./constants.js";
import { URLState } from "./url-parameter-utilities.js";
import {
  createAccordionItem,
  colorTemplate,
  familyTileTemplate,
  categoryTileTemplate,
  TemplateUtils,
} from "./templates.js";

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
  const container = document.getElementById("color-accordion");

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
  const familyOrder = [
    "Red",
    "Orange",
    "Yellow",
    "Green",
    "Blue",
    "Purple",
    "Neutral",
  ];
  const sortedFamilies = Object.keys(colorFamilies).sort((a, b) => {
    const aIndex = familyOrder.indexOf(a);
    const bIndex = familyOrder.indexOf(b);

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
  sortedFamilies.forEach((family) => {
    const count = colorFamilies[family].length;
    accordionHTML += createAccordionItem(
      `family-${family.toLowerCase().replace(/\s+/g, "-")}`,
      `${family} (${count})`,
      false,
      true // Show bulk actions for color families
    );
  });

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
  sortedCategories.forEach((category) => {
    const count = colorCategories[category].length;
    const categoryId = `category-${category
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")}`;

    // Store mapping for later use
    categoryIdToName[categoryId] = category;
    categoryNameToId[category] = categoryId;

    accordionHTML += createAccordionItem(
      categoryId,
      `${category} Collection (${count})`,
      false,
      true // Show bulk actions for color categories
    );
  });

  container.innerHTML = accordionHTML;

  // Populate favorites section
  const favoritesContainer = document.getElementById("favorites-tiles");
  if (favoriteColors.length > 0) {
    favoriteColors.forEach((color) => {
      favoritesContainer.insertAdjacentHTML("beforeend", colorTemplate(color));
    });
  } else {
    favoritesContainer.innerHTML =
      '<div class="empty-message">No favorite colors yet. Click the heart icon on any color to add it to your favorites.</div>';
  }

  // Populate hidden section
  const hiddenContainer = document.getElementById("hidden-tiles");
  hiddenContainer.innerHTML = ""; // Clear existing hidden tiles
  const hiddenFamilies = getHiddenFamilies();
  const hiddenCategories = getHiddenCategories();

  // Add hidden family tiles first
  hiddenFamilies.forEach((family) => {
    hiddenContainer.insertAdjacentHTML(
      "beforeend",
      familyTileTemplate(family.name, family.count)
    );
  });

  // Add hidden category tiles
  hiddenCategories.forEach((category) => {
    hiddenContainer.insertAdjacentHTML(
      "beforeend",
      categoryTileTemplate(category.name, category.count)
    );
  });

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

  individualHiddenColors.forEach((color) => {
    hiddenContainer.insertAdjacentHTML("beforeend", colorTemplate(color));
  });

  if (
    hiddenFamilies.length === 0 &&
    hiddenCategories.length === 0 &&
    individualHiddenColors.length === 0
  ) {
    hiddenContainer.innerHTML =
      '<div class="empty-message">No hidden colors. Click the eye icon on any color to hide it.</div>';
  }

  // Populate color family sections (moved before categories)
  sortedFamilies.forEach((family) => {
    const familyId = `family-${family.toLowerCase().replace(/\s+/g, "-")}`;
    const familyContainer = document.getElementById(`${familyId}-tiles`);
    const familyColors = colorFamilies[family];

    familyColors.forEach((color) => {
      familyContainer.insertAdjacentHTML("beforeend", colorTemplate(color));
    });
  });

  // Populate color category sections (moved after families)
  sortedCategories.forEach((category) => {
    const categoryId = `category-${category
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")}`;
    const categoryContainer = document.getElementById(`${categoryId}-tiles`);
    const categoryColors = colorCategories[category];

    categoryColors.forEach((color) => {
      categoryContainer.insertAdjacentHTML("beforeend", colorTemplate(color));
    });
  });

  // Add accordion functionality
  setupAccordionBehavior();

  // Attach color button event listeners
  attachColorButtonListeners();
}

// --- ACCORDION BEHAVIOR ---
function setupAccordionBehavior() {
  const headers = document.querySelectorAll(".accordion-header");

  headers.forEach((header, index) => {
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
          focusNextHeader(headers, index);
          break;
        case "ArrowUp":
          e.preventDefault();
          focusPreviousHeader(headers, index);
          break;
        case "Home":
          e.preventDefault();
          headers[0].focus();
          break;
        case "End":
          e.preventDefault();
          headers[headers.length - 1].focus();
          break;
      }
    });
  });
}

function toggleAccordionItem(clickedHeader) {
  const isExpanded = clickedHeader.getAttribute("aria-expanded") === "true";
  const content = document.getElementById(
    clickedHeader.getAttribute("aria-controls")
  );

  // Close all other accordion items
  document.querySelectorAll(".accordion-header").forEach((header) => {
    if (header !== clickedHeader) {
      header.setAttribute("aria-expanded", "false");
      const otherContent = document.getElementById(
        header.getAttribute("aria-controls")
      );
      otherContent.setAttribute("aria-hidden", "true");
    }
  });

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

// --- EVENT LISTENERS ---
function attachColorButtonListeners() {
  // Attach favorite button listeners
  document.querySelectorAll(".favorite-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent accordion toggle
      const id = btn.getAttribute("data-id");
      URLState.toggleFavorite(id);
      renderColors();
    });
  });

  // Attach hide button listeners
  document.querySelectorAll(".hide-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent accordion toggle
      const id = btn.getAttribute("data-id");
      URLState.toggleHidden(id);
      renderColors();
    });
  });

  // Attach bulk favorite button listeners
  document.querySelectorAll(".bulk-favorite-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent accordion toggle
      const groupId = btn.getAttribute("data-family");

      // Get all colors in this group (family or category)
      const groupColors = getColorsForId(groupId);
      const favs = URLState.getFavorites();

      // Check if all colors are already favorited
      const allFavorited = groupColors.every((color) =>
        favs.includes(color.id)
      );

      if (allFavorited) {
        // Remove all colors in this group from favorites
        groupColors.forEach((color) => {
          URLState.removeFavorite(color.id);
        });
      } else {
        // Add all colors in this group to favorites
        groupColors.forEach((color) => {
          URLState.addFavorite(color.id);
        });
      }
      renderColors();
    });
  });

  // Attach bulk hide button listeners
  document.querySelectorAll(".bulk-hide-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent accordion toggle
      const groupId = btn.getAttribute("data-family");

      // Get all colors in this group (family or category)
      const groupColors = getColorsForId(groupId);
      const hidden = URLState.getHidden();

      // Check if all colors are already hidden
      const allHidden = groupColors.every((color) => hidden.includes(color.id));

      if (allHidden) {
        // Remove all colors in this group from hidden
        groupColors.forEach((color) => {
          URLState.removeHidden(color.id);
        });
      } else {
        // Add all colors in this group to hidden
        groupColors.forEach((color) => {
          URLState.addHidden(color.id);
        });
      }
      renderColors();
    });
  });

  // Attach family unhide button listeners
  document.querySelectorAll(".family-unhide-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent any parent event
      const familyName = btn.getAttribute("data-family");

      // Get all colors in this family and unhide them
      const familyColors = getFamilyColors(familyName);

      // Remove all colors in this family from hidden
      familyColors.forEach((color) => {
        URLState.removeHidden(color.id);
      });
      renderColors();
    });
  });

  // Also make family tiles clickable to unhide
  document.querySelectorAll(".family-tile").forEach((tile) => {
    tile.addEventListener("click", (e) => {
      // Only trigger if not clicking the button
      if (!e.target.closest(".family-unhide-btn")) {
        const familyName = tile.getAttribute("data-family");

        // Get all colors in this family and unhide them
        const familyColors = getFamilyColors(familyName);

        // Remove all colors in this family from hidden
        familyColors.forEach((color) => {
          URLState.removeHidden(color.id);
        });
        renderColors();
      }
    });
  });

  // Attach category unhide button listeners
  document.querySelectorAll(".category-unhide-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent any parent event
      const categoryName = btn.getAttribute("data-category");

      // Get all colors in this category and unhide them
      const categoryColors = getCategoryColors(categoryName);

      // Remove all colors in this category from hidden
      categoryColors.forEach((color) => {
        URLState.removeHidden(color.id);
      });
      renderColors();
    });
  });

  // Also make category tiles clickable to unhide
  document.querySelectorAll(".category-tile").forEach((tile) => {
    tile.addEventListener("click", (e) => {
      // Only trigger if not clicking the button
      if (!e.target.closest(".category-unhide-btn")) {
        const categoryName = tile.getAttribute("data-category");

        // Get all colors in this category and unhide them
        const categoryColors = getCategoryColors(categoryName);

        // Remove all colors in this category from hidden
        categoryColors.forEach((color) => {
          URLState.removeHidden(color.id);
        });
        renderColors();
      }
    });
  });
}

// --- INITIALIZE ---
renderColors();
const clearFavBtn = document.getElementById("clear-favorites-btn");
if (clearFavBtn) {
  clearFavBtn.addEventListener("click", () => {
    URLState.clearFavorites();
    renderColors();
  });
}
const clearHiddenBtn = document.getElementById("clear-hidden-btn");
if (clearHiddenBtn) {
  clearHiddenBtn.addEventListener("click", () => {
    URLState.clearHidden();
    renderColors();
  });
}
