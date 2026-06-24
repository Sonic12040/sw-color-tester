import type { Color } from "../data/types.js";
import type { FilterCriteria, SortKey } from "../domain/types.js";
import { FAMILY_ORDER } from "../utils/config.js";
import {
  undertone,
  classifyLrv,
  neutrality,
  neutralityBand,
} from "../utils/colorMath.js";

/**
 * Pure faceted-query engine for the Color Atlas. These functions take colors in
 * and return a fresh array out — no `this`, no state, no I/O — so they're
 * trivially unit-testable. `ColorModel` owns the indexes and delegates the
 * actual querying here.
 */

/** Side data the query needs that isn't carried on the colors themselves. */
export interface QueryContext {
  favorites?: Set<string>;
  hidden?: Set<string>;
  designerPickIds?: Set<string>;
}

/**
 * Lowercased searchable text for a color: not just its name/number, but every
 * value a user might type — family, collection(s), undertone, lightness band
 * (e.g. "dark"), neutrality band, interior/exterior, hex, and description. Mirrors
 * the facet vocabulary so anything you can filter by, you can also type.
 */
function searchHaystack(c: Color): string {
  return [
    c.name,
    c.colorNumber,
    `sw ${c.colorNumber}`,
    c.hex,
    ...c.colorFamilyNames,
    ...c.brandedCollectionNames,
    undertone(c),
    classifyLrv(c.lrv ?? 0),
    neutralityBand(c),
    c.isInterior ? "interior" : "",
    c.isExterior ? "exterior" : "",
    ...c.description,
  ]
    .join(" ")
    .toLowerCase();
}

/** Order family names by configured priority, then alphabetically. */
export function orderFamilies(familyKeys: string[]): string[] {
  return [...familyKeys].sort((a, b) => {
    const aIndex = FAMILY_ORDER.indexOf(a);
    const bIndex = FAMILY_ORDER.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
}

/** Sort a copy of `colors` by the given key. */
export function sortColors(colors: Color[], key: SortKey): Color[] {
  const sorted = [...colors];
  switch (key) {
    case "hue":
      return sorted.sort((a, b) => a.hue - b.hue || b.lrv - a.lrv);
    case "lrv-asc":
      return sorted.sort((a, b) => a.lrv - b.lrv);
    case "lrv-desc":
      return sorted.sort((a, b) => b.lrv - a.lrv);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "neutral-high":
      return sorted.sort(
        (a, b) => neutrality(b) - neutrality(a) || a.name.localeCompare(b.name),
      );
    case "neutral-low":
      return sorted.sort(
        (a, b) => neutrality(a) - neutrality(b) || a.name.localeCompare(b.name),
      );
    case "family":
    default:
      return sorted.sort((a, b) => {
        const fa = FAMILY_ORDER.indexOf(a.colorFamilyNames[0]);
        const fb = FAMILY_ORDER.indexOf(b.colorFamilyNames[0]);
        const ra = fa === -1 ? FAMILY_ORDER.length : fa;
        const rb = fb === -1 ? FAMILY_ORDER.length : fb;
        return ra - rb || a.name.localeCompare(b.name);
      });
  }
}

/**
 * Pick a base set from `view`, apply every active facet, then sort.
 * Returns a fresh array; never mutates `colors`.
 */
export function queryColors(
  colors: Color[],
  criteria: FilterCriteria,
  ctx: QueryContext = {},
): Color[] {
  const {
    search,
    families,
    undertones,
    lightness,
    neutrality: neutralBands,
    useType,
    collections,
    designerOnly,
    view = "all",
    sort = "family",
  } = criteria;
  const {
    favorites = new Set<string>(),
    hidden = new Set<string>(),
    designerPickIds = new Set<string>(),
  } = ctx;

  let base: Color[];
  if (view === "favorites") {
    base = colors.filter((c) => favorites.has(c.id));
  } else if (view === "hidden") {
    base = colors.filter((c) => hidden.has(c.id));
  } else {
    base = colors.filter((c) => !hidden.has(c.id));
  }

  // Tokenize the query on whitespace: every term must be present (AND), so
  // "warm red" matches colors that are both warm and red, each matched against
  // any field in the haystack.
  const terms = search
    ? search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    : [];
  const familySet = families && families.length > 0 ? new Set(families) : null;
  const undertoneSet =
    undertones && undertones.length > 0 ? new Set(undertones) : null;
  const collectionList =
    collections && collections.length > 0 ? collections : null;
  const lightnessSet =
    lightness && lightness.length > 0 ? new Set(lightness) : null;
  const neutralSet =
    neutralBands && neutralBands.length > 0 ? new Set(neutralBands) : null;

  const filtered = base.filter((c) => {
    if (terms.length > 0) {
      const haystack = searchHaystack(c);
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    if (familySet && !familySet.has(c.colorFamilyNames[0])) return false;
    if (undertoneSet && !undertoneSet.has(undertone(c))) return false;
    if (lightnessSet && !lightnessSet.has(classifyLrv(c.lrv ?? 0))) {
      return false;
    }
    if (neutralSet && !neutralSet.has(neutralityBand(c))) return false;
    if (useType === "interior" && !c.isInterior) return false;
    if (useType === "exterior" && !c.isExterior) return false;
    if (designerOnly && !designerPickIds.has(c.id)) return false;
    if (
      collectionList &&
      !collectionList.some((name) => c.brandedCollectionNames.includes(name))
    ) {
      return false;
    }
    return true;
  });

  return sortColors(filtered, sort);
}
