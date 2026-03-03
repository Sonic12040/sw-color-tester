import {
  CSS_CLASSES,
  DATA_ATTRIBUTES,
  ELEMENT_IDS,
  ICONS,
  LRV_THRESHOLDS,
  DESIGNER_COLLECTION_PREFIX,
} from "./config.js";

// Coordinating color roles (assign contextual labels)
const COORDINATING_ROLES = ["Accent Wall", "Trim Color", "Coordinating"];

// Similar color differentiators
const SIMILAR_DIFFERENTIATORS = [
  "Warmer",
  "Cooler",
  "Lighter",
  "Darker",
  "Similar Tone",
  "Alternative",
];

/** Reusable <template> element for efficient HTML → DOM parsing. */
const _tmpl = document.createElement("template");

/** Parse an HTML string into a single DOM element. */
export function parseHTML(html) {
  _tmpl.innerHTML = html;
  return _tmpl.content.firstElementChild;
}

function generateHSLColor(hue, saturation, lightness) {
  return `hsl(${hue * 360}deg ${saturation * 100}% ${lightness * 100}%)`;
}

/**
 * Determine text color for readability over a given color tile background.
 * Uses LRV (Light Reflectance Value) threshold instead of the pre-computed
 * isDark flag, which only triggers at LRV ~18 and misses many dark-ish colors.
 */
function generateAccessibleText(color) {
  return color.lrv < LRV_THRESHOLDS.CONTRAST ? "white" : "black";
}

/** Adaptive button/badge colors keyed off LRV contrast threshold. */
function generateButtonStyles(color) {
  const isDark = color.lrv < LRV_THRESHOLDS.CONTRAST;
  return {
    bgColor: isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.7)",
    hoverBg: isDark ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.85)",
    textColor: isDark ? "rgba(0, 0, 0, 0.9)" : "white",
    badgeBg: isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.75)",
    badgeText: isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
  };
}

/**
 * Generate HSL visual breakdown bars
 * @param {Object} color - The color object with hue, saturation, lightness
 * @returns {string} HTML for the visual HSL breakdown
 */
function generateHSLBreakdown(color) {
  const hue = Math.round(color.hue * 360);
  const saturation = Math.round(color.saturation * 100);
  const lightness = Math.round(color.lightness * 100);

  // Generate hue gradient (full color wheel)
  const hueGradient = `linear-gradient(to right,
    hsl(0, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(360, 100%, 50%)
  )`;

  // Generate saturation gradient (gray to full color at current hue)
  const saturationGradient = `linear-gradient(to right,
    hsl(${hue}, 0%, 50%),
    hsl(${hue}, 100%, 50%)
  )`;

  // Generate lightness gradient (black to white through color)
  const lightnessGradient = `linear-gradient(to right,
    hsl(${hue}, ${saturation}%, 0%),
    hsl(${hue}, ${saturation}%, 50%),
    hsl(${hue}, ${saturation}%, 100%)
  )`;

  return `
    <div class="hsl-breakdown">
      <div class="hsl-breakdown__header">
        <h4 class="hsl-breakdown__title">HSL Color Breakdown</h4>
        <p class="hsl-breakdown__description">Visual representation of this color's components</p>
      </div>
      <div class="hsl-breakdown__item">
        <label class="hsl-breakdown__label">
          <span class="hsl-breakdown__name">Hue</span>
          <span class="hsl-breakdown__value">${hue}°</span>
        </label>
        <div class="hsl-breakdown__bar-container">
          <div class="hsl-breakdown__bar" style="background: ${hueGradient};" aria-hidden="true">
            <div class="hsl-breakdown__indicator" style="left: ${(
              color.hue * 100
            ).toFixed(1)}%;"></div>
          </div>
        </div>
      </div>
      <div class="hsl-breakdown__item">
        <label class="hsl-breakdown__label">
          <span class="hsl-breakdown__name">Saturation</span>
          <span class="hsl-breakdown__value">${saturation}%</span>
        </label>
        <div class="hsl-breakdown__bar-container">
          <div class="hsl-breakdown__bar" style="background: ${saturationGradient};" aria-hidden="true">
            <div class="hsl-breakdown__indicator" style="left: ${saturation}%;"></div>
          </div>
        </div>
      </div>
      <div class="hsl-breakdown__item">
        <label class="hsl-breakdown__label">
          <span class="hsl-breakdown__name">Lightness</span>
          <span class="hsl-breakdown__value">${lightness}%</span>
        </label>
        <div class="hsl-breakdown__bar-container">
          <div class="hsl-breakdown__bar" style="background: ${lightnessGradient};" aria-hidden="true">
            <div class="hsl-breakdown__indicator" style="left: ${lightness}%;"></div>
          </div>
        </div>
      </div>
    </div>
  `;
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
  showBulkActions = false,
) {
  const bulkActionsHTML = showBulkActions
    ? `
    <div class="${CSS_CLASSES.BULK_ACTIONS_PANEL}">
      <div class="${CSS_CLASSES.BULK_ACTIONS_PANEL_CONTAINER} u-flex-align">
        <span class="${CSS_CLASSES.BULK_ACTIONS_PANEL_LABEL}">Family Actions:</span>
        <button 
          type="button"
          class="${CSS_CLASSES.BULK_ACTIONS_FAVORITE_BUTTON} u-flex-align" 
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
          class="${CSS_CLASSES.BULK_ACTIONS_HIDE_BUTTON} u-flex-align" 
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
        class="${CSS_CLASSES.ACCORDION_HEADER} u-flex-between" 
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
          <div id="${id}-tiles" class="${CSS_CLASSES.COLOR_TILES_GRID} u-flex-wrap-center"></div>
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
 * @param {Set<string>} options.favoriteIds - Set of favorite color IDs (default: empty Set)
 * @param {Set<string>} options.hiddenIds - Set of hidden color IDs (default: empty Set)
 * @returns {Element} DOM element for the color tile
 */
export function colorTemplate(color, options = {}) {
  const {
    showFavoriteButton = true,
    showHideButton = true,
    favoriteIds = new Set(),
    hiddenIds = new Set(),
    designerPickIds = new Set(),
  } = options;

  const isFavorited = favoriteIds.has(color.id);
  const isHidden = hiddenIds.has(color.id);
  const textColor = generateAccessibleText(color);
  const styles = generateButtonStyles(color);

  const favoriteLabel = isFavorited ? "Unfavorite" : "Favorite";
  const hideLabel = isHidden ? "Unhide" : "Hide";
  const favoriteFill = isFavorited ? styles.textColor : "none";

  // Build button HTML conditionally
  const favoriteButtonHTML = showFavoriteButton
    ? `
    <button aria-label="${favoriteLabel} color" 
            title="${favoriteLabel} ${color.name}"
            class="${CSS_CLASSES.COLOR_TILE_FAVORITE_BUTTON} ${CSS_CLASSES.COLOR_TILE_BUTTON} u-flex-center" 
            ${DATA_ATTRIBUTES.ID}="${color.id}"
            style="--btn-bg: ${styles.bgColor}; --btn-hover-bg: ${styles.hoverBg};">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="${favoriteFill}" stroke="${styles.textColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        ${ICONS.HEART}
      </svg>
    </button>
  `
    : "";

  const hideButtonHTML = showHideButton
    ? `
    <button aria-label="${hideLabel} color" 
            title="${hideLabel} ${color.name}"
            class="${CSS_CLASSES.COLOR_TILE_HIDE_BUTTON} ${CSS_CLASSES.COLOR_TILE_BUTTON} u-flex-center" 
            ${DATA_ATTRIBUTES.ID}="${color.id}"
            style="--btn-bg: ${styles.bgColor}; --btn-hover-bg: ${styles.hoverBg};">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${styles.textColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        ${ICONS.EYE_OFF}
      </svg>
    </button>
  `
    : "";

  // Build badges for interior/exterior use — only show for exceptions (not both)
  // Most colors are Interior & Exterior, so omitting the badge declutters the tile
  const badges = [];

  // Designer Pick badge — shown on tiles outside the Designer family accordion (hidden via CSS inside it)
  if (designerPickIds.has(color.id)) {
    badges.push(
      `<span class="${CSS_CLASSES.COLOR_TILE_BADGE} ${CSS_CLASSES.COLOR_TILE_BADGE_DESIGNER}" style="background: ${styles.badgeBg}; color: ${styles.badgeText};">Designer Pick</span>`,
    );
  }

  if (color.isInterior && !color.isExterior) {
    badges.push(
      `<span class="${CSS_CLASSES.COLOR_TILE_BADGE} ${CSS_CLASSES.COLOR_TILE_BADGE_INTERIOR}" style="background: ${styles.badgeBg}; color: ${styles.badgeText};">Interior Only</span>`,
    );
  } else if (color.isExterior && !color.isInterior) {
    badges.push(
      `<span class="${CSS_CLASSES.COLOR_TILE_BADGE} ${CSS_CLASSES.COLOR_TILE_BADGE_EXTERIOR}" style="background: ${styles.badgeBg}; color: ${styles.badgeText};">Exterior Only</span>`,
    );
  }

  const badgesHTML =
    badges.length > 0
      ? `<div class="${CSS_CLASSES.COLOR_TILE_BADGES} u-flex-col">${badges.join("")}</div>`
      : "";

  // Format LRV value with plain language labels
  const lrvValue = color.lrv ? color.lrv.toFixed(1) : "N/A";
  let lrvClass = "medium";
  let lrvLabel = "Medium";
  if (color.lrv < LRV_THRESHOLDS.DARK) {
    lrvClass = "dark";
    lrvLabel = "Dark";
  } else if (color.lrv > LRV_THRESHOLDS.LIGHT) {
    lrvClass = "light";
    lrvLabel = "Light";
  }

  const html = `<div class="${CSS_CLASSES.COLOR_TILE}" ${DATA_ATTRIBUTES.ID}="${color.id}" style="background: ${generateHSLColor(color.hue, color.saturation, color.lightness)}; color: ${textColor}"><div class="${CSS_CLASSES.COLOR_TILE_ACTIONS} u-flex-align">${favoriteButtonHTML}${hideButtonHTML}</div>${badgesHTML}<div class="${CSS_CLASSES.COLOR_TILE_INFO}" style="color:${textColor};"><div class="${CSS_CLASSES.COLOR_TILE_NAME}"><strong>${color.name}</strong></div><div class="${CSS_CLASSES.COLOR_TILE_NUMBER}">SW ${color.colorNumber}</div><div class="${CSS_CLASSES.COLOR_TILE_LRV_CONTAINER}"><span class="${CSS_CLASSES.COLOR_TILE_LRV} ${CSS_CLASSES.COLOR_TILE_LRV}--${lrvClass}" title="Light Reflectance Value - ${lrvLabel} color reflects ${lrvValue}% of light" style="background: ${styles.badgeBg}; color: ${styles.badgeText};"><span class="${CSS_CLASSES.COLOR_TILE_LRV_LABEL}">${lrvLabel}</span><span class="${CSS_CLASSES.COLOR_TILE_LRV_VALUE}">LRV ${lrvValue}</span></span></div><button type="button" aria-label="See color details and pairings for ${color.name}" class="${CSS_CLASSES.COLOR_TILE_VIEW_BUTTON} ${CSS_CLASSES.COLOR_TILE_BUTTON} u-flex-center" ${DATA_ATTRIBUTES.ID}="${color.id}" style="--btn-bg: ${styles.bgColor}; --btn-hover-bg: ${styles.hoverBg}; --btn-text-color: ${styles.textColor};">View Details</button></div></div>`;

  return parseHTML(html);
}

export function familyTileTemplate(familyName, colorCount) {
  return `
    <div class="${CSS_CLASSES.COLOR_TILE} ${CSS_CLASSES.COLOR_TILE_FAMILY}" 
         aria-label="Unhide ${familyName} family" 
         ${DATA_ATTRIBUTES.FAMILY}="${familyName}">
      <div class="${CSS_CLASSES.COLOR_TILE_ACTIONS} u-flex-align">
        <button aria-label="Unhide all ${familyName} colors" 
                class="${CSS_CLASSES.COLOR_TILE_UNHIDE_BUTTON} ${CSS_CLASSES.COLOR_TILE_BUTTON} u-flex-center" 
                ${DATA_ATTRIBUTES.FAMILY}="${familyName}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            ${ICONS.EYE}
          </svg>
        </button>
      </div>
      <div class="${CSS_CLASSES.COLOR_TILE_INFO}">
        <strong>${familyName} Family</strong><br/>
        <span class="${CSS_CLASSES.COLOR_TILE_COUNT}">${colorCount} colors hidden</span>
      </div>
      <div class="${CSS_CLASSES.COLOR_TILE_ICON_OVERLAY}">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          ${ICONS.EYE_OFF}
        </svg>
      </div>
    </div>
  `;
}

/**
 * @param {Object} coordinatingColors - { coord1, coord2, white } color objects
 */
export function colorDetailModal(
  color,
  coordinatingColors = {},
  similarColors = [],
  isFavorited = false,
  isHidden = false,
) {
  const backgroundColor = generateHSLColor(
    color.hue,
    color.saturation,
    color.lightness,
  );
  const styles = generateButtonStyles(color);

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
              const role = COORDINATING_ROLES[index] || "Coordinating";
              return `
            <div class="${
              CSS_CLASSES.MODAL_MINI_TILE
            } ${CSS_CLASSES.MODAL_MINI_TILE_CLICKABLE}" 
                 ${DATA_ATTRIBUTES.ID}="${c.id}"
                 style="background: ${generateHSLColor(
                   c.hue,
                   c.saturation,
                   c.lightness,
                 )}; color: ${generateAccessibleText(c)};"
                 role="button"
                 tabindex="0"
                 aria-label="View ${c.name}"
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
              } else if (index < SIMILAR_DIFFERENTIATORS.length) {
                differentiator = SIMILAR_DIFFERENTIATORS[index];
              }

              return `
            <div class="${
              CSS_CLASSES.MODAL_MINI_TILE
            } ${CSS_CLASSES.MODAL_MINI_TILE_CLICKABLE}" 
                 ${DATA_ATTRIBUTES.ID}="${c.id}"
                 style="background: ${generateHSLColor(
                   c.hue,
                   c.saturation,
                   c.lightness,
                 )}; color: ${generateAccessibleText(c)};"
                 role="button"
                 tabindex="0"
                 aria-label="View ${c.name}"
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
    color.colorFamilyNames.length > 0
      ? color.colorFamilyNames.join(", ")
      : "None";

  const collections =
    color.brandedCollectionNames.length > 0
      ? color.brandedCollectionNames.join(", ")
      : "None";

  // Extract Designer sub-collection names for prominent display
  const designerCollections = color.brandedCollectionNames
    .filter((c) => c.startsWith(DESIGNER_COLLECTION_PREFIX))
    .map((c) => c.replace(`${DESIGNER_COLLECTION_PREFIX} - `, ""));

  // Build descriptions
  const descriptions =
    color.description.length > 0 ? color.description.join(" • ") : "";

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

  if (color.lrv !== undefined && color.lrv !== null) {
    if (color.lrv < LRV_THRESHOLDS.DARK) {
      lrvLabel = "Dark";
      lrvContext = `Reflects ${lrvValue}% of light. Absorbs most light, creating intimate, cozy spaces.`;
    } else if (color.lrv > LRV_THRESHOLDS.LIGHT) {
      lrvLabel = "Light";
      lrvContext = `Reflects ${lrvValue}% of light. Creates bright, airy, spacious feeling.`;
    } else {
      lrvLabel = "Medium";
      lrvContext = `Reflects ${lrvValue}% of light. Balanced color that works in most spaces.`;
    }
  }

  return `
    <div class="${
      CSS_CLASSES.MODAL_OVERLAY
    } u-flex-center" id="${ELEMENT_IDS.COLOR_DETAIL_MODAL}" aria-modal="true" role="dialog" aria-labelledby="modal-title">
      <div class="${CSS_CLASSES.MODAL_CONTAINER} u-flex-col">
        <div class="${
          CSS_CLASSES.MODAL_HEADER
        }" style="background: ${backgroundColor}; color: ${generateAccessibleText(color)};">
          <div class="${CSS_CLASSES.MODAL_HEADER_CONTENT}">
            <h2 id="modal-title" class="${CSS_CLASSES.MODAL_TITLE}">${
              color.name
            }</h2>
            <div class="${CSS_CLASSES.MODAL_SUBTITLE}">
              SW ${color.colorNumber}
              ${useTypes.length > 0 ? ` • ${useTypesText}` : ""}
            </div>
          </div>
          <button class="${
            CSS_CLASSES.MODAL_CLOSE
          } u-flex-center" aria-label="Close modal" type="button" style="--btn-bg: ${styles.bgColor}; --btn-hover-bg: ${styles.hoverBg}; --btn-text-color: ${styles.textColor};">
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
              <div class="${CSS_CLASSES.MODAL_MOOD} u-flex-col">
                <span class="${CSS_CLASSES.MODAL_MOOD_LABEL}">Mood & Feel:</span>
                <p class="${CSS_CLASSES.MODAL_MOOD_DESCRIPTION}">${descriptions}</p>
              </div>
            `
                : ""
            }
            ${
              lrvContext
                ? `
              <div class="${CSS_CLASSES.MODAL_DECISION_SUPPORT} u-flex-col">
                <div class="${CSS_CLASSES.MODAL_LRV_CONTEXT} u-flex-col">
                  <span class="${CSS_CLASSES.MODAL_LRV_LABEL}">${lrvLabel}</span>
                  <p class="${CSS_CLASSES.MODAL_LRV_DESCRIPTION}">${lrvContext}</p>
                </div>
              </div>
            `
                : ""
            }
            ${
              designerCollections.length > 0
                ? `
              <div class="${CSS_CLASSES.MODAL_MOOD} u-flex-col">
                <span class="${CSS_CLASSES.MODAL_MOOD_LABEL}">Designer Collection:</span>
                <p class="${CSS_CLASSES.MODAL_MOOD_DESCRIPTION}">${designerCollections.join(" · ")}</p>
              </div>
            `
                : ""
            }
          </div>
          
          <!-- Priority 2: Explore Alternatives -->
          ${coordinatingHTML}
          ${similarHTML}
          
          <!-- Color Science Snapshot -->
          ${generateHSLBreakdown(color)}
          
          <!-- Priority 3: Technical Details (Accordion) -->
          <div class="${CSS_CLASSES.MODAL_SECTION} modal__section--technical">
            <button class="${CSS_CLASSES.MODAL_ACCORDION_TRIGGER} u-flex-between" 
                    type="button"
                    aria-expanded="false"
                    aria-controls="technical-details-panel"
                    id="technical-details-header">
              <span class="${
                CSS_CLASSES.MODAL_ACCORDION_TITLE
              }">Technical Details <span class="${
                CSS_CLASSES.MODAL_ACCORDION_HINT
              }">(Paint specs, color codes & more)</span></span>
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
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM} u-flex-col">
                  <span class="${CSS_CLASSES.MODAL_INFO_LABEL}">Hex:</span>
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_VALUE
                  }">${color.hex.toUpperCase()}</span>
                </div>
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM} u-flex-col">
                  <span class="${CSS_CLASSES.MODAL_INFO_LABEL}">RGB:</span>
                  <span class="${CSS_CLASSES.MODAL_INFO_VALUE}">rgb(${
                    color.red
                  }, ${color.green}, ${color.blue})</span>
                </div>
              </div>
              
              <div class="${CSS_CLASSES.MODAL_INFO_GRID}">
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM} u-flex-col">
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_LABEL
                  }">Color Temperature Family:</span>
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_VALUE
                  }">${families}</span>
                </div>
                <div class="${CSS_CLASSES.MODAL_INFO_ITEM} u-flex-col">
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_LABEL
                  }">Paint Collections:</span>
                  <span class="${
                    CSS_CLASSES.MODAL_INFO_VALUE
                  }">${collections}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Priority 4: Actions (Sticky Footer) -->
        <div class="${CSS_CLASSES.MODAL_ACTIONS}">
          <button type="button" 
                  class="${CSS_CLASSES.MODAL_ACTION_BUTTON} ${CSS_CLASSES.MODAL_ACTION_BUTTON_SECONDARY} ${CSS_CLASSES.MODAL_ACTION_BUTTON_FAVORITE} u-flex-align" 
                  ${DATA_ATTRIBUTES.ID}="${color.id}"
                  aria-label="${
                    isFavorited ? "Remove from" : "Add to"
                  } favorites"
                  data-tooltip="${isFavorited ? "Favorited" : "Favorite"}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${
              isFavorited ? "currentColor" : "none"
            }" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${ICONS.HEART}
            </svg>
            <span class="${CSS_CLASSES.MODAL_ACTION_LABEL}">${isFavorited ? "Favorited" : "Add to Favorites"}</span>
          </button>
          <button type="button" 
                  class="${CSS_CLASSES.MODAL_ACTION_BUTTON} ${CSS_CLASSES.MODAL_ACTION_BUTTON_SECONDARY} ${CSS_CLASSES.MODAL_ACTION_BUTTON_SHARE} u-flex-align"
                  ${DATA_ATTRIBUTES.ID}="${color.id}"
                  aria-label="Share color"
                  data-tooltip="Share">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span class="${CSS_CLASSES.MODAL_ACTION_LABEL}">Share</span>
          </button>
          <button type="button" 
                  class="${CSS_CLASSES.MODAL_ACTION_BUTTON} ${CSS_CLASSES.MODAL_ACTION_BUTTON_SECONDARY} ${CSS_CLASSES.MODAL_ACTION_BUTTON_COPY} u-flex-align"
                  ${DATA_ATTRIBUTES.ID}="${color.id}"
                  aria-label="Copy color code"
                  data-tooltip="Copy Code">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${ICONS.COPY}
            </svg>
            <span class="${CSS_CLASSES.MODAL_ACTION_LABEL}">Copy Code</span>
          </button>
          <button type="button" 
                  class="${CSS_CLASSES.MODAL_ACTION_BUTTON} ${CSS_CLASSES.MODAL_ACTION_BUTTON_SECONDARY} ${CSS_CLASSES.MODAL_ACTION_BUTTON_HIDE} u-flex-align" 
                  ${DATA_ATTRIBUTES.ID}="${color.id}"
                  aria-label="${isHidden ? "Show" : "Hide"} color"
                  data-tooltip="${isHidden ? "Show" : "Hide"}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${isHidden ? ICONS.EYE : ICONS.EYE_OFF}
            </svg>
            <span class="${CSS_CLASSES.MODAL_ACTION_LABEL}">${isHidden ? "Hidden" : "Hide Color"}</span>
          </button>
          ${
            color.storeStripLocator
              ? `
          <button type="button" 
                  class="${CSS_CLASSES.MODAL_ACTION_BUTTON} ${CSS_CLASSES.MODAL_ACTION_BUTTON_SECONDARY} ${CSS_CLASSES.MODAL_ACTION_BUTTON_STORE} u-flex-align"
                  aria-label="Find ${color.name} in store"
                  data-tooltip="Store: ${color.storeStripLocator}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="${CSS_CLASSES.MODAL_ACTION_LABEL}">Store: ${color.storeStripLocator}</span>
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
 * Generate confirmation modal for bulk actions
 * @param {Object} options - Modal configuration
 * @param {string} options.title - Modal title
 * @param {string} options.message - Confirmation message
 * @param {string} options.confirmText - Text for confirm button (default: "Confirm")
 * @param {string} options.cancelText - Text for cancel button (default: "Cancel")
 * @param {string} options.confirmClass - CSS class for confirm button (default: "btn-danger")
 * @returns {string} HTML for the confirmation modal
 */
export function confirmationModal({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmClass = "btn-danger",
}) {
  return `
    <div class="${CSS_CLASSES.CONFIRM_OVERLAY} u-flex-center" id="${ELEMENT_IDS.CONFIRM_OVERLAY}" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div class="${CSS_CLASSES.CONFIRM_DIALOG}">
        <div class="${CSS_CLASSES.CONFIRM_HEADER}">
          <h2 class="${CSS_CLASSES.CONFIRM_TITLE}" id="confirm-title">${title}</h2>
        </div>
        <div class="${CSS_CLASSES.CONFIRM_BODY}">
          <p class="${CSS_CLASSES.CONFIRM_MESSAGE}">${message}</p>
        </div>
        <div class="${CSS_CLASSES.CONFIRM_ACTIONS}">
          <button type="button" class="${CSS_CLASSES.BTN} ${CSS_CLASSES.BTN_SECONDARY}" id="${ELEMENT_IDS.CONFIRM_CANCEL}" aria-label="${cancelText}">
            ${cancelText}
          </button>
          <button type="button" class="${CSS_CLASSES.BTN} ${confirmClass}" id="${ELEMENT_IDS.CONFIRM_CONFIRM}" aria-label="${confirmText}">
            ${confirmText}
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate toast notification for undo actions
 * @param {Object} options - Toast configuration
 * @param {string} options.message - Toast message
 * @param {string} options.actionText - Text for action button (default: "Undo")
 * @param {string} options.id - Unique ID for the toast
 * @returns {string} HTML for the toast notification
 */
export function toastNotification({ message, actionText = "Undo", id }) {
  return `
    <div class="${CSS_CLASSES.TOAST}" id="${id}" role="status" aria-live="polite" aria-atomic="true">
      <div class="${CSS_CLASSES.TOAST_CONTENT} u-flex-align">
        <p class="${CSS_CLASSES.TOAST_MESSAGE}">${message}</p>
        <button type="button" class="${CSS_CLASSES.TOAST_ACTION}" aria-label="${actionText}">
          ${actionText}
        </button>
        <button type="button" class="${CSS_CLASSES.TOAST_CLOSE} u-flex-center" aria-label="Dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  `;
}
