import type { Color } from "../../data/types.js";
import { LRV_THRESHOLDS } from "../../utils/config.js";
import {
  hsl,
  describeLrv,
  designerCollections,
  formatUseTypes,
  similarityRole,
  COORDINATING_ROLES,
} from "../../utils/colorPresentation.js";
import { useAppContext } from "../../context/AppContext.js";
import { useFavorites } from "../../context/FavoritesContext.js";
import { useHidden } from "../../context/HiddenContext.js";
import { ColorGridSection } from "./ColorGridSection.js";
import { HslBreakdown } from "./HslBreakdown.js";
import { ModalActions } from "./ModalActions.js";
import styles from "./Modal.module.css";

interface ModalContentProps {
  colorId: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
  dialogRef: React.RefObject<HTMLDivElement | null>;
}

export function ModalContent({
  colorId,
  onClose,
  onNavigate,
  dialogRef,
}: ModalContentProps) {
  const { colorModel } = useAppContext();
  const { favorites, toggleFavorite } = useFavorites();
  const { hidden, toggleHidden } = useHidden();
  const color = colorModel.getColorById(colorId);

  if (!color) return null;

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

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className={styles.overlay}
      id="color-detail-modal"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.container}>
        {/* Header */}
        <div
          className={`${styles.header} ${headerThemeClass}`}
          style={{ background: hsl(color) }}
        >
          <div className={styles.headerContent}>
            <h2 id="modal-title" className={styles.title}>
              {color.name}
            </h2>
            <div className={styles.subtitle}>
              SW {color.colorNumber}
              {useTypes ? ` • ${useTypes}` : ""}
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Close modal"
            onClick={onClose}
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Mood / LRV / Designer */}
          <div className={styles.section}>
            {color.description.length > 0 && (
              <div className={styles.mood}>
                <span className={styles.moodLabel}>Mood &amp; Feel:</span>
                <p className={styles.moodDesc}>
                  {color.description.join(" • ")}
                </p>
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
            onNavigate={onNavigate}
          />

          <ColorGridSection
            title="Similar Colors"
            description="Explore subtle variations"
            colors={similarEntries}
            roleFor={(c, i) => similarityRole(color, c, i)}
            onNavigate={onNavigate}
          />

          <HslBreakdown color={color} />

          {/* Technical details */}
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
        />
      </div>
    </div>
  );
}
