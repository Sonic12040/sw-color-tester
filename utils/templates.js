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
 * @param {string} name - The original name for the group (used in bulk actions)
 * @param {boolean} isOpen - Whether the accordion should be open by default
 * @param {boolean} showBulkActions - Whether to show bulk action buttons
 * @returns {string} HTML string for the accordion item
 */
export function createAccordionItem(
  id,
  title,
  name,
  isOpen = false,
  showBulkActions = false
) {
  const bulkActionsHTML = showBulkActions
    ? `
    <div class="${CSS_CLASSES.BULK_ACTIONS_PANEL}">
      <div class="${CSS_CLASSES.BULK_ACTIONS_PANEL_CONTAINER}">
        <span class="${CSS_CLASSES.BULK_ACTIONS_PANEL_LABEL}">Family Actions:</span>
        <button 
          type="button"
          class="${CSS_CLASSES.BULK_ACTIONS_FAVORITE_BUTTON}" 
          ${DATA_ATTRIBUTES.FAMILY}="${id}"
          ${DATA_ATTRIBUTES.NAME}="${name}"
          title="Favorite all colors in this family"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${ICONS.HEART}
          </svg>
          <span>Favorite All</span>
        </button>
        <button 
          type="button"
          class="${CSS_CLASSES.BULK_ACTIONS_HIDE_BUTTON}" 
          ${DATA_ATTRIBUTES.FAMILY}="${id}"
          ${DATA_ATTRIBUTES.NAME}="${name}"
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

  // Badge colors based on isDark - switch background/foreground for contrast
  // Dark tiles: light badges, Light tiles: dark badges
  const badgeBgColor = color.isDark
    ? "rgba(255, 255, 255, 0.85)"
    : "rgba(0, 0, 0, 0.75)";
  const badgeTextColor = color.isDark
    ? "rgba(0, 0, 0, 0.9)"
    : "rgba(255, 255, 255, 0.95)";

  const favoriteLabel = isFavorited ? "Unfavorite" : "Favorite";
  const hideLabel = isHidden ? "Unhide" : "Hide";

  // Icon colors and fills based on isDark - switch for contrast with button backgrounds
  // Dark tiles: use light buttons with dark icons, Light tiles: use dark buttons with light icons
  const iconColor = color.isDark ? "rgba(0, 0, 0, 0.9)" : "white";
  const favoriteFill = isFavorited ? iconColor : "none";

  // Button background colors based on isDark
  const buttonBgColor = color.isDark
    ? "rgba(255, 255, 255, 0.85)"
    : "rgba(0, 0, 0, 0.7)";
  const buttonHoverBg = color.isDark
    ? "rgba(255, 255, 255, 0.95)"
    : "rgba(0, 0, 0, 0.85)";

  // Button text color (matches icon color)
  const buttonTextColor = iconColor;

  // Build button HTML conditionally
  const favoriteButtonHTML = showFavoriteButton
    ? `
    <button aria-label="${favoriteLabel} color" 
            class="${CSS_CLASSES.COLOR_TILE_FAVORITE_BUTTON} ${CSS_CLASSES.COLOR_TILE_BUTTON}" 
            ${DATA_ATTRIBUTES.ID}="${color.id}"
            style="--btn-bg: ${buttonBgColor}; --btn-hover-bg: ${buttonHoverBg};">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="${favoriteFill}" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        ${ICONS.HEART}
      </svg>
    </button>
  `
    : "";

  const hideButtonHTML = showHideButton
    ? `
    <button aria-label="${hideLabel} color" 
            class="${CSS_CLASSES.COLOR_TILE_HIDE_BUTTON} ${CSS_CLASSES.COLOR_TILE_BUTTON}" 
            ${DATA_ATTRIBUTES.ID}="${color.id}"
            style="--btn-bg: ${buttonBgColor}; --btn-hover-bg: ${buttonHoverBg};">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        ${ICONS.EYE_OFF}
      </svg>
    </button>
  `
    : "";

  // Build badges for interior/exterior use
  const badges = [];
  if (color.isInterior && color.isExterior) {
    badges.push(
      `<span class="${CSS_CLASSES.COLOR_TILE_BADGE} ${CSS_CLASSES.COLOR_TILE_BADGE_BOTH}" style="background: ${badgeBgColor}; color: ${badgeTextColor};">Interior & Exterior</span>`
    );
  } else if (color.isInterior) {
    badges.push(
      `<span class="${CSS_CLASSES.COLOR_TILE_BADGE} ${CSS_CLASSES.COLOR_TILE_BADGE_INTERIOR}" style="background: ${badgeBgColor}; color: ${badgeTextColor};">Interior</span>`
    );
  } else if (color.isExterior) {
    badges.push(
      `<span class="${CSS_CLASSES.COLOR_TILE_BADGE} ${CSS_CLASSES.COLOR_TILE_BADGE_EXTERIOR}" style="background: ${badgeBgColor}; color: ${badgeTextColor};">Exterior</span>`
    );
  }

  const badgesHTML =
    badges.length > 0
      ? `<div class="${CSS_CLASSES.COLOR_TILE_BADGES}">${badges.join("")}</div>`
      : "";

  // Format LRV value with plain language labels
  const lrvValue = color.lrv ? color.lrv.toFixed(1) : "N/A";
  let lrvClass = "medium";
  let lrvLabel = "Medium";
  if (color.lrv < 30) {
    lrvClass = "dark";
    lrvLabel = "Dark";
  } else if (color.lrv > 60) {
    lrvClass = "light";
    lrvLabel = "Light";
  }

  return `
    <div class="${CSS_CLASSES.COLOR_TILE}" 
         ${DATA_ATTRIBUTES.ID}="${color.id}"
         style="background: ${generateHSLColor(
           color.hue,
           color.saturation,
           color.lightness
         )}; color: ${textColor}">
      <div class="${CSS_CLASSES.COLOR_TILE_ACTIONS}">
        ${favoriteButtonHTML}
        ${hideButtonHTML}
      </div>
      ${badgesHTML}
      <div class="${CSS_CLASSES.COLOR_TILE_INFO}" style="color:${textColor};">
        <div class="${CSS_CLASSES.COLOR_TILE_NAME}">
          <strong>${color.name}</strong>
        </div>
        <div class="${CSS_CLASSES.COLOR_TILE_NUMBER}">SW ${
    color.colorNumber
  }</div>
        <div class="${CSS_CLASSES.COLOR_TILE_LRV_CONTAINER}">
          <span class="${CSS_CLASSES.COLOR_TILE_LRV} ${
    CSS_CLASSES.COLOR_TILE_LRV
  }--${lrvClass}" 
                title="Light Reflectance Value - ${lrvLabel} color reflects ${lrvValue}% of light"
                style="background: ${badgeBgColor}; color: ${badgeTextColor};">
            <span class="${CSS_CLASSES.COLOR_TILE_LRV_LABEL}">${lrvLabel}</span>
            <span class="${
              CSS_CLASSES.COLOR_TILE_LRV_VALUE
            }">LRV ${lrvValue}</span>
          </span>
        </div>
        <div class="${CSS_CLASSES.COLOR_TILE_DETAILS}">
        </div>
        <button type="button"
                aria-label="View details for ${color.name}" 
                class="${CSS_CLASSES.COLOR_TILE_VIEW_BUTTON} ${
    CSS_CLASSES.COLOR_TILE_BUTTON
  }" 
                ${DATA_ATTRIBUTES.ID}="${color.id}"
                style="--btn-bg: ${buttonBgColor}; --btn-hover-bg: ${buttonHoverBg}; --btn-text-color: ${buttonTextColor};">
          View Details
        </button>
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
 * Creates the color detail modal with coordinating and similar colors
 * @param {Object} color - The main color object
 * @param {Object} coordinatingColors - Object with coord1, coord2, and white color objects
 * @param {Array} similarColors - Array of similar color objects
 * @param {boolean} isFavorited - Whether the color is currently favorited
 * @returns {string} HTML string for the modal
 */
export function colorDetailModal(
  color,
  coordinatingColors = {},
  similarColors = [],
  isFavorited = false,
  isHidden = false
) {
  const backgroundColor = generateHSLColor(
    color.hue,
    color.saturation,
    color.lightness
  );

  // Header text color based on isDark - same pattern as other UI elements
  const headerTextColor = color.isDark ? "white" : "rgba(0, 0, 0, 0.9)";

  // Close button colors based on isDark - same pattern as other buttons
  const closeBtnBg = color.isDark
    ? "rgba(255, 255, 255, 0.85)"
    : "rgba(0, 0, 0, 0.7)";
  const closeBtnHoverBg = color.isDark
    ? "rgba(255, 255, 255, 0.95)"
    : "rgba(0, 0, 0, 0.85)";
  const closeBtnTextColor = color.isDark ? "rgba(0, 0, 0, 0.9)" : "white";

  // Coordinating color roles (assign contextual labels)
  const coordinatingRoles = ["Accent Wall", "Trim Color", "Coordinating"];

  // Similar color differentiators
  const similarDifferentiators = [
    "Warmer",
    "Cooler",
    "Lighter",
    "Darker",
    "Similar Tone",
    "Alternative",
  ];

  // Build coordinating colors section
  const coordColors = [
    coordinatingColors.coord1,
    coordinatingColors.coord2,
    coordinatingColors.white,
  ].filter(Boolean);

  const coordinatingHTML =
    coordColors.length > 0
      ? `
      <div class="${CSS_CLASSES.MODAL_SECTION} modal__section--coordinating">
        <h3 class="${CSS_CLASSES.MODAL_SECTION_TITLE}">Coordinating Colors</h3>
        <p class="${
          CSS_CLASSES.MODAL_SECTION_DESCRIPTION
        }">Colors that work beautifully together</p>
        <div class="${CSS_CLASSES.MODAL_COLOR_GRID}">
          ${coordColors
            .map((c, index) => {
              // Assign contextual roles to coordinating colors
              const role = coordinatingRoles[index] || "Coordinating";
              return `
            <div class="${CSS_CLASSES.MODAL_MINI_TILE}" 
                 style="background: ${generateHSLColor(
                   c.hue,
                   c.saturation,
                   c.lightness
                 )}; color: ${generateAccessibleText(c)};"
                 title="${c.name}">
              <div class="${CSS_CLASSES.MODAL_MINI_TILE_ROLE}">${role}</div>
              <div class="${CSS_CLASSES.MODAL_MINI_TILE_NAME}">${c.name}</div>
              <div class="${CSS_CLASSES.MODAL_MINI_TILE_NUMBER}">SW ${
                c.colorNumber
              }</div>
            </div>
          `;
            })
            .join("")}
        </div>
      </div>
    `
      : "";

  // Build similar colors section
  const similarHTML =
    similarColors.length > 0
      ? `
      <div class="${CSS_CLASSES.MODAL_SECTION} modal__section--similar">
        <h3 class="${CSS_CLASSES.MODAL_SECTION_TITLE}">Similar Colors</h3>
        <p class="${
          CSS_CLASSES.MODAL_SECTION_DESCRIPTION
        }">Explore subtle variations</p>
        <div class="${CSS_CLASSES.MODAL_COLOR_GRID}">
          ${similarColors
            .slice(0, 6)
            .map((c, index) => {
              // Determine differentiation based on comparing to main color
              let differentiator = "Similar";
              if (c.hue > color.hue + 0.05) {
                differentiator =
                  c.lightness > color.lightness ? "Warmer & Lighter" : "Warmer";
              } else if (c.hue < color.hue - 0.05) {
                differentiator =
                  c.lightness > color.lightness ? "Cooler & Lighter" : "Cooler";
              } else if (c.lightness > color.lightness + 0.05) {
                differentiator = "Lighter";
              } else if (c.lightness < color.lightness - 0.05) {
                differentiator = "Darker";
              } else if (index < similarDifferentiators.length) {
                differentiator = similarDifferentiators[index];
              }

              return `
            <div class="${CSS_CLASSES.MODAL_MINI_TILE}" 
                 style="background: ${generateHSLColor(
                   c.hue,
                   c.saturation,
                   c.lightness
                 )}; color: ${generateAccessibleText(c)};"
                 title="${c.name}">
              <div class="${
                CSS_CLASSES.MODAL_MINI_TILE_ROLE
              }">${differentiator}</div>
              <div class="${CSS_CLASSES.MODAL_MINI_TILE_NAME}">${c.name}</div>
              <div class="${CSS_CLASSES.MODAL_MINI_TILE_NUMBER}">SW ${
                c.colorNumber
              }</div>
            </div>
          `;
            })
            .join("")}
        </div>
      </div>
    `
      : "";

  // Build color families and collections
  const families =
    color.colorFamilyNames && color.colorFamilyNames.length > 0
      ? color.colorFamilyNames.join(", ")
      : "None";

  const collections =
    color.brandedCollectionNames && color.brandedCollectionNames.length > 0
      ? color.brandedCollectionNames.join(", ")
      : "None";

  // Build descriptions
  const descriptions =
    color.description && color.description.length > 0
      ? color.description.join(" • ")
      : "";

  // Build use type badges
  const useTypes = [];
  if (color.isInterior) useTypes.push("Interior");
  if (color.isExterior) useTypes.push("Exterior");
  const useTypesText =
    useTypes.length > 0 ? useTypes.join(" & ") : "Not specified";

  // LRV with plain language context
  const lrvValue = color.lrv ? color.lrv.toFixed(1) : "N/A";
  let lrvLabel = "";
  let lrvContext = "";
  let bestFor = "";

  if (color.lrv !== undefined && color.lrv !== null) {
    if (color.lrv < 30) {
      lrvLabel = "Dark";
      lrvContext = `Reflects ${lrvValue}% of light. Absorbs most light, creating intimate, cozy spaces.`;
      bestFor = "Accent walls, dramatic spaces, exteriors";
    } else if (color.lrv > 60) {
      lrvLabel = "Light";
      lrvContext = `Reflects ${lrvValue}% of light. Creates bright, airy, spacious feeling.`;
      bestFor = "Small rooms, ceilings, maximizing natural light";
    } else {
      lrvLabel = "Medium";
      lrvContext = `Reflects ${lrvValue}% of light. Balanced color that works in most spaces.`;
      bestFor = "Living areas, bedrooms, versatile applications";
    }
  }

  return `
    <div class="${
      CSS_CLASSES.MODAL_OVERLAY
    }" id="color-detail-modal" aria-modal="true" role="dialog" aria-labelledby="modal-title">
      <div class="${CSS_CLASSES.MODAL_CONTAINER}">
        <div class="${
          CSS_CLASSES.MODAL_HEADER
        }" style="background: ${backgroundColor}; color: ${headerTextColor};">
          <div class="${CSS_CLASSES.MODAL_HEADER_CONTENT}">
            <h2 id="modal-title" class="${CSS_CLASSES.MODAL_TITLE}">${
    color.name
  }</h2>
            <div class="${CSS_CLASSES.MODAL_SUBTITLE}">SW ${
    color.colorNumber
  }</div>
            ${
              descriptions
                ? `<div class="${CSS_CLASSES.MODAL_DESCRIPTION}">${descriptions}</div>`
                : ""
            }
          </div>
          <button class="${
            CSS_CLASSES.MODAL_CLOSE
          }" aria-label="Close modal" type="button" style="--btn-bg: ${closeBtnBg}; --btn-hover-bg: ${closeBtnHoverBg}; --btn-text-color: ${closeBtnTextColor};">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="${CSS_CLASSES.MODAL_BODY}">
          <!-- Priority 1: Decision Support -->
          <div class="${CSS_CLASSES.MODAL_SECTION} modal__section--priority-1">
            ${
              descriptions
                ? `
              <div class="${CSS_CLASSES.MODAL_MOOD}">
                <span class="${CSS_CLASSES.MODAL_MOOD_LABEL}">Mood & Feel:</span>
                <p class="${CSS_CLASSES.MODAL_MOOD_DESCRIPTION}">${descriptions}</p>
              </div>
            `
                : ""
            }
            ${
              lrvContext
                ? `
              <div class="${CSS_CLASSES.MODAL_DECISION_SUPPORT}">
                <div class="${CSS_CLASSES.MODAL_LRV_CONTEXT}">
                  <span class="${CSS_CLASSES.MODAL_LRV_LABEL}">${lrvLabel}</span>
                  <p class="${CSS_CLASSES.MODAL_LRV_DESCRIPTION}">${lrvContext}</p>
                </div>
                <div class="${CSS_CLASSES.MODAL_BEST_FOR}">
                  <span class="${CSS_CLASSES.MODAL_LABEL}">Best For:</span>
                  <p class="${CSS_CLASSES.MODAL_VALUE}">${bestFor}</p>
                </div>
              </div>
            `
                : ""
            }
          </div>
          
          <!-- Priority 2: Explore Alternatives -->
          ${coordinatingHTML}
          ${similarHTML}
          
          <!-- Priority 3: Technical Details (Accordion) -->
          <div class="${CSS_CLASSES.MODAL_SECTION} modal__section--technical">
            <button class="${CSS_CLASSES.MODAL_ACCORDION_TRIGGER}" 
                    type="button"
                    aria-expanded="false"
                    aria-controls="technical-details-panel"
                    id="technical-details-header">
              <span class="${
                CSS_CLASSES.MODAL_ACCORDION_TITLE
              }">Technical Details</span>
              <svg class="${
                CSS_CLASSES.MODAL_ACCORDION_ICON
              }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${ICONS.CHEVRON_DOWN}
              </svg>
            </button>
            <div class="${CSS_CLASSES.MODAL_ACCORDION_PANEL}"
                 id="technical-details-panel"
                 aria-labelledby="technical-details-header"
                 aria-hidden="true"
                 role="region"
                 inert>
              <div class="${CSS_CLASSES.MODAL_INFO_GRID}">
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM}">
                  <span class="${CSS_CLASSES.MODAL_INFO_LABEL}">Hex:</span>
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_VALUE
                  }">${color.hex.toUpperCase()}</span>
                </div>
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM}">
                  <span class="${CSS_CLASSES.MODAL_INFO_LABEL}">RGB:</span>
                  <span class="${CSS_CLASSES.MODAL_INFO_VALUE}">rgb(${
    color.red
  }, ${color.green}, ${color.blue})</span>
                </div>
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM}">
                  <span class="${CSS_CLASSES.MODAL_INFO_LABEL}">HSL:</span>
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_VALUE
                  }">hsl(${Math.round(color.hue * 360)}°, ${Math.round(
    color.saturation * 100
  )}%, ${Math.round(color.lightness * 100)}%)</span>
                </div>
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM}">
                  <span class="${CSS_CLASSES.MODAL_INFO_LABEL}">LRV:</span>
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_VALUE
                  }">${lrvValue}</span>
                </div>
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM}">
                  <span class="${CSS_CLASSES.MODAL_INFO_LABEL}">Use:</span>
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_VALUE
                  }">${useTypesText}</span>
                </div>
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM}">
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_LABEL
                  }">Color Family:</span>
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_VALUE
                  }">${families}</span>
                </div>
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM}">
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_LABEL
                  }">Collections:</span>
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_VALUE
                  }">${collections}</span>
                </div>
                ${
                  color.storeStripLocator
                    ? `
                  <div class="${CSS_CLASSES.MODAL_INFO_ITEM}">
                    <span class="${CSS_CLASSES.MODAL_INFO_LABEL}">Store Location:</span>
                    <span class="${CSS_CLASSES.MODAL_INFO_VALUE}">${color.storeStripLocator}</span>
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          </div>
        </div>
        
        <!-- Priority 4: Actions (Sticky Footer) -->
        <div class="${CSS_CLASSES.MODAL_ACTIONS}">
          <button type="button" 
                  class="modal__action-button modal__action-button--favorite" 
                  ${DATA_ATTRIBUTES.ID}="${color.id}"
                  aria-label="${
                    isFavorited ? "Remove from" : "Add to"
                  } favorites">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${
              isFavorited ? "currentColor" : "none"
            }" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${ICONS.HEART}
            </svg>
            <span>${isFavorited ? "Favorited" : "Add to Favorites"}</span>
          </button>
          <button type="button" 
                  class="modal__action-button modal__action-button--share"
                  ${DATA_ATTRIBUTES.ID}="${color.id}"
                  aria-label="Share color">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>Share</span>
          </button>
          <button type="button" 
                  class="modal__action-button modal__action-button--hide" 
                  ${DATA_ATTRIBUTES.ID}="${color.id}"
                  aria-label="${isHidden ? "Show" : "Hide"} color">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${isHidden ? ICONS.EYE : ICONS.EYE_OFF}
            </svg>
            <span>${isHidden ? "Hidden" : "Hide Color"}</span>
          </button>
          ${
            color.storeStripLocator
              ? `
          <button type="button" 
                  class="modal__action-button modal__action-button--store"
                  aria-label="Find ${color.name} in store">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>Store: ${color.storeStripLocator}</span>
          </button>
          `
              : ""
          }
        </div>
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
