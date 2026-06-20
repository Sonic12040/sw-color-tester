import { useFilters } from "../../context/FiltersContext.js";
import styles from "./ActiveFilters.module.css";

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * A removable summary of every active facet, shown above the grid at all
 * breakpoints — gives desktop users the feedback the mobile "Filters (n)" badge
 * already provides, plus a one-tap way to drop individual facets or clear all.
 */
export function ActiveFilters() {
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

  if (chips.length === 0) return null;

  return (
    <div className={styles.bar} role="group" aria-label="Active filters">
      <span className={styles.label}>Filters</span>
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
  );
}
