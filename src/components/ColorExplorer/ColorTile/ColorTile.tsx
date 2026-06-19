import type { Color } from "../../../data/types.js";
import {
  hsl,
  classifyLrv,
  type LrvClass,
} from "../../../utils/colorPresentation.js";
import { LRV_THRESHOLDS } from "../../../utils/config.js";
import { useAppContext } from "../../../context/AppContext.js";
import { useFavorites } from "../../../context/FavoritesContext.js";
import { useHidden } from "../../../context/HiddenContext.js";
import styles from "./ColorTile.module.css";

const LRV_CLASS: Record<LrvClass, string> = {
  Dark: styles.lrvDark,
  Medium: styles.lrvMedium,
  Light: styles.lrvLight,
};

interface ColorTileProps {
  color: Color;
  showFavoriteButton?: boolean;
  showHideButton?: boolean;
}

export function ColorTile({
  color,
  showFavoriteButton = true,
  showHideButton = true,
}: ColorTileProps) {
  const { colorModel, openModal } = useAppContext();
  const { favorites, toggleFavorite } = useFavorites();
  const { toggleHidden } = useHidden();

  const isFavorite = favorites.has(color.id);
  const isDesignerPick = colorModel.isDesignerPick(color.id);

  const themeClass =
    color.lrv < LRV_THRESHOLDS.CONTRAST ? styles.dark : styles.light;
  const lrvLabel = classifyLrv(color.lrv);

  return (
    <div
      className={`${styles.tile} ${themeClass}`}
      style={{ background: hsl(color) }}
    >
      <div className={styles.actions}>
        {showFavoriteButton && (
          <button
            type="button"
            className={styles.actionBtn}
            aria-label={
              isFavorite ? `Unfavorite ${color.name}` : `Favorite ${color.name}`
            }
            onClick={() => toggleFavorite(color.id)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={isFavorite ? "var(--tile-btn-text)" : "none"}
              stroke="var(--tile-btn-text)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}
        {showHideButton && (
          <button
            type="button"
            className={styles.actionBtn}
            aria-label={`Hide ${color.name}`}
            onClick={() => toggleHidden(color.id)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--tile-btn-text)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.61 3.16-4.77 5.66-6.11" />
              <path d="M1 1l22 22" />
            </svg>
          </button>
        )}
      </div>

      {(isDesignerPick || color.isInterior !== color.isExterior) && (
        <div className={styles.badges}>
          {isDesignerPick && (
            <span className={`${styles.badge} ${styles.badgeDesigner}`}>
              Designer Pick
            </span>
          )}
          {color.isInterior && !color.isExterior && (
            <span className={`${styles.badge} ${styles.badgeInterior}`}>
              Interior Only
            </span>
          )}
          {color.isExterior && !color.isInterior && (
            <span className={`${styles.badge} ${styles.badgeExterior}`}>
              Exterior Only
            </span>
          )}
        </div>
      )}

      <div className={styles.info}>
        <div className={styles.name}>
          <strong>{color.name}</strong>
        </div>
        <div className={styles.number}>SW {color.colorNumber}</div>
        <div className={styles.lrvContainer}>
          <span
            className={`${styles.lrv} ${LRV_CLASS[lrvLabel]}`}
            title={`Light Reflectance Value — ${lrvLabel}: reflects ${color.lrv.toFixed(1)}% of light`}
          >
            <span className={styles.lrvLabel}>{lrvLabel}</span>
            <span className={styles.lrvValue}>LRV {color.lrv.toFixed(1)}</span>
          </span>
        </div>
        <button
          type="button"
          className={styles.viewBtn}
          aria-label={`See color details and pairings for ${color.name}`}
          onClick={() => openModal(color.id)}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

interface HiddenFamilyTileProps {
  familyName: string;
  count: number;
}

export function HiddenFamilyTile({ familyName, count }: HiddenFamilyTileProps) {
  const { colorModel } = useAppContext();
  const { actions } = useHidden();

  const unhide = () =>
    actions.removeMultiple(colorModel.getColorIdsForFamily(familyName));

  return (
    <div
      className={`${styles.tile} ${styles.familyTile}`}
      aria-label={`Unhide ${familyName} family`}
    >
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          aria-label={`Unhide all ${familyName} colors`}
          onClick={unhide}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
      <div className={styles.info}>
        <strong>{familyName} Family</strong>
        <br />
        <span className={styles.count}>{count} colors hidden</span>
      </div>
      <div className={styles.iconOverlay} aria-hidden="true">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.61 3.16-4.77 5.66-6.11" />
          <path d="M1 1l22 22" />
        </svg>
      </div>
    </div>
  );
}
