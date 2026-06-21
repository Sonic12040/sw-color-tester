import type { Color } from "../../data/types.js";
import { copyText } from "../../utils/clipboard.js";
import { useToast } from "../Toast/Toast.js";
import styles from "./colorDetail.module.css";

interface DetailActionsProps {
  color: Color;
  isHidden: boolean;
  onToggleHidden: (id: string) => void;
}

/**
 * Tertiary utility footer for the color detail: copy the hex, hide the color,
 * copy the in-store rack location. Low-intent actions, so they're styled quietly
 * (the decision actions — favorite / palette / compare — live in the buy box).
 */
export function DetailActions({
  color,
  isHidden,
  onToggleHidden,
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
    <div className={styles.footer}>
      <button type="button" className={styles.footerBtn} onClick={copyHex}>
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
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>Copy Code</span>
      </button>

      <button
        type="button"
        className={`${styles.footerBtn} ${isHidden ? styles.footerBtnActive : ""}`}
        aria-pressed={isHidden}
        onClick={() => onToggleHidden(color.id)}
      >
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
        <span>{isHidden ? "Hidden" : "Hide color"}</span>
      </button>

      {color.storeStripLocator && (
        <button
          type="button"
          className={styles.footerBtn}
          onClick={copyStore}
          aria-label={`Copy store location ${color.storeStripLocator}`}
        >
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
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>Store: {color.storeStripLocator}</span>
        </button>
      )}
    </div>
  );
}
