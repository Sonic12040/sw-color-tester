import type { SortKey } from "../../domain/types.js";
import styles from "./AtlasToolbar.module.css";

interface AtlasToolbarProps {
  search: string;
  onSearchChange: (s: string) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  activeFacetCount: number;
  filteredCount: number;
  totalCount: number;
  onOpenFilters: () => void;
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "family", label: "Family" },
  { key: "hue", label: "Hue" },
  { key: "lrv-asc", label: "LRV: low → high" },
  { key: "lrv-desc", label: "LRV: high → low" },
  { key: "neutral-high", label: "Most neutral" },
  { key: "neutral-low", label: "Most colorful" },
  { key: "name", label: "Name (A–Z)" },
];

export function AtlasToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  activeFacetCount,
  filteredCount,
  totalCount,
  onOpenFilters,
}: AtlasToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.inner}>
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
            className={`field-on-dark ${styles.searchInput}`}
            placeholder="Search name, number, family, collection…"
            aria-label="Search colors"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <span className={styles.count} aria-live="polite">
          {filteredCount.toLocaleString()} of {totalCount.toLocaleString()}
        </span>

        <label className={styles.sortLabel}>
          <span className={styles.sortText}>Sort</span>
          <select
            className="field-on-dark"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            aria-label="Sort colors"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
