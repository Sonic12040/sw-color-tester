import { Link } from "react-router";
import { useFilters } from "../../context/FiltersContext.js";
import { useCompare } from "../../context/CompareContext.js";
import type { SortKey } from "../../models/ColorModel.js";
import styles from "./AtlasToolbar.module.css";

interface AtlasToolbarProps {
  filteredCount: number;
  totalCount: number;
  onOpenFilters: () => void;
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "family", label: "Family" },
  { key: "hue", label: "Hue" },
  { key: "lrv-asc", label: "LRV: low → high" },
  { key: "lrv-desc", label: "LRV: high → low" },
  { key: "name", label: "Name (A–Z)" },
];

export function AtlasToolbar({
  filteredCount,
  totalCount,
  onOpenFilters,
}: AtlasToolbarProps) {
  const { search, setSearch, sort, setSort, activeFacetCount } = useFilters();
  const { compare } = useCompare();

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={`btn-secondary ${styles.filtersBtn}`}
        onClick={onOpenFilters}
        aria-label="Open filters"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="10" y1="18" x2="14" y2="18" />
        </svg>
        Filters
        {activeFacetCount > 0 && (
          <span className={styles.badge}>{activeFacetCount}</span>
        )}
      </button>

      <div className={styles.search}>
        <span className={styles.searchIcon} aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search name or SW number…"
          aria-label="Search colors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <span className={styles.count} aria-live="polite">
        {filteredCount.toLocaleString()} of {totalCount.toLocaleString()}
      </span>

      <label className={styles.sortLabel}>
        <span className="sr-only">Sort by</span>
        <select
          className={styles.sortSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort colors"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <Link to="/compare" className="btn-ghost" aria-label="Open comparison">
        Compare{compare.length > 0 ? ` (${compare.length})` : ""}
      </Link>
    </div>
  );
}
