/**
 * Configuration constants for the color tester application
 * Centralizes magic strings and configuration values
 */

// Section/Group prefixes for IDs
export const PREFIX = {
  FAMILY: "family",
  CATEGORY: "category",
  FAVORITES: "favorites",
  HIDDEN: "hidden",
};

// CSS class names
export const CSS_CLASSES = {
  ACCORDION: "accordion",
  ACCORDION_ITEM: "accordion-item",
  ACCORDION_HEADER: "accordion-header",
  ACCORDION_CONTENT: "accordion-content",
  ACCORDION_PANEL: "accordion-panel",
  ACCORDION_ICON: "accordion-icon",
  COLOR_TILE: "color-tile",
  COLOR_TILES_GRID: "color-tiles-grid",
  FAMILY_TILE: "family-tile",
  CATEGORY_TILE: "category-tile",
  FAVORITE_BTN: "favorite-btn",
  HIDE_BTN: "hide-btn",
  BULK_FAVORITE_BTN: "bulk-favorite-btn",
  BULK_HIDE_BTN: "bulk-hide-btn",
  BULK_ACTIONS_PANEL: "bulk-actions-panel",
  FAMILY_UNHIDE_BTN: "family-unhide-btn",
  CATEGORY_UNHIDE_BTN: "category-unhide-btn",
  EMPTY_MESSAGE: "empty-message",
};

// Element IDs
export const ELEMENT_IDS = {
  COLOR_ACCORDION: "color-accordion",
  FAVORITES_TILES: "favorites-tiles",
  HIDDEN_TILES: "hidden-tiles",
  CLEAR_FAVORITES_BTN: "clear-favorites-btn",
  CLEAR_HIDDEN_BTN: "clear-hidden-btn",
};

// Data attributes
export const DATA_ATTRIBUTES = {
  ID: "data-id",
  FAMILY: "data-family",
  CATEGORY: "data-category",
  SECTION: "data-section",
};

// URL parameter names
export const URL_PARAMS = {
  FAVORITES: "favorites",
  HIDDEN: "hidden",
};

// Common family names (for sorting priority)
export const FAMILY_ORDER = [
  "Red",
  "Orange",
  "Yellow",
  "Green",
  "Blue",
  "Purple",
  "Neutral",
];

// SVG icons as constants
export const ICONS = {
  HEART: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
  EYE_OFF: `<line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.61 3.16-4.77 5.66-6.11"/><path d="M1 1l22 22"/>`,
  EYE: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  CHEVRON_DOWN: `<path d="m6 9 6 6 6-6"/>`,
};

/**
 * Helper function to create a sanitized group ID
 * @param {string} name - The name of the group
 * @param {string} type - The type of group (family or category)
 * @returns {string} Sanitized ID string
 */
export function createGroupId(name, type) {
  return `${type}-${name
    .toLowerCase()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-z0-9-]/g, "")}`;
}

/**
 * Helper function to convert a group ID back to a display name
 * @param {string} groupId - The group ID (e.g., 'family-red-purple')
 * @returns {string} Display name (e.g., 'Red Purple')
 */
export function convertIdToName(groupId) {
  // Remove prefix
  const withoutPrefix = groupId.replace(/^(family|category)-/, "");

  // Convert to title case
  return withoutPrefix
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Helper function to get tiles container ID for a section
 * @param {string} sectionId - The section ID
 * @returns {string} The tiles container ID
 */
export function getTilesContainerId(sectionId) {
  return `${sectionId}-tiles`;
}

/**
 * Helper function to get content container ID for a section
 * @param {string} sectionId - The section ID
 * @returns {string} The content container ID
 */
export function getContentContainerId(sectionId) {
  return `${sectionId}-content`;
}
