// LRV (Light Reflectance Value) thresholds for dark/medium/light classification
export const LRV_THRESHOLDS = {
  DARK: 30,
  LIGHT: 60,
  /** Colors below this LRV get white text/icons for WCAG contrast. */
  CONTRAST: 40,
};

// Neutrality score (0–100, see colorPresentation.neutrality) band thresholds.
// Tuned to the dataset's terciles so each band is well populated:
// High ≥ 85 (near-gray), Medium 69–84 (muted), Low < 69 (colorful).
export const NEUTRALITY_THRESHOLDS = {
  HIGH: 85,
  MEDIUM: 69,
};

// Prefix used to identify Designer Color Collection entries in brandedCollectionNames.
// Used for the "Designer Pick" tile badge and modal sub-collection display.
export const DESIGNER_COLLECTION_PREFIX = "Designer Color Collection";

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

export const TIMING = {
  CLOSE_ANIMATION_MS: 300,
  TOAST_DURATION_MS: 3000,
  LRV_DEBOUNCE_MS: 80,
};
