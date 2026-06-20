/**
 * Responsive breakpoints, in pixels — the single source of truth for layout
 * switches that JavaScript needs to read (e.g. matchMedia).
 *
 * These MUST mirror the `--bp-*` custom properties in
 * `src/styles/breakpoints.css`: CSS `@media` conditions can't read custom
 * properties, so the values are duplicated there by necessity. When you change
 * one, change the other.
 */
export const BREAKPOINTS = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1440,
  "2xl": 2560,
} as const;

/** Width at which the facet rail becomes a persistent left column (`--bp-lg`). */
export const RAIL_BREAKPOINT = BREAKPOINTS.lg;
