import type { Color } from "../../../data/types.js";
import { LRV_THRESHOLDS } from "../../../utils/config.js";
import styles from "./ColorTile.module.css";

interface ColorTileProps {
  color: Color;
  isFavorite: boolean;
  isHidden: boolean;
  isDesignerPick: boolean;
  showFavoriteButton?: boolean;
  showHideButton?: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onView: (id: string) => void;
}

function getLrvLabel(lrv: number): { label: string; cls: string } {
  if (lrv < LRV_THRESHOLDS.DARK) return { label: "Dark", cls: styles.lrvDark };
  if (lrv > LRV_THRESHOLDS.LIGHT)
    return { label: "Light", cls: styles.lrvLight };
  return { label: "Medium", cls: styles.lrvMedium };
}

export function ColorTile({
  color,
  isFavorite,
  isHidden: _isHidden,
  isDesignerPick,
  showFavoriteButton = true,
  showHideButton = true,
  onToggleFavorite,
  onToggleHidden,
  onView,
}: ColorTileProps) {
  const bg = `hsl(${color.hue * 360}deg ${color.saturation * 100}% ${color.lightness * 100}%)`;
  const themeClass =
    color.lrv < LRV_THRESHOLDS.CONTRAST ? styles.dark : styles.light;
  const { label: lrvLabel, cls: lrvCls } = getLrvLabel(color.lrv);

  return (
    <div
      className={`${styles.tile} ${themeClass}`}
      style={{ background: bg }}
      data-id={color.id}
    >
      <div className={styles.actions}>
        {showFavoriteButton && (
          <button
            type="button"
            className={styles.actionBtn}
            aria-label={
              isFavorite ? `Unfavorite ${color.name}` : `Favorite ${color.name}`
            }
            onClick={() => onToggleFavorite(color.id)}
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
            onClick={() => onToggleHidden(color.id)}
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
            className={`${styles.lrv} ${lrvCls}`}
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
          onClick={() => onView(color.id)}
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
  onUnhide: (familyName: string) => void;
}

export function HiddenFamilyTile({
  familyName,
  count,
  onUnhide,
}: HiddenFamilyTileProps) {
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
          onClick={() => onUnhide(familyName)}
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
