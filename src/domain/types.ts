/**
 * Shared domain vocabulary for the Color Atlas.
 *
 * These are the cross-cutting types that several layers speak in (the query
 * engine, the filters context, the presentation helpers, and the UI). Keeping
 * them in one place stops the same union from being re-declared per module and
 * makes the faceting contract easy to read in a single file.
 *
 * Pure type declarations only — no runtime. The matching runtime value lists
 * (`UNDERTONES`, `LRV_CLASSES`, `NEUTRAL_CLASSES`, …) live next to the functions
 * that produce them in `utils/colorMath.ts`.
 */

/** A color's temperature, derived from hue + saturation. */
export type Undertone = "Warm" | "Cool" | "Neutral";

/** Lightness band, derived from LRV. */
export type LrvClass = "Dark" | "Medium" | "Light";

/** Neutrality band, derived from chroma (how close to gray). */
export type NeutralClass = "High" | "Medium" | "Low";

/** Which painting context a color is rated for. `null` = no filter. */
export type UseType = "interior" | "exterior" | null;

/** Which base set the gallery draws from. */
export type AtlasView = "all" | "favorites" | "hidden";

/** Ordering applied to a result set. */
export type SortKey =
  | "family"
  | "hue"
  | "lrv-asc"
  | "lrv-desc"
  | "name"
  | "neutral-high"
  | "neutral-low";

/** A faceted-browse query: every active facet plus the chosen ordering. */
export interface FilterCriteria {
  /** Free text matched against name, SW number, and description. */
  search?: string;
  /** Primary-family match (OR across the list). */
  families?: string[];
  /** Undertone match (OR across the list). */
  undertones?: Undertone[];
  /** Lightness band match (Dark / Medium / Light, OR across the list). */
  lightness?: LrvClass[];
  /** Neutrality band match (High / Medium / Low, OR across the list). */
  neutrality?: NeutralClass[];
  useType?: UseType;
  /** Branded-collection membership (OR, exact-name match). */
  collections?: string[];
  designerOnly?: boolean;
  /** Which base set to draw from. Defaults to "all" (active minus hidden). */
  view?: AtlasView;
  sort?: SortKey;
}
