import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Color } from "../../data/types.js";
import {
  LRV_THRESHOLDS,
  DESIGNER_COLLECTION_PREFIX,
} from "../../utils/config.js";
import { useAppContext } from "../../context/AppContext.js";
import { useAppState } from "../../hooks/useAppState.js";
import {
  ToggleFavoriteCommand,
  ToggleHiddenCommand,
} from "../../commands/index.js";
import styles from "./Modal.module.css";

const COORDINATING_ROLES = ["Accent Wall", "Trim Color", "Coordinating"];
const SIMILAR_DIFFERENTIATORS = [
  "Warmer",
  "Cooler",
  "Lighter",
  "Darker",
  "Similar Tone",
  "Alternative",
];

function hsl(c: Color) {
  return `hsl(${c.hue * 360}deg ${c.saturation * 100}% ${c.lightness * 100}%)`;
}

function contrastText(lrv: number) {
  return lrv < LRV_THRESHOLDS.CONTRAST ? "white" : "black";
}

interface MiniTileProps {
  color: Color;
  role: string;
  onClick: (id: string) => void;
}

function MiniTile({ color, role, onClick }: MiniTileProps) {
  return (
    <button
      type="button"
      className={styles.miniTile}
      style={{ background: hsl(color), color: contrastText(color.lrv) }}
      aria-label={`View ${color.name}`}
      onClick={() => onClick(color.id)}
    >
      <div className={styles.miniRole}>{role}</div>
      <div className={styles.miniName}>{color.name}</div>
      <div className={styles.miniNumber}>SW {color.colorNumber}</div>
    </button>
  );
}

interface ModalContentProps {
  colorId: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

function ModalContent({ colorId, onClose, onNavigate }: ModalContentProps) {
  const { colorModel, appState, commandBus } = useAppContext();
  const snapshot = useAppState(appState);
  const color = colorModel.getColorById(colorId);

  if (!color) return null;

  const isFavorite = snapshot.favorites.has(color.id);
  const isHidden = snapshot.hidden.has(color.id);

  const bg = hsl(color);
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

  const lrvValue = color.lrv?.toFixed(1) ?? "N/A";
  let lrvLabel = "Medium";
  let lrvContext = `Reflects ${lrvValue}% of light. Balanced color that works in most spaces.`;
  if (color.lrv < LRV_THRESHOLDS.DARK) {
    lrvLabel = "Dark";
    lrvContext = `Reflects ${lrvValue}% of light. Absorbs most light, creating intimate, cozy spaces.`;
  } else if (color.lrv > LRV_THRESHOLDS.LIGHT) {
    lrvLabel = "Light";
    lrvContext = `Reflects ${lrvValue}% of light. Creates bright, airy, spacious feeling.`;
  }

  const designerCollections = color.brandedCollectionNames
    .filter((n) => n.startsWith(DESIGNER_COLLECTION_PREFIX))
    .map((n) => n.replace(`${DESIGNER_COLLECTION_PREFIX} - `, ""));

  const useTypesText = [
    color.isInterior && "Interior",
    color.isExterior && "Exterior",
  ]
    .filter(Boolean)
    .join(" & ");

  const hue = Math.round(color.hue * 360);
  const sat = Math.round(color.saturation * 100);
  const lig = Math.round(color.lightness * 100);

  const copyHex = () => {
    navigator.clipboard.writeText(color.hex.toUpperCase()).catch(() => {});
    // toast would go here
  };

  const shareColor = () => {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("color", color.id);
    navigator.clipboard.writeText(url.toString()).catch(() => {});
  };

  return (
    <div
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
          style={{ background: bg }}
        >
          <div className={styles.headerContent}>
            <h2 id="modal-title" className={styles.title}>
              {color.name}
            </h2>
            <div className={styles.subtitle}>
              SW {color.colorNumber}
              {useTypesText ? ` • ${useTypesText}` : ""}
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
              <span className={styles.lrvLabel}>{lrvLabel}</span>
              <p className={styles.lrvDesc}>{lrvContext}</p>
            </div>
            {designerCollections.length > 0 && (
              <div className={styles.mood}>
                <span className={styles.moodLabel}>Designer Collection:</span>
                <p className={styles.moodDesc}>
                  {designerCollections.join(" · ")}
                </p>
              </div>
            )}
          </div>

          {/* Coordinating colors */}
          {coordEntries.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Coordinating Colors</h3>
              <p className={styles.sectionDesc}>
                Colors that work beautifully together
              </p>
              <div className={styles.colorGrid}>
                {coordEntries.map((c, i) => (
                  <MiniTile
                    key={c.id}
                    color={c}
                    role={COORDINATING_ROLES[i] ?? "Coordinating"}
                    onClick={onNavigate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Similar colors */}
          {similarEntries.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Similar Colors</h3>
              <p className={styles.sectionDesc}>Explore subtle variations</p>
              <div className={styles.colorGrid}>
                {similarEntries.map((c, i) => {
                  let diff = "Similar";
                  if (c.hue > color.hue + 0.05)
                    diff =
                      c.lightness > color.lightness
                        ? "Warmer & Lighter"
                        : "Warmer";
                  else if (c.hue < color.hue - 0.05)
                    diff =
                      c.lightness > color.lightness
                        ? "Cooler & Lighter"
                        : "Cooler";
                  else if (c.lightness > color.lightness + 0.05)
                    diff = "Lighter";
                  else if (c.lightness < color.lightness - 0.05)
                    diff = "Darker";
                  else diff = SIMILAR_DIFFERENTIATORS[i] ?? "Similar";
                  return (
                    <MiniTile
                      key={c.id}
                      color={c}
                      role={diff}
                      onClick={onNavigate}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* HSL breakdown */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>HSL Color Breakdown</h3>
            <div className={styles.hslItem}>
              <span>Hue</span>
              <span>{hue}°</span>
              <div
                className={styles.hslBar}
                style={{
                  background: `linear-gradient(to right, hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))`,
                }}
              >
                <div
                  className={styles.hslIndicator}
                  style={{ left: `${color.hue * 100}%` }}
                />
              </div>
            </div>
            <div className={styles.hslItem}>
              <span>Saturation</span>
              <span>{sat}%</span>
              <div
                className={styles.hslBar}
                style={{
                  background: `linear-gradient(to right, hsl(${hue},0%,50%), hsl(${hue},100%,50%))`,
                }}
              >
                <div
                  className={styles.hslIndicator}
                  style={{ left: `${sat}%` }}
                />
              </div>
            </div>
            <div className={styles.hslItem}>
              <span>Lightness</span>
              <span>{lig}%</span>
              <div
                className={styles.hslBar}
                style={{
                  background: `linear-gradient(to right, hsl(${hue},${sat}%,0%), hsl(${hue},${sat}%,50%), hsl(${hue},${sat}%,100%))`,
                }}
              >
                <div
                  className={styles.hslIndicator}
                  style={{ left: `${lig}%` }}
                />
              </div>
            </div>
          </div>

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

        {/* Actions footer */}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${isFavorite ? styles.actionBtnActive : ""}`}
            onClick={() =>
              commandBus.execute(new ToggleFavoriteCommand(color.id))
            }
          >
            <svg
              width="20"
              height="20"
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
            <span>{isFavorite ? "Favorited" : "Add to Favorites"}</span>
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={shareColor}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>Share</span>
          </button>
          <button type="button" className={styles.actionBtn} onClick={copyHex}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>Copy Code</span>
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${isHidden ? styles.actionBtnActive : ""}`}
            onClick={() =>
              commandBus.execute(new ToggleHiddenCommand(color.id))
            }
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {isHidden ? (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              ) : (
                <>
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.61 3.16-4.77 5.66-6.11" />
                  <path d="M1 1l22 22" />
                </>
              )}
            </svg>
            <span>{isHidden ? "Hidden" : "Hide Color"}</span>
          </button>
          {color.storeStripLocator && (
            <button type="button" className={styles.actionBtn}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Store: {color.storeStripLocator}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ModalProps {
  colorId: string | null;
  onClose: () => void;
}

export function Modal({ colorId, onClose }: ModalProps) {
  const [closing, setClosing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(colorId);

  // When a new colorId arrives, reset closing state and show it
  useEffect(() => {
    if (colorId) {
      setClosing(false);
      setActiveId(colorId);
    }
  }, [colorId]);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  // Navigate to a related color without closing
  const navigate = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  // Keyboard Escape
  useEffect(() => {
    if (!activeId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeId, close]);

  if (!activeId) return null;

  return createPortal(
    <div className={`${styles.modalWrapper} ${closing ? styles.closing : ""}`}>
      <ModalContent colorId={activeId} onClose={close} onNavigate={navigate} />
    </div>,
    document.body,
  );
}
