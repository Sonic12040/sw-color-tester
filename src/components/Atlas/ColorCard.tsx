import { memo } from "react";
import { Link } from "react-router";
import type { Color } from "../../data/types.js";
import { hsl, classifyLrv, undertone } from "../../utils/colorPresentation.js";
import { LRV_THRESHOLDS } from "../../utils/config.js";
import { colorPath } from "../../utils/base.js";
import { toSlug } from "../../utils/slug.js";
import styles from "./ColorCard.module.css";

export interface ColorCardProps {
  color: Color;
  isFavorite: boolean;
  isHidden: boolean;
  isComparing: boolean;
  isDesignerPick: boolean;
  compareDisabled: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

function ColorCardImpl({
  color,
  isFavorite,
  isHidden,
  isComparing,
  isDesignerPick,
  compareDisabled,
  onToggleFavorite,
  onToggleHidden,
  onToggleCompare,
}: ColorCardProps) {
  const themeClass =
    color.lrv < LRV_THRESHOLDS.CONTRAST ? styles.dark : styles.light;
  const lrvLabel = classifyLrv(color.lrv);
  const tone = undertone(color);

  return (
    <div
      className={`${styles.card} ${themeClass}`}
      style={{ background: hsl(color) }}
    >
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionBtn} ${isComparing ? styles.actionBtnActive : ""}`}
          aria-label={
            isComparing
              ? `Remove ${color.name} from comparison`
              : `Add ${color.name} to comparison`
          }
          aria-pressed={isComparing}
          disabled={compareDisabled && !isComparing}
          onClick={() => onToggleCompare(color.id)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--tile-btn-text)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="7" height="16" rx="1" />
            <rect x="14" y="4" width="7" height="16" rx="1" />
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.actionBtn} ${isFavorite ? styles.actionBtnActive : ""}`}
          aria-label={
            isFavorite ? `Unfavorite ${color.name}` : `Favorite ${color.name}`
          }
          aria-pressed={isFavorite}
          onClick={() => onToggleFavorite(color.id)}
        >
          <svg
            width="22"
            height="22"
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
        <button
          type="button"
          className={`${styles.actionBtn} ${isHidden ? styles.actionBtnActive : ""}`}
          aria-label={isHidden ? `Unhide ${color.name}` : `Hide ${color.name}`}
          aria-pressed={isHidden}
          onClick={() => onToggleHidden(color.id)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--tile-btn-text)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.61 3.16-4.77 5.66-6.11" />
            <path d="M1 1l22 22" />
          </svg>
        </button>
      </div>

      {(isDesignerPick || color.isInterior !== color.isExterior) && (
        <div className={styles.badges}>
          {isDesignerPick && (
            <span className={styles.badge}>Designer Pick</span>
          )}
          {color.isInterior && !color.isExterior && (
            <span className={styles.badge}>Interior Only</span>
          )}
          {color.isExterior && !color.isInterior && (
            <span className={styles.badge}>Exterior Only</span>
          )}
        </div>
      )}

      <div className={styles.info}>
        <div className={styles.name}>
          <strong>{color.name}</strong>
        </div>
        <div className={styles.number}>SW {color.colorNumber}</div>
        <div className={styles.meta}>
          <span
            className={styles.chip}
            title={`Light Reflectance Value — ${lrvLabel}: reflects ${color.lrv.toFixed(1)}% of light`}
          >
            {lrvLabel} · LRV {color.lrv.toFixed(0)}
          </span>
          <span className={styles.chip}>{tone}</span>
        </div>
        <Link
          to={colorPath(toSlug(color))}
          className={styles.viewBtn}
          aria-label={`See color details and pairings for ${color.name}`}
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

export const ColorCard = memo(ColorCardImpl);
