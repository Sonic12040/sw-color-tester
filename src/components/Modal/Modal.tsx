import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TIMING } from "../../utils/config.js";
import { useAppContext } from "../../context/AppContext.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { ModalContent } from "./ModalContent.js";
import styles from "./Modal.module.css";

interface ModalProps {
  colorId: string | null;
  onClose: () => void;
}

/**
 * Owns the color-detail modal's lifecycle: portal rendering, the close
 * animation, and accessibility (focus trap + return) via {@link useFocusTrap}.
 * Presentation lives in {@link ModalContent}.
 */
export function Modal({ colorId, onClose }: ModalProps) {
  const { openModal } = useAppContext();
  const [closing, setClosing] = useState(false);
  // Holds the last non-null colorId so we can display it during the close
  // animation even after the parent has cleared colorId.
  const displayedIdRef = useRef<string | null>(colorId);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Keep displayedIdRef current whenever a new color is opened (safe during
  // render — ref writes don't trigger re-renders).
  if (colorId) {
    displayedIdRef.current = colorId;
  }

  // Reset closing state when the parent opens a (new or same) color.
  useEffect(() => {
    if (colorId) {
      setClosing(false);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    } else {
      setClosing(false);
    }
  }, [colorId]);

  const close = useCallback(() => {
    if (closeTimerRef.current) return; // a close is already in flight
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, TIMING.CLOSE_ANIMATION_MS);
  }, [onClose]);

  // Clean up a pending close timer on unmount.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useFocusTrap({
    active: colorId !== null,
    containerRef: dialogRef,
    onEscape: close,
    focusKey: colorId,
  });

  // Render while open, or while the close animation is still playing.
  const shouldRender = colorId !== null || closing;
  if (!shouldRender || !displayedIdRef.current) return null;

  return createPortal(
    <div className={`${styles.modalWrapper} ${closing ? styles.closing : ""}`}>
      <ModalContent
        colorId={displayedIdRef.current}
        onClose={close}
        // Navigation updates the parent's colorId directly — single source of truth.
        onNavigate={openModal}
        dialogRef={dialogRef}
      />
    </div>,
    document.body,
  );
}
