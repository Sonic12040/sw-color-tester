import { useNavigate, Link } from "react-router";
import type { Color } from "../../data/types.js";
import {
  hsl,
  describeLrv,
  classifyLrv,
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
 * Full-page color detail (the canonical /colors/:slug view). Uses the gallery's
 * dark design language — dark card, dark title bar, colored hero swatch with
 * dark chips — so it reads as the same product as the browse page.
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
  const lrvBand = classifyLrv(color.lrv);
  const collections = designerCollections(color);
  const useTypes = formatUseTypes(color);
  const isDesignerPick = colorModel.isDesignerPick(color.id);
  const comparing = isComparing(color.id);
  const inPal = inPalette(color.id);

  return (
    <article className={styles.page}>
      <Link to="/" className={styles.back}>
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
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        All colors
      </Link>

      <div className={styles.card}>
        <div className={styles.titleBar}>
          <h1 className={styles.title}>{color.name}</h1>
        </div>

        <div className={styles.swatch} style={{ background: hsl(color) }}>
          <div className={styles.chips}>
            <span className={styles.chip}>SW {color.colorNumber}</span>
            <span className={styles.chip}>
              {lrvBand} · LRV {color.lrv.toFixed(0)}
            </span>
            <span className={styles.chip}>{undertone(color)}</span>
            {useTypes && <span className={styles.chip}>{useTypes}</span>}
            {isDesignerPick && (
              <span className={styles.chip}>Designer Pick</span>
            )}
          </div>
        </div>

        <div className={styles.body}>
          {color.description.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Mood &amp; feel</h2>
              <p className={styles.bodyText}>{color.description.join(" • ")}</p>
            </section>
          )}

          <section>
            <h2 className={styles.sectionTitle}>Lightness</h2>
            <p className={styles.bodyText}>
              <strong>{lrv.label}.</strong> {lrv.context}
            </p>
          </section>

          {collections.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Designer collection</h2>
              <p className={styles.bodyText}>{collections.join(" · ")}</p>
            </section>
          )}

          <ColorGridSection
            title="Coordinating colors"
            description="Colors that work beautifully together"
            colors={coordEntries}
            roleFor={(_c, i) => COORDINATING_ROLES[i] ?? "Coordinating"}
            onNavigate={goToColor}
          />

          <ColorGridSection
            title="Similar colors"
            description="Explore subtle variations"
            colors={similarEntries}
            roleFor={(c, i) => similarityRole(color, c, i)}
            onNavigate={goToColor}
          />

          <HslBreakdown color={color} />

          <section>
            <h2 className={styles.sectionTitle}>Details</h2>
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
          </section>
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
                className={`${styles.actionBtn} ${comparing ? styles.actionBtnActive : ""}`}
                disabled={isFull && !comparing}
                onClick={() => toggleCompare(color.id)}
              >
                {comparing ? "In comparison" : "Add to compare"}
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${inPal ? styles.actionBtnActive : ""}`}
                onClick={() => togglePalette(color.id)}
              >
                {inPal ? "In palette" : "Add to palette"}
              </button>
            </>
          }
        />
      </div>
    </article>
  );
}
