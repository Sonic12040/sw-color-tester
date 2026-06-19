import { useNavigate, Link } from "react-router";
import type { Color } from "../../data/types.js";
import { LRV_THRESHOLDS } from "../../utils/config.js";
import {
  hsl,
  describeLrv,
  designerCollections,
  formatUseTypes,
  similarityRole,
  undertone,
  COORDINATING_ROLES,
} from "../../utils/colorPresentation.js";
import { colorPath } from "../../utils/base.js";
import { toSlug } from "../../utils/slug.js";
import { useAppContext } from "../../context/AppContext.js";
import { useFavorites } from "../../context/FavoritesContext.js";
import { useHidden } from "../../context/HiddenContext.js";
import { useCompare } from "../../context/CompareContext.js";
import { usePalette } from "../../context/PaletteContext.js";
import { ColorGridSection } from "./ColorGridSection.js";
import { HslBreakdown } from "./HslBreakdown.js";
import { ModalActions } from "./ModalActions.js";
import styles from "./Modal.module.css";

interface ColorDetailProps {
  color: Color;
}

/**
 * Full-page color detail (the canonical /colors/:slug view). Shares the layout
 * pieces that used to live in the modal; coordinating/similar tiles navigate to
 * their own canonical pages.
 */
export function ColorDetail({ color }: ColorDetailProps) {
  const { colorModel } = useAppContext();
  const { favorites, toggleFavorite } = useFavorites();
  const { hidden, toggleHidden } = useHidden();
  const { isComparing, toggleCompare, isFull } = useCompare();
  const { inPalette, togglePalette } = usePalette();
  const navigate = useNavigate();

  const goToColor = (id: string) => {
    const target = colorModel.getColorById(id);
    if (target) navigate(colorPath(toSlug(target)));
  };

  const headerThemeClass =
    color.lrv < LRV_THRESHOLDS.CONTRAST
      ? styles.headerDark
      : styles.headerLight;

  const coordEntries = [
    color.coordinatingColors?.coord1ColorId,
    color.coordinatingColors?.coord2ColorId,
    color.coordinatingColors?.whiteColorId,
  ]
    .filter(Boolean)
    .map((id) => colorModel.getColorById(id!))
    .filter(Boolean) as Color[];

  const similarEntries = color.similarColors
    .slice(0, 6)
    .map((id) => colorModel.getColorById(id))
    .filter(Boolean) as Color[];

  const lrv = describeLrv(color.lrv);
  const collections = designerCollections(color);
  const useTypes = formatUseTypes(color);
  const comparing = isComparing(color.id);
  const inPal = inPalette(color.id);

  return (
    <article className={styles.container}>
      <div
        className={`${styles.header} ${headerThemeClass}`}
        style={{ background: hsl(color) }}
      >
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{color.name}</h1>
          <div className={styles.subtitle}>
            SW {color.colorNumber}
            {useTypes ? ` • ${useTypes}` : ""} • {undertone(color)} undertone
          </div>
        </div>
        <Link
          to="/"
          className={styles.closeBtn}
          aria-label="Back to all colors"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
      </div>

      <div className={styles.body}>
        <div className={styles.section}>
          {color.description.length > 0 && (
            <div className={styles.mood}>
              <span className={styles.moodLabel}>Mood &amp; Feel:</span>
              <p className={styles.moodDesc}>{color.description.join(" • ")}</p>
            </div>
          )}
          <div className={styles.lrvContext}>
            <span className={styles.lrvLabel}>{lrv.label}</span>
            <p className={styles.lrvDesc}>{lrv.context}</p>
          </div>
          {collections.length > 0 && (
            <div className={styles.mood}>
              <span className={styles.moodLabel}>Designer Collection:</span>
              <p className={styles.moodDesc}>{collections.join(" · ")}</p>
            </div>
          )}
        </div>

        <ColorGridSection
          title="Coordinating Colors"
          description="Colors that work beautifully together"
          colors={coordEntries}
          roleFor={(_c, i) => COORDINATING_ROLES[i] ?? "Coordinating"}
          onNavigate={goToColor}
        />

        <ColorGridSection
          title="Similar Colors"
          description="Explore subtle variations"
          colors={similarEntries}
          roleFor={(c, i) => similarityRole(color, c, i)}
          onNavigate={goToColor}
        />

        <HslBreakdown color={color} />

        <div className={styles.section}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Hex</span>
              <span>{color.hex.toUpperCase()}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>RGB</span>
              <span>
                rgb({color.red}, {color.green}, {color.blue})
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Family</span>
              <span>{color.colorFamilyNames.join(", ") || "None"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Collections</span>
              <span>{color.brandedCollectionNames.join(", ") || "None"}</span>
            </div>
          </div>
        </div>
      </div>

      <ModalActions
        color={color}
        isFavorite={favorites.has(color.id)}
        isHidden={hidden.has(color.id)}
        onToggleFavorite={toggleFavorite}
        onToggleHidden={toggleHidden}
        extraActions={
          <>
            <button
              type="button"
              className={comparing ? "btn-primary" : "btn-secondary"}
              disabled={isFull && !comparing}
              onClick={() => toggleCompare(color.id)}
            >
              {comparing ? "In comparison" : "Add to compare"}
            </button>
            <button
              type="button"
              className={inPal ? "btn-primary" : "btn-secondary"}
              onClick={() => togglePalette(color.id)}
            >
              {inPal ? "In palette" : "Add to palette"}
            </button>
          </>
        }
      />
    </article>
  );
}
