import { memo } from "react";
import { Link } from "react-router";
import type { Color } from "../../data/types.js";
import { hsl, classifyLrv, undertone } from "../../utils/colorMath.js";
import { colorPath } from "../../utils/base.js";
import { toSlug } from "../../utils/slug.js";
import {
  HeartIcon,
  PaletteIcon,
  CompareIcon,
  EyeIcon,
} from "../icons/Icons.js";
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
          <HeartIcon size={22} filled={isFavorite} />
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
          <PaletteIcon size={22} filled={inPalette} />
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
          <CompareIcon size={22} filled={isComparing} />
        </button>

        <button
          type="button"
          className={`${styles.actionBtn} ${isHidden ? styles.actionBtnActive : ""}`}
          aria-label={isHidden ? `Unhide ${color.name}` : `Hide ${color.name}`}
          aria-pressed={isHidden}
          title={isHidden ? "Hidden" : "Hide color"}
          onClick={() => onToggleHidden(color.id)}
        >
          <EyeIcon size={22} hidden={isHidden} />
        </button>
      </div>
    </article>
  );
}

export const ColorCard = memo(ColorCardImpl);
