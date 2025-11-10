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

// CSS class names (BEM Convention: block__element--modifier)
export const CSS_CLASSES = {
  // Header
  HEADER: "header",
  HEADER_ACTIONS: "header__actions",
  HEADER_BUTTON: "header__button",

  // Accordion
  ACCORDION: "accordion",
  ACCORDION_ITEM: "accordion__item",
  ACCORDION_HEADER: "accordion__header",
  ACCORDION_CONTENT: "accordion__content",
  ACCORDION_PANEL: "accordion__panel",
  ACCORDION_ICON: "accordion__icon",

  // Color Tiles
  COLOR_TILE: "color-tile",
  COLOR_TILE_ACTIONS: "color-tile__actions",
  COLOR_TILE_BUTTON: "color-tile__button",
  COLOR_TILE_FAVORITE_BUTTON: "color-tile__favorite-button",
  COLOR_TILE_HIDE_BUTTON: "color-tile__hide-button",
  COLOR_TILE_UNHIDE_BUTTON: "color-tile__unhide-button",
  COLOR_TILE_VIEW_BUTTON: "color-tile__view-button",
  COLOR_TILE_INFO: "color-tile__info",
  COLOR_TILE_NAME: "color-tile__name",
  COLOR_TILE_NUMBER: "color-tile__number",
  COLOR_TILE_LRV_CONTAINER: "color-tile__lrv-container",
  COLOR_TILE_LRV: "color-tile__lrv",
  COLOR_TILE_LRV_LABEL: "color-tile__lrv-label",
  COLOR_TILE_LRV_VALUE: "color-tile__lrv-value",
  COLOR_TILE_DETAILS: "color-tile__details",
  COLOR_TILE_HEX: "color-tile__hex",
  COLOR_TILE_RGB: "color-tile__rgb",
  COLOR_TILE_BADGES: "color-tile__badges",
  COLOR_TILE_BADGE: "color-tile__badge",
  COLOR_TILE_BADGE_INTERIOR: "color-tile__badge--interior",
  COLOR_TILE_BADGE_EXTERIOR: "color-tile__badge--exterior",
  COLOR_TILE_BADGE_BOTH: "color-tile__badge--both",
  COLOR_TILE_FAMILY: "color-tile--family",
  COLOR_TILE_CATEGORY: "color-tile--category",
  COLOR_TILE_COUNT: "color-tile__count",
  COLOR_TILE_ICON_OVERLAY: "color-tile__icon-overlay",
  COLOR_TILES_GRID: "color-tiles__grid",

  // Bulk Actions
  BULK_ACTIONS_PANEL: "bulk-actions-panel",
  BULK_ACTIONS_PANEL_CONTAINER: "bulk-actions-panel__container",
  BULK_ACTIONS_PANEL_LABEL: "bulk-actions-panel__label",
  BULK_ACTIONS_FAVORITE_BUTTON: "bulk-actions__favorite-button",
  BULK_ACTIONS_HIDE_BUTTON: "bulk-actions__hide-button",

  // Empty State
  EMPTY_MESSAGE: "empty-message",

  // Modal
  MODAL_OVERLAY: "modal-overlay",
  MODAL_CONTAINER: "modal-container",
  MODAL_HEADER: "modal-header",
  MODAL_HEADER_CONTENT: "modal-header__content",
  MODAL_TITLE: "modal__title",
  MODAL_SUBTITLE: "modal__subtitle",
  MODAL_DESCRIPTION: "modal__description",
  MODAL_CLOSE: "modal__close",
  MODAL_BODY: "modal__body",
  MODAL_SECTION: "modal__section",
  MODAL_SECTION_TITLE: "modal__section-title",
  MODAL_INFO_GRID: "modal__info-grid",
  MODAL_INFO_ITEM: "modal__info-item",
  MODAL_INFO_LABEL: "modal__info-label",
  MODAL_INFO_VALUE: "modal__info-value",
  MODAL_COLOR_GRID: "modal__color-grid",
  MODAL_MINI_TILE: "modal__mini-tile",
  MODAL_MINI_TILE_NAME: "modal__mini-tile-name",
  MODAL_MINI_TILE_NUMBER: "modal__mini-tile-number",
  MODAL_MINI_TILE_ROLE: "modal__mini-tile-role",
  MODAL_SECTION_DESCRIPTION: "modal__section-description",
  MODAL_MOOD: "modal__mood",
  MODAL_MOOD_LABEL: "modal__mood-label",
  MODAL_MOOD_DESCRIPTION: "modal__mood-description",
  MODAL_DECISION_SUPPORT: "modal__decision-support",
  MODAL_LRV_CONTEXT: "modal__lrv-context",
  MODAL_LRV_LABEL: "modal__lrv-label",
  MODAL_LRV_DESCRIPTION: "modal__lrv-description",
  MODAL_BEST_FOR: "modal__best-for",
  MODAL_LABEL: "modal__label",
  MODAL_VALUE: "modal__value",
  MODAL_ACCORDION_TRIGGER: "modal__accordion-trigger",
  MODAL_ACCORDION_TITLE: "modal__accordion-title",
  MODAL_ACCORDION_HINT: "modal__accordion-hint",
  MODAL_ACCORDION_ICON: "modal__accordion-icon",
  MODAL_ACCORDION_PANEL: "modal__accordion-panel",
  MODAL_ACTIONS: "modal__actions",
  MODAL_ACTIONS_HINT: "modal__actions-hint",
};

// Element IDs
export const ELEMENT_IDS = {
  COLOR_ACCORDION: "color-accordion",
  FAVORITES_TILES: "favorites-tiles",
  HIDDEN_TILES: "hidden-tiles",
  EXPORT_FAVORITES_BTN: "export-favorites-btn",
  CLEAR_FAVORITES_BTN: "clear-favorites-btn",
  CLEAR_HIDDEN_BTN: "clear-hidden-btn",
};

// Data attributes
export const DATA_ATTRIBUTES = {
  ID: "data-id",
  FAMILY: "data-family",
  CATEGORY: "data-category",
  SECTION: "data-section",
  NAME: "data-name",
};

// URL parameter names
export const URL_PARAMS = {
  FAVORITES: "favorites",
  HIDDEN: "hidden",
  SCROLL: "scroll",
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
  COPY: `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,
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
    .replaceAll(/[^a-z0-9-]/g, "")
    .replaceAll(/-+/g, "-")}`;
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
    .filter((word) => word.length > 0) // Remove empty strings from consecutive hyphens
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
