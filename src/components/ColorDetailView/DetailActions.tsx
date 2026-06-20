import type { Color } from "../../data/types.js";
import { copyText } from "../../utils/clipboard.js";
import { useToast } from "../Toast/Toast.js";
import styles from "./colorDetail.module.css";

interface DetailActionsProps {
  color: Color;
  isFavorite: boolean;
  isHidden: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleHidden: (id: string) => void;
  /** Optional extra buttons (e.g. compare / palette) appended to the footer. */
  extraActions?: React.ReactNode;
}

/** Footer actions for the color detail: favorite, copy hex, hide, store locator. */
export function DetailActions({
  color,
  isFavorite,
  isHidden,
  onToggleFavorite,
  onToggleHidden,
  extraActions,
}: DetailActionsProps) {
  const showToast = useToast();

  const copyHex = async () => {
    const hex = color.hex.toUpperCase();
    showToast(
      (await copyText(hex)) ? `Copied ${hex}` : "Couldn't copy to clipboard",
    );
  };

  const copyStore = async () => {
    const loc = color.storeStripLocator;
    if (!loc) return;
    showToast(
      (await copyText(loc))
        ? `Copied store location ${loc}`
        : "Couldn't copy to clipboard",
    );
  };

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={`btn btn-on-dark ${isFavorite ? "is-active" : ""}`}
        onClick={() => onToggleFavorite(color.id)}
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
      <button type="button" className="btn btn-on-dark" onClick={copyHex}>
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
        className={`btn btn-on-dark ${isHidden ? "is-active" : ""}`}
        onClick={() => onToggleHidden(color.id)}
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
        <button
          type="button"
          className="btn btn-on-dark"
          onClick={copyStore}
          aria-label={`Copy store location ${color.storeStripLocator}`}
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
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>Store: {color.storeStripLocator}</span>
        </button>
      )}
      {extraActions}
    </div>
  );
}
