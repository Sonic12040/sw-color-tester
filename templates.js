// templates.js
// HTML template functions for the color tester application

import { URLState } from "./url-parameter-utilities.js";
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
    <div class="${CSS_CLASSES.BULK_ACTIONS_PANEL}" style="margin-bottom: 16px; padding: 12px; background: #f9f9f9; border-radius: 6px; border: 1px solid #e0e0e0;">
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="font-weight: 500; color: #333;">Family Actions:</span>
        <button 
          class="${CSS_CLASSES.BULK_FAVORITE_BTN}" 
          ${DATA_ATTRIBUTES.FAMILY}="${id}"
          style="display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #ddd; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;"
          title="Favorite all colors in this family"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${ICONS.HEART}
          </svg>
          <span>Favorite All</span>
        </button>
        <button 
          class="${CSS_CLASSES.BULK_HIDE_BTN}" 
          ${DATA_ATTRIBUTES.FAMILY}="${id}"
          style="display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #ddd; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;"
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
 * @returns {string} HTML string for the color tile
 */
export function colorTemplate(color, options = {}) {
  const { showFavoriteButton = true, showHideButton = true } = options;
  const favorites = URLState.getFavorites();
  const hidden = URLState.getHidden();

  const isFavorited = favorites.includes(color.id);
  const isHidden = hidden.includes(color.id);
  const textColor = generateAccessibleText(color);

  const favoriteLabel = isFavorited ? "Unfavorite" : "Favorite";
  const favoriteFill = isFavorited ? textColor : "none";
  const hideLabel = isHidden ? "Unhide" : "Hide";

  // Build button HTML conditionally
  const favoriteButtonHTML = showFavoriteButton
    ? `
    <button aria-label="${favoriteLabel} color" 
            class="${CSS_CLASSES.FAVORITE_BTN}" 
            ${DATA_ATTRIBUTES.ID}="${color.id}" 
            style="background:none;border:none;cursor:pointer;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="${favoriteFill}" stroke="${textColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        ${ICONS.HEART}
      </svg>
    </button>
  `
    : "";

  const hideButtonHTML = showHideButton
    ? `
    <button aria-label="${hideLabel} color" 
            class="${CSS_CLASSES.HIDE_BTN}" 
            ${DATA_ATTRIBUTES.ID}="${color.id}" 
            style="background:none;border:none;cursor:pointer;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${textColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        ${ICONS.EYE_OFF}
      </svg>
    </button>
  `
    : "";

  return `
    <div class="${CSS_CLASSES.COLOR_TILE}" aria-label="${
    color.name
  }" style="position: relative; background: ${generateHSLColor(
    color.hue,
    color.saturation,
    color.lightness
  )}; color: ${textColor}">
      <div style="position:absolute;top:8px;right:8px;display:flex;gap:8px;">
        ${favoriteButtonHTML}
        ${hideButtonHTML}
      </div>
      <div style="position:absolute;bottom:8px;left:8px;color:${textColor};font-size:1.2em;">
        <strong>${color.name}</strong><br/>
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
  return `
    <div class="${CSS_CLASSES.COLOR_TILE} ${CSS_CLASSES.FAMILY_TILE}" aria-label="Unhide ${familyName} family" 
         style="position: relative; background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; cursor: pointer; border: 2px dashed rgba(255,255,255,0.3);"
         ${DATA_ATTRIBUTES.FAMILY}="${familyName}">
      <div style="position:absolute;top:8px;right:8px;">
        <button aria-label="Unhide all ${familyName} colors" class="${CSS_CLASSES.FAMILY_UNHIDE_BTN}" ${DATA_ATTRIBUTES.FAMILY}="${familyName}" 
                style="background:none;border:none;cursor:pointer;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            ${ICONS.EYE}
          </svg>
        </button>
      </div>
      <div style="position:absolute;bottom:8px;left:8px;color:white;font-size:1.2em;">
        <strong>${familyName} Family</strong><br/>
        <span style="font-size:0.9em;opacity:0.8;">${colorCount} colors hidden</span>
      </div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.3;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          ${ICONS.EYE_OFF}
        </svg>
      </div>
    </div>
  `;
}

/**
 * Creates a category tile template for showing hidden color categories
 * @param {string} categoryName - The name of the color category
 * @param {number} colorCount - The number of hidden colors in the category
 * @returns {string} HTML string for the category tile
 */
export function categoryTileTemplate(categoryName, colorCount) {
  return `
    <div class="${CSS_CLASSES.COLOR_TILE} ${CSS_CLASSES.CATEGORY_TILE}" aria-label="Unhide ${categoryName} collection" 
         style="position: relative; background: linear-gradient(135deg, #8e44ad 0%, #6c3483 100%); color: white; cursor: pointer; border: 2px dashed rgba(255,255,255,0.3);"
         ${DATA_ATTRIBUTES.CATEGORY}="${categoryName}">
      <div style="position:absolute;top:8px;right:8px;">
        <button aria-label="Unhide all ${categoryName} colors" class="${CSS_CLASSES.CATEGORY_UNHIDE_BTN}" ${DATA_ATTRIBUTES.CATEGORY}="${categoryName}" 
                style="background:none;border:none;cursor:pointer;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            ${ICONS.EYE}
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

/**
 * Template utility functions that can be exported if needed separately
 */
export const TemplateUtils = {
  generateHSLColor,
  generateAccessibleText,
};
