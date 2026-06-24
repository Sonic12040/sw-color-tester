import { useFilters } from "../../context/FiltersContext.js";
import styles from "./ResultsBar.module.css";

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ResultsBarProps {
  filteredCount: number;
  totalCount: number;
}

/**
 * Leads the results region with the removable active-filter chips. The result
 * count is intentionally NOT shown visually (sighted users get filter feedback
 * from the grid reflowing + the empty state); it's preserved as an `sr-only`
 * `aria-live` region so screen-reader users still hear "12 of 1,728 colors" when
 * a filter or search changes the set. The visible chip bar renders only when a
 * facet is active, so the default browse view stays clean.
 */
export function ResultsBar({ filteredCount, totalCount }: ResultsBarProps) {
  const f = useFilters();
  const chips: Chip[] = [];

  const search = f.search.trim();
  if (search)
    chips.push({
      key: "search",
      label: `“${search}”`,
      onRemove: () => f.setSearch(""),
    });
  if (f.view !== "all")
    chips.push({
      key: "view",
      label: f.view === "favorites" ? "Favorites" : "Hidden",
      onRemove: () => f.setView("all"),
    });
  for (const fam of f.families)
    chips.push({
      key: `fam:${fam}`,
      label: fam,
      onRemove: () => f.toggleFamily(fam),
    });
  for (const u of f.undertones)
    chips.push({
      key: `tone:${u}`,
      label: u,
      onRemove: () => f.toggleUndertone(u),
    });
  for (const l of f.lightness)
    chips.push({
      key: `lrv:${l}`,
      label: l,
      onRemove: () => f.toggleLightness(l),
    });
  for (const n of f.neutrality)
    chips.push({
      key: `neutral:${n}`,
      label: `${n} neutrality`,
      onRemove: () => f.toggleNeutrality(n),
    });
  if (f.useType)
    chips.push({
      key: "use",
      label: f.useType === "interior" ? "Interior" : "Exterior",
      onRemove: () => f.setUseType(null),
    });
  if (f.designerOnly)
    chips.push({
      key: "designer",
      label: "Designer Picks",
      onRemove: () => f.setDesignerOnly(false),
    });
  for (const c of f.collections)
    chips.push({
      key: `col:${c}`,
      label: c,
      onRemove: () => f.toggleCollection(c),
    });

  const filtered = filteredCount.toLocaleString();
  const total = totalCount.toLocaleString();
  // Drop the redundant "N of N" when nothing is narrowed.
  const countText =
    filteredCount === totalCount
      ? `${total} colors`
      : `${filtered} of ${total} colors`;

  return (
    <>
      {/* Screen-reader-only live region — keeps filter/search feedback for AT
          without showing the count in the visual UI. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {countText}
      </p>

      {chips.length > 0 && (
        <div className={styles.bar} role="group" aria-label="Active filters">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              className={styles.chip}
              onClick={c.onRemove}
              aria-label={`Remove ${c.label} filter`}
            >
              {c.label}
              <span className={styles.remove} aria-hidden="true">
                ✕
              </span>
            </button>
          ))}
          <button
            type="button"
            className={`btn-secondary ${styles.clear}`}
            onClick={f.resetAll}
          >
            Clear all
          </button>
        </div>
      )}
    </>
  );
}
