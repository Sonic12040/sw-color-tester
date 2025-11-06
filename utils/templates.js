// templates.js
// HTML template functions for the color tester application

import { CSS_CLASSES, DATA_ATTRIBUTES, ICONS } from "./config.js";

/**
 * Color utility functions for templates
 */
function generateHSLColor(hue, saturation, lightness) {
  return `hsl(${hue * 360}deg ${saturation * 100}% ${lightness * 100}%)`;
}

function generateAccessibleText(color) {
  if (color.isDark) {
    return "white";
  }
  return "black";
}

/**
 * Creates an accordion item with optional bulk actions
 * @param {string} id - The unique identifier for the accordion item
 * @param {string} title - The title text for the accordion header
 * @param {boolean} isOpen - Whether the accordion should be open by default
 * @param {boolean} showBulkActions - Whether to show bulk action buttons
 * @returns {string} HTML string for the accordion item
 */
export function createAccordionItem(
  id,
  title,
  isOpen = false,
  showBulkActions = false
) {
  const bulkActionsHTML = showBulkActions
    ? `
    <div class="${CSS_CLASSES.BULK_ACTIONS_PANEL}">
      <div class="${CSS_CLASSES.BULK_ACTIONS_PANEL_CONTAINER}">
        <span class="${CSS_CLASSES.BULK_ACTIONS_PANEL_LABEL}">Family Actions:</span>
        <button 
          class="${CSS_CLASSES.BULK_ACTIONS_FAVORITE_BUTTON}" 
          ${DATA_ATTRIBUTES.FAMILY}="${id}"
          title="Favorite all colors in this family"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${ICONS.HEART}
          </svg>
          <span>Favorite All</span>
        </button>
        <button 
          class="${CSS_CLASSES.BULK_ACTIONS_HIDE_BUTTON}" 
          ${DATA_ATTRIBUTES.FAMILY}="${id}"
          title="Hide all colors in this family"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${ICONS.EYE_OFF}
          </svg>
          <span>Hide All</span>
        </button>
      </div>
    </div>
  `
    : "";

  return `
    <div class="${CSS_CLASSES.ACCORDION_ITEM}">
      <button 
        class="${CSS_CLASSES.ACCORDION_HEADER}" 
        aria-expanded="${isOpen}" 
        aria-controls="${id}-content"
        id="${id}-header"
        ${DATA_ATTRIBUTES.SECTION}="${id}"
      >
        <span>${title}</span>
        <svg class="${
          CSS_CLASSES.ACCORDION_ICON
        }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${ICONS.CHEVRON_DOWN}
        </svg>
      </button>
      <div 
        class="${CSS_CLASSES.ACCORDION_CONTENT}" 
        id="${id}-content"
        aria-labelledby="${id}-header"
        aria-hidden="${!isOpen}"
        role="region"
        ${isOpen ? "" : "inert"}
      >
        <div class="${CSS_CLASSES.ACCORDION_PANEL}">
          ${bulkActionsHTML}
          <div id="${id}-tiles" class="${CSS_CLASSES.COLOR_TILES_GRID}"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Creates a color tile with favorite and hide buttons
 * @param {Object} color - The color object with properties like id, name, hue, saturation, lightness, isDark
 * @param {Object} options - Options for which buttons to show
 * @param {boolean} options.showFavoriteButton - Whether to show the favorite button (default: true)
 * @param {boolean} options.showHideButton - Whether to show the hide button (default: true)
 * @param {string[]} options.favoriteIds - Array of favorite color IDs (default: [])
 * @param {string[]} options.hiddenIds - Array of hidden color IDs (default: [])
 * @returns {string} HTML string for the color tile
 */
export function colorTemplate(color, options = {}) {
  const {
    showFavoriteButton = true,
    showHideButton = true,
    favoriteIds = [],
    hiddenIds = [],
  } = options;

  const isFavorited = favoriteIds.includes(color.id);
  const isHidden = hiddenIds.includes(color.id);
  const textColor = generateAccessibleText(color);

  const favoriteLabel = isFavorited ? "Unfavorite" : "Favorite";
  const favoriteFill = isFavorited ? textColor : "none";
  const hideLabel = isHidden ? "Unhide" : "Hide";

  // Build button HTML conditionally
  const favoriteButtonHTML = showFavoriteButton
    ? `
    <button aria-label="${favoriteLabel} color" 
            class="${CSS_CLASSES.COLOR_TILE_FAVORITE_BUTTON} ${CSS_CLASSES.COLOR_TILE_BUTTON}" 
            ${DATA_ATTRIBUTES.ID}="${color.id}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="${favoriteFill}" stroke="${textColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        ${ICONS.HEART}
      </svg>
    </button>
  `
    : "";

  const hideButtonHTML = showHideButton
    ? `
    <button aria-label="${hideLabel} color" 
            class="${CSS_CLASSES.COLOR_TILE_HIDE_BUTTON} ${CSS_CLASSES.COLOR_TILE_BUTTON}" 
            ${DATA_ATTRIBUTES.ID}="${color.id}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${textColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        ${ICONS.EYE_OFF}
      </svg>
    </button>
  `
    : "";

  return `
    <div class="${CSS_CLASSES.COLOR_TILE}" 
         aria-label="${color.name}" 
         style="background: ${generateHSLColor(
           color.hue,
           color.saturation,
           color.lightness
         )}; color: ${textColor}">
      <div class="${CSS_CLASSES.COLOR_TILE_ACTIONS}">
        ${favoriteButtonHTML}
        ${hideButtonHTML}
      </div>
      <div class="${CSS_CLASSES.COLOR_TILE_INFO}" style="color:${textColor};">
        <strong>${color.name}</strong><br/>
      </div>
    </div>
  `;
}

/**
 * Private helper to create a hidden group tile (family or category)
 * @private
 * @param {string} groupName - Name of the group
 * @param {number} colorCount - Number of hidden colors
 * @param {string} groupType - Either 'family' or 'category'
 * @returns {string} HTML string for the hidden group tile
 */
function createHiddenGroupTile(groupName, colorCount, groupType) {
  const isFamily = groupType === "family";
  const displayType = isFamily ? "Family" : "Collection";
  const tileClass = isFamily
    ? CSS_CLASSES.COLOR_TILE_FAMILY
    : CSS_CLASSES.COLOR_TILE_CATEGORY;
  const attribute = isFamily
    ? DATA_ATTRIBUTES.FAMILY
    : DATA_ATTRIBUTES.CATEGORY;
  const ariaLabel = isFamily
    ? `${groupName} family`
    : `${groupName} collection`;
  const overlayIcon = isFamily
    ? ICONS.EYE_OFF
    : '<path d="M2 3h6l2 4h9l-3 7H6l-2-4H2z"/>';

  return `
    <div class="${CSS_CLASSES.COLOR_TILE} ${tileClass}" 
         aria-label="Unhide ${ariaLabel}" 
         ${attribute}="${groupName}">
      <div class="${CSS_CLASSES.COLOR_TILE_ACTIONS}">
        <button aria-label="Unhide all ${groupName} colors" 
                class="${CSS_CLASSES.COLOR_TILE_UNHIDE_BUTTON} ${CSS_CLASSES.COLOR_TILE_BUTTON}" 
                ${attribute}="${groupName}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            ${ICONS.EYE}
          </svg>
        </button>
      </div>
      <div class="${CSS_CLASSES.COLOR_TILE_INFO}">
        <strong>${groupName} ${displayType}</strong><br/>
        <span class="${CSS_CLASSES.COLOR_TILE_COUNT}">${colorCount} colors hidden</span>
      </div>
      <div class="${CSS_CLASSES.COLOR_TILE_ICON_OVERLAY}">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          ${overlayIcon}
        </svg>
      </div>
    </div>
  `;
}

/**
 * Creates a family tile template for showing hidden color families
 * @param {string} familyName - The name of the color family
 * @param {number} colorCount - The number of hidden colors in the family
 * @returns {string} HTML string for the family tile
 */
export function familyTileTemplate(familyName, colorCount) {
  return createHiddenGroupTile(familyName, colorCount, "family");
}

/**
 * Creates a category tile template for showing hidden color categories
 * @param {string} categoryName - The name of the color category
 * @param {number} colorCount - The number of hidden colors in the category
 * @returns {string} HTML string for the category tile
 */
export function categoryTileTemplate(categoryName, colorCount) {
  return createHiddenGroupTile(categoryName, colorCount, "category");
}

/**
 * Template utility functions that can be exported if needed separately
 */
export const TemplateUtils = {
  generateHSLColor,
  generateAccessibleText,
};
