import { useState } from "react";
import { LrvFilter } from "../LrvFilter/LrvFilter.js";
import styles from "./Header.module.css";

interface HeaderProps {
  lrvMin: number;
  lrvMax: number;
  colorCount: number;
  filteredCount: number;
  neutralBg: boolean;
  favoritesCount: number;
  onLrvChange: (min: number, max: number) => void;
  onNeutralBgToggle: () => void;
  onExportFavorites: () => void;
  onClearFavorites: () => void;
  onClearHidden: () => void;
}

export function Header({
  lrvMin,
  lrvMax,
  colorCount,
  filteredCount,
  neutralBg,
  favoritesCount,
  onLrvChange,
  onNeutralBgToggle,
  onExportFavorites,
  onClearFavorites,
  onClearHidden,
}: HeaderProps) {
  const [toolbarOpen, setToolbarOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <h1 className={styles.title}>Sherwin-Williams Color Explorer</h1>
        <button
          type="button"
          id="toolbar-toggle"
          className={styles.toggle}
          aria-expanded={toolbarOpen}
          aria-controls="toolbar-panel"
          aria-label="Toggle menu"
          onClick={() => setToolbarOpen((o) => !o)}
        >
          <span className={styles.hamburger} aria-hidden="true">
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
          </span>
        </button>
      </div>

      {toolbarOpen && (
        <div id="toolbar-panel" className={styles.toolbarPanel}>
          <div className={styles.toolbarContent}>
            {/* LRV Filter */}
            <div className={styles.toolbarSection}>
              <LrvFilter
                lrvMin={lrvMin}
                lrvMax={lrvMax}
                colorCount={colorCount}
                filteredCount={filteredCount}
                onChange={onLrvChange}
              />
            </div>

            {/* Actions */}
            <div className={styles.toolbarSection}>
              <div className={styles.toolbarActions}>
                <button
                  type="button"
                  id="neutral-bg-toggle"
                  className={`${styles.actionBtn} ${neutralBg ? styles.actionBtnPressed : ""}`}
                  aria-pressed={neutralBg}
                  onClick={onNeutralBgToggle}
                  title="Toggle neutral gray background for true color evaluation"
                >
                  Neutral Background
                </button>
                <button
                  type="button"
                  id="export-favorites-btn"
                  className={styles.actionBtn}
                  onClick={onExportFavorites}
                  disabled={favoritesCount === 0}
                >
                  Export Favorites
                </button>
                <button
                  type="button"
                  id="clear-favorites-btn"
                  className={styles.actionBtn}
                  onClick={onClearFavorites}
                  disabled={favoritesCount === 0}
                >
                  Clear All Favorites
                </button>
                <button
                  type="button"
                  id="clear-hidden-btn"
                  className={styles.actionBtn}
                  onClick={onClearHidden}
                >
                  Clear All Hidden Colors
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
