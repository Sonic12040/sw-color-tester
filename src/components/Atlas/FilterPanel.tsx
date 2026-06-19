import { useAppContext } from "../../context/AppContext.js";
import { useFilters } from "../../context/FiltersContext.js";
import {
  UNDERTONES,
  LRV_CLASSES,
  type LrvClass,
} from "../../utils/colorPresentation.js";
import { LRV_THRESHOLDS } from "../../utils/config.js";
import type { AtlasView } from "../../models/ColorModel.js";
import styles from "./FilterPanel.module.css";

interface FilterPanelProps {
  /** Drawer-only: dismiss the panel. */
  onClose?: () => void;
}

const VIEWS: { key: AtlasView; label: string }[] = [
  { key: "all", label: "All" },
  { key: "favorites", label: "Favorites" },
  { key: "hidden", label: "Hidden" },
];

const UNDERTONE_DOT: Record<string, string> = {
  Warm: "var(--undertone-warm)",
  Cool: "var(--undertone-cool)",
  Neutral: "var(--undertone-neutral)",
};

const LIGHTNESS_HINT: Record<LrvClass, string> = {
  Dark: `LRV < ${LRV_THRESHOLDS.DARK}`,
  Medium: `LRV ${LRV_THRESHOLDS.DARK}–${LRV_THRESHOLDS.LIGHT}`,
  Light: `LRV > ${LRV_THRESHOLDS.LIGHT}`,
};

/**
 * The faceted filter controls. Rendered once — its wrapper (AtlasLayout)
 * positions it as a persistent rail (≥1024px) or a slide-in drawer (<1024px).
 */
export function FilterPanel({ onClose }: FilterPanelProps) {
  const { colorModel } = useAppContext();
  const {
    families,
    undertones,
    lightness,
    useType,
    collections,
    designerOnly,
    view,
    activeFacetCount,
    toggleFamily,
    toggleUndertone,
    toggleLightness,
    setUseType,
    toggleCollection,
    setDesignerOnly,
    setView,
    resetAll,
  } = useFilters();

  const familyNames = colorModel.getOrderedFamilies();
  const collectionNames = colorModel.getCollectionNames();

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Filters</h2>
        {onClose && (
          <button
            type="button"
            className={`btn-primary ${styles.done}`}
            onClick={onClose}
          >
            Done
          </button>
        )}
      </div>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Show</legend>
        <div className={styles.segmented} role="group" aria-label="View">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              className={styles.segment}
              aria-pressed={view === v.key}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Color family</legend>
        <div className={styles.checkList}>
          {familyNames.map((f) => (
            <label key={f} className={styles.check}>
              <input
                type="checkbox"
                checked={families.includes(f)}
                onChange={() => toggleFamily(f)}
              />
              {f}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Undertone</legend>
        <div className={styles.checkList}>
          {UNDERTONES.map((u) => (
            <label key={u} className={styles.check}>
              <input
                type="checkbox"
                checked={undertones.includes(u)}
                onChange={() => toggleUndertone(u)}
              />
              <span
                className={styles.chipDot}
                style={{ background: UNDERTONE_DOT[u] }}
                aria-hidden="true"
              />
              {u}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Lightness (LRV)</legend>
        <div className={styles.checkList}>
          {LRV_CLASSES.map((l) => (
            <label key={l} className={styles.check}>
              <input
                type="checkbox"
                checked={lightness.includes(l)}
                onChange={() => toggleLightness(l)}
              />
              {l}
              <span className={styles.checkHint}>{LIGHTNESS_HINT[l]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Use</legend>
        <div className={styles.segmented} role="group" aria-label="Use type">
          <button
            type="button"
            className={styles.segment}
            aria-pressed={useType === null}
            onClick={() => setUseType(null)}
          >
            Any
          </button>
          <button
            type="button"
            className={styles.segment}
            aria-pressed={useType === "interior"}
            onClick={() => setUseType("interior")}
          >
            Interior
          </button>
          <button
            type="button"
            className={styles.segment}
            aria-pressed={useType === "exterior"}
            onClick={() => setUseType("exterior")}
          >
            Exterior
          </button>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Collection</legend>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={designerOnly}
            onChange={(e) => setDesignerOnly(e.target.checked)}
          />
          Designer Picks only
        </label>
        <div className={styles.collectionList}>
          {collectionNames.map((c) => (
            <label key={c} className={styles.check}>
              <input
                type="checkbox"
                checked={collections.includes(c)}
                onChange={() => toggleCollection(c)}
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        className={`btn-secondary ${styles.clearBtn}`}
        onClick={resetAll}
        disabled={activeFacetCount === 0}
      >
        Clear all filters{activeFacetCount > 0 ? ` (${activeFacetCount})` : ""}
      </button>
    </div>
  );
}
