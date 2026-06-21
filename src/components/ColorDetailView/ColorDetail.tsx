import { useNavigate, Link } from "react-router";
import type { Color } from "../../data/types.js";
import { hsl, classifyLrv, undertone } from "../../utils/colorMath.js";
import {
  describeLrv,
  designerCollections,
  formatUseTypes,
  similarityRole,
  summarize,
  COORDINATING_ROLES,
} from "../../utils/colorCopy.js";
import { colorPath } from "../../utils/base.js";
import { toSlug } from "../../utils/slug.js";
import { SW_SAMPLES_URL } from "../../utils/swLinks.js";
import { useAppContext } from "../../context/AppContext.js";
import { useFavorites } from "../../context/FavoritesContext.js";
import { useHidden } from "../../context/HiddenContext.js";
import { useCompare } from "../../context/CompareContext.js";
import { usePalette } from "../../context/PaletteContext.js";
import { ColorGridSection } from "./ColorGridSection.js";
import { SchemeSection } from "./SchemeSection.js";
import { HslBreakdown } from "./HslBreakdown.js";
import { GetColorPanel } from "./GetColorPanel.js";
import { DetailActions } from "./DetailActions.js";
import styles from "./colorDetail.module.css";

interface ColorDetailProps {
  color: Color;
}

/**
 * Full-page color detail (the canonical /colors/:slug view). Dark design language
 * (matching the gallery), laid out as a product-detail "buy box": on desktop the
 * hero swatch sticks on the left while the name, facts, decision actions, and the
 * confidence-building content scroll on the right.
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
  const isFavorite = favorites.has(color.id);

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
        <h1 className={styles.title}>{color.name}</h1>

        <div className={styles.layout}>
          <div className={styles.swatchCol}>
            <div
              className={styles.heroSwatch}
              style={{ background: hsl(color) }}
            >
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
          </div>

          <div className={styles.contentCol}>
            <div className={styles.buyBox}>
              <p className={styles.summary}>{summarize(color)}</p>
              <div className={styles.buyActions}>
                <a
                  className="btn btn-secondary"
                  href={SW_SAMPLES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Order a color sample at Sherwin-Williams (opens in a new tab)"
                >
                  Order a sample
                </a>
                <button
                  type="button"
                  className={`btn btn-on-dark ${isFavorite ? "is-active" : ""}`}
                  aria-pressed={isFavorite}
                  onClick={() => toggleFavorite(color.id)}
                >
                  {isFavorite ? "Favorited" : "Favorite"}
                </button>
                <button
                  type="button"
                  className={`btn btn-on-dark ${inPal ? "is-active" : ""}`}
                  aria-pressed={inPal}
                  onClick={() => togglePalette(color.id)}
                >
                  {inPal ? "In palette" : "Add to palette"}
                </button>
                <button
                  type="button"
                  className={`btn btn-on-dark ${comparing ? "is-active" : ""}`}
                  aria-pressed={comparing}
                  disabled={isFull && !comparing}
                  onClick={() => toggleCompare(color.id)}
                >
                  {comparing ? "In comparison" : "Add to compare"}
                </button>
              </div>
            </div>

            <div className={styles.body}>
              <section>
                <h2 className={styles.sectionTitle}>About this color</h2>
                {color.description.length > 0 && (
                  <p className={styles.bodyText}>
                    {color.description.join(" • ")}
                  </p>
                )}
                <dl className={styles.facts}>
                  <div className={styles.fact}>
                    <dt className={styles.infoLabel}>Undertone</dt>
                    <dd className={styles.factValue}>{undertone(color)}</dd>
                  </div>
                  <div className={styles.fact}>
                    <dt className={styles.infoLabel}>Lightness</dt>
                    <dd className={styles.factValue}>
                      {lrvBand} · LRV {color.lrv.toFixed(0)}
                    </dd>
                  </div>
                  {useTypes && (
                    <div className={styles.fact}>
                      <dt className={styles.infoLabel}>Use</dt>
                      <dd className={styles.factValue}>{useTypes}</dd>
                    </div>
                  )}
                  <div className={styles.fact}>
                    <dt className={styles.infoLabel}>Family</dt>
                    <dd className={styles.factValue}>
                      {color.colorFamilyNames.join(", ") || "—"}
                    </dd>
                  </div>
                  {collections.length > 0 && (
                    <div className={styles.fact}>
                      <dt className={styles.infoLabel}>Collection</dt>
                      <dd className={styles.factValue}>
                        {collections.join(" · ")}
                      </dd>
                    </div>
                  )}
                </dl>
                <p className={styles.bodyText}>
                  <strong>{lrv.label}.</strong> {lrv.context}
                </p>
              </section>

              <ColorGridSection
                title="Coordinating colors"
                description="Colors that work beautifully together"
                colors={coordEntries}
                roleFor={(_c, i) => COORDINATING_ROLES[i] ?? "Coordinating"}
                onNavigate={goToColor}
              />

              <SchemeSection base={color} onNavigate={goToColor} />

              <ColorGridSection
                collapsible
                title="Similar colors"
                description="Explore subtle variations"
                colors={similarEntries}
                roleFor={(c, i) => similarityRole(color, c, i)}
                onNavigate={goToColor}
              />

              <GetColorPanel color={color} />

              <details className={styles.tech}>
                <summary className={styles.techSummary}>
                  Technical details
                </summary>
                <div className={styles.techBody}>
                  <HslBreakdown color={color} />

                  <section>
                    <h2 className={styles.sectionTitle}>Specifications</h2>
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
                        <span>
                          {color.colorFamilyNames.join(", ") || "None"}
                        </span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Collections</span>
                        <span>
                          {color.brandedCollectionNames.join(", ") || "None"}
                        </span>
                      </div>
                    </div>
                  </section>
                </div>
              </details>

              <DetailActions
                color={color}
                isHidden={hidden.has(color.id)}
                onToggleHidden={toggleHidden}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
