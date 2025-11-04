import { colorData } from "./constants.js";

function getFavoritesFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const favs = params.get("favorites");
  return favs ? favs.split(",") : [];
}

function getHiddenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const hidden = params.get("hidden");
  return hidden ? hidden.split(",") : [];
}

function setFavoritesToUrl(favorites) {
  const params = new URLSearchParams(window.location.search);
  if (favorites.length) {
    params.set("favorites", favorites.join(","));
  } else {
    params.delete("favorites");
  }
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

function setHiddenToUrl(hidden) {
  const params = new URLSearchParams(window.location.search);
  if (hidden.length) {
    params.set("hidden", hidden.join(","));
  } else {
    params.delete("hidden");
  }
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

function generateHSLColor(hue, saturation, lightness) {
  return `hsl(${hue * 360}deg ${saturation * 100}% ${lightness * 100}%)`;
}

function generateAccessibleText(color) {
  if (color.isDark) {
    return "white";
  }
  return "black";
}

// --- ACCORDION FUNCTIONS ---
function createAccordionItem(
  id,
  title,
  isOpen = false,
  showBulkActions = false
) {
  const bulkActionsHTML = showBulkActions
    ? `
    <div class="bulk-actions-panel" style="margin-bottom: 16px; padding: 12px; background: #f9f9f9; border-radius: 6px; border: 1px solid #e0e0e0;">
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="font-weight: 500; color: #333;">Family Actions:</span>
        <button 
          class="bulk-favorite-btn" 
          data-family="${id}"
          style="display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #ddd; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;"
          title="Favorite all colors in this family"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>Favorite All</span>
        </button>
        <button 
          class="bulk-hide-btn" 
          data-family="${id}"
          style="display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #ddd; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;"
          title="Hide all colors in this family"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.61 3.16-4.77 5.66-6.11"/>
            <path d="M1 1l22 22"/>
          </svg>
          <span>Hide All</span>
        </button>
      </div>
    </div>
  `
    : "";

  return `
    <div class="accordion-item">
      <button 
        class="accordion-header" 
        aria-expanded="${isOpen}" 
        aria-controls="${id}-content"
        id="${id}-header"
        data-section="${id}"
      >
        <span>${title}</span>
        <svg class="accordion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      <div 
        class="accordion-content" 
        id="${id}-content"
        aria-labelledby="${id}-header"
        aria-hidden="${!isOpen}"
        role="region"
      >
        <div class="accordion-panel">
          ${bulkActionsHTML}
          <div id="${id}-tiles" class="color-tiles-grid"></div>
        </div>
      </div>
    </div>
  `;
}

function colorTemplate(color) {
  const favorites = getFavoritesFromUrl();
  const hidden = getHiddenFromUrl();

  return `
    <div class="color-tile" aria-label="${
      color.name
    }" style="position: relative; background: ${generateHSLColor(
    color.hue,
    color.saturation,
    color.lightness
  )}; color: ${generateAccessibleText(color)}">
      <div style="position:absolute;top:8px;right:8px;display:flex;gap:8px;">
        <button aria-label="${
          favorites.includes(color.id) ? "Unfavorite" : "Favorite"
        } color" class="favorite-btn" data-id="${
    color.id
  }" style="background:none;border:none;cursor:pointer;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="${
            favorites.includes(color.id)
              ? generateAccessibleText(color)
              : "none"
          }" stroke="${generateAccessibleText(
    color
  )}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button aria-label="${
          hidden.includes(color.id) ? "Unhide" : "Hide"
        } color" class="hide-btn" data-id="${
    color.id
  }" style="background:none;border:none;cursor:pointer;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${generateAccessibleText(
            color
          )}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.61 3.16-4.77 5.66-6.11"/><path d="M1 1l22 22"/></svg>
        </button>
      </div>
      <div style="position:absolute;bottom:8px;left:8px;color:${generateAccessibleText(
        color
      )};font-size:1.2em;">
        <strong>${color.name}</strong><br/>
      </div>
    </div>
  `;
}

function familyTileTemplate(familyName, colorCount) {
  return `
    <div class="color-tile family-tile" aria-label="Unhide ${familyName} family" 
         style="position: relative; background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; cursor: pointer; border: 2px dashed rgba(255,255,255,0.3);"
         data-family="${familyName}">
      <div style="position:absolute;top:8px;right:8px;">
        <button aria-label="Unhide all ${familyName} colors" class="family-unhide-btn" data-family="${familyName}" 
                style="background:none;border:none;cursor:pointer;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>
      <div style="position:absolute;bottom:8px;left:8px;color:white;font-size:1.2em;">
        <strong>${familyName} Family</strong><br/>
        <span style="font-size:0.9em;opacity:0.8;">${colorCount} colors hidden</span>
      </div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.3;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.61 3.16-4.77 5.66-6.11"/>
          <path d="M1 1l22 22"/>
        </svg>
      </div>
    </div>
  `;
}

function categoryTileTemplate(categoryName, colorCount) {
  return `
    <div class="color-tile category-tile" aria-label="Unhide ${categoryName} collection" 
         style="position: relative; background: linear-gradient(135deg, #8e44ad 0%, #6c3483 100%); color: white; cursor: pointer; border: 2px dashed rgba(255,255,255,0.3);"
         data-category="${categoryName}">
      <div style="position:absolute;top:8px;right:8px;">
        <button aria-label="Unhide all ${categoryName} colors" class="category-unhide-btn" data-category="${categoryName}" 
                style="background:none;border:none;cursor:pointer;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>
      <div style="position:absolute;bottom:8px;left:8px;color:white;font-size:1.2em;">
        <strong>${categoryName} Collection</strong><br/>
        <span style="font-size:0.9em;opacity:0.8;">${colorCount} colors hidden</span>
      </div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.3;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6l2 4h9l-3 7H6l-2-4H2z"/>
        </svg>
      </div>
    </div>
  `;
}

// Category name mapping for ID conversion
const categoryIdToName = {};
const categoryNameToId = {};

// --- RENDERING ---
function renderColors() {
  const favorites = getFavoritesFromUrl();
  const hidden = getHiddenFromUrl();
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
  const hidden = getHiddenFromUrl();
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
  const hidden = getHiddenFromUrl();
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
      let favs = getFavoritesFromUrl();
      if (favs.includes(id)) {
        favs = favs.filter((f) => f !== id);
      } else {
        favs.push(id);
      }
      setFavoritesToUrl(favs);
      renderColors();
    });
  });

  // Attach hide button listeners
  document.querySelectorAll(".hide-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent accordion toggle
      const id = btn.getAttribute("data-id");
      let hidden = getHiddenFromUrl();
      if (hidden.includes(id)) {
        hidden = hidden.filter((h) => h !== id);
      } else {
        hidden.push(id);
      }
      setHiddenToUrl(hidden);
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
      let favs = getFavoritesFromUrl();

      // Check if all colors are already favorited
      const allFavorited = groupColors.every((color) =>
        favs.includes(color.id)
      );

      if (allFavorited) {
        // Remove all colors in this group from favorites
        groupColors.forEach((color) => {
          favs = favs.filter((f) => f !== color.id);
        });
      } else {
        // Add all colors in this group to favorites
        groupColors.forEach((color) => {
          if (!favs.includes(color.id)) {
            favs.push(color.id);
          }
        });
      }

      setFavoritesToUrl(favs);
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
      let hidden = getHiddenFromUrl();

      // Check if all colors are already hidden
      const allHidden = groupColors.every((color) => hidden.includes(color.id));

      if (allHidden) {
        // Remove all colors in this group from hidden
        groupColors.forEach((color) => {
          hidden = hidden.filter((h) => h !== color.id);
        });
      } else {
        // Add all colors in this group to hidden
        groupColors.forEach((color) => {
          if (!hidden.includes(color.id)) {
            hidden.push(color.id);
          }
        });
      }

      setHiddenToUrl(hidden);
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
      let hidden = getHiddenFromUrl();

      // Remove all colors in this family from hidden
      familyColors.forEach((color) => {
        hidden = hidden.filter((h) => h !== color.id);
      });

      setHiddenToUrl(hidden);
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
        let hidden = getHiddenFromUrl();

        // Remove all colors in this family from hidden
        familyColors.forEach((color) => {
          hidden = hidden.filter((h) => h !== color.id);
        });

        setHiddenToUrl(hidden);
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
      let hidden = getHiddenFromUrl();

      // Remove all colors in this category from hidden
      categoryColors.forEach((color) => {
        hidden = hidden.filter((h) => h !== color.id);
      });

      setHiddenToUrl(hidden);
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
        let hidden = getHiddenFromUrl();

        // Remove all colors in this category from hidden
        categoryColors.forEach((color) => {
          hidden = hidden.filter((h) => h !== color.id);
        });

        setHiddenToUrl(hidden);
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
    setFavoritesToUrl([]);
    renderColors();
  });
}
const clearHiddenBtn = document.getElementById("clear-hidden-btn");
if (clearHiddenBtn) {
  clearHiddenBtn.addEventListener("click", () => {
    setHiddenToUrl([]);
    renderColors();
  });
}
