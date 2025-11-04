// templates.js
// HTML template functions for the color tester application

import { URLState } from "./url-parameter-utilities.js";

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

/**
 * Creates a color tile with favorite and hide buttons
 * @param {Object} color - The color object with properties like id, name, hue, saturation, lightness, isDark
 * @returns {string} HTML string for the color tile
 */
export function colorTemplate(color) {
  const favorites = URLState.getFavorites();
  const hidden = URLState.getHidden();

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

/**
 * Creates a family tile template for showing hidden color families
 * @param {string} familyName - The name of the color family
 * @param {number} colorCount - The number of hidden colors in the family
 * @returns {string} HTML string for the family tile
 */
export function familyTileTemplate(familyName, colorCount) {
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

/**
 * Creates a category tile template for showing hidden color categories
 * @param {string} categoryName - The name of the color category
 * @param {number} colorCount - The number of hidden colors in the category
 * @returns {string} HTML string for the category tile
 */
export function categoryTileTemplate(categoryName, colorCount) {
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

/**
 * Template utility functions that can be exported if needed separately
 */
export const TemplateUtils = {
  generateHSLColor,
  generateAccessibleText,
};
