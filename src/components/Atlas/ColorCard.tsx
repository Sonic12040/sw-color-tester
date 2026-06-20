import { memo } from "react";
import { Link } from "react-router";
import type { Color } from "../../data/types.js";
import { hsl, classifyLrv, undertone } from "../../utils/colorMath.js";
import { colorPath } from "../../utils/base.js";
import { toSlug } from "../../utils/slug.js";
import styles from "./ColorCard.module.css";

export interface ColorCardProps {
  color: Color;
  isFavorite: boolean;
  isHidden: boolean;
  isComparing: boolean;
  inPalette: boolean;
  isDesignerPick: boolean;
  compareDisabled: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onTogglePalette: (id: string) => void;
}

function ColorCardImpl({
  color,
  isFavorite,
  isHidden,
  isComparing,
  inPalette,
  isDesignerPick,
  compareDisabled,
  onToggleFavorite,
  onToggleHidden,
  onToggleCompare,
  onTogglePalette,
}: ColorCardProps) {
  const lrvLabel = classifyLrv(color.lrv);
  const tone = undertone(color);

  return (
    <article className={styles.card} style={{ background: hsl(color) }}>
      {/* Clicking the swatch / info opens the detail page. */}
      <Link
        to={colorPath(toSlug(color))}
        className={styles.face}
        aria-label={`See color details and pairings for ${color.name}`}
      >
        {/* Dark title bar (mirrors the action bar) so the name is always light. */}
        <div className={styles.titleBar}>
          <span className={styles.name}>{color.name}</span>
        </div>

        <div className={styles.body}>
          <div className={styles.meta}>
            <span
              className={styles.chip}
              title={`Light Reflectance Value — ${lrvLabel}: reflects ${color.lrv.toFixed(1)}% of light`}
            >
              {lrvLabel}
            </span>
            <span className={styles.chip}>{tone}</span>
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
        </div>
      </Link>

      {/* Action bar: full-width, equal-width targets so nothing crowds a corner. */}
      <div
        className={styles.actions}
        role="group"
        aria-label={`Actions for ${color.name}`}
      >
        <button
          type="button"
          className={`${styles.actionBtn} ${isFavorite ? styles.actionBtnActive : ""}`}
          aria-label={
            isFavorite ? `Unfavorite ${color.name}` : `Favorite ${color.name}`
          }
          aria-pressed={isFavorite}
          title={isFavorite ? "Favorited" : "Add to favorites"}
          onClick={() => onToggleFavorite(color.id)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
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
          className={`${styles.actionBtn} ${inPalette ? styles.actionBtnActive : ""}`}
          aria-label={
            inPalette
              ? `Remove ${color.name} from palette`
              : `Add ${color.name} to palette`
          }
          aria-pressed={inPalette}
          title={inPalette ? "In palette" : "Add to palette"}
          onClick={() => onTogglePalette(color.id)}
        >
          {inPalette ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              stroke="none"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3 0 5.5-2.5 5.5-5.5C21.5 6 17.5 2 12 2zM6.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm2-5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5-1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
              />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle
                cx="13.5"
                cy="6.5"
                r=".75"
                fill="currentColor"
                stroke="none"
              />
              <circle
                cx="17"
                cy="12"
                r=".75"
                fill="currentColor"
                stroke="none"
              />
              <circle
                cx="6.5"
                cy="12"
                r=".75"
                fill="currentColor"
                stroke="none"
              />
              <circle
                cx="8.5"
                cy="7.5"
                r=".75"
                fill="currentColor"
                stroke="none"
              />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3 0 5.5-2.5 5.5-5.5C21.5 6 17.5 2 12 2z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className={`${styles.actionBtn} ${isComparing ? styles.actionBtnActive : ""}`}
          aria-label={
            isComparing
              ? `Remove ${color.name} from comparison`
              : `Add ${color.name} to comparison`
          }
          aria-pressed={isComparing}
          title={isComparing ? "In comparison" : "Add to compare"}
          disabled={compareDisabled && !isComparing}
          onClick={() => onToggleCompare(color.id)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path
              fill={isComparing ? "currentColor" : "none"}
              d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"
            />
            <path
              fill={isComparing ? "currentColor" : "none"}
              d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"
            />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
          </svg>
        </button>

        <button
          type="button"
          className={`${styles.actionBtn} ${isHidden ? styles.actionBtnActive : ""}`}
          aria-label={isHidden ? `Unhide ${color.name}` : `Hide ${color.name}`}
          aria-pressed={isHidden}
          title={isHidden ? "Hidden" : "Hide color"}
          onClick={() => onToggleHidden(color.id)}
        >
          {isHidden ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* filled eye-off = hidden state */}
              <path
                fill="currentColor"
                stroke="none"
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
                fill="var(--bar-bg)"
                stroke="none"
              />
              <path stroke="var(--bar-bg)" strokeWidth="3" d="M3 3l18 18" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* outline open eye = visible */}
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </article>
  );
}

export const ColorCard = memo(ColorCardImpl);
