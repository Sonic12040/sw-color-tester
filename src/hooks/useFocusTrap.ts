import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FocusTrapOptions {
  /** Whether the trap is engaged (e.g. the dialog is open). */
  active: boolean;
  /** The element to trap focus within. Must be focusable (e.g. `tabIndex={-1}`). */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Called when Escape is pressed while active. */
  onEscape?: () => void;
  /**
   * When this value changes while `active`, focus is moved back into the
   * container — useful when the container's content is swapped (e.g. navigating
   * between items) and the previously focused element was unmounted.
   */
  focusKey?: unknown;
}

/**
 * Full modal focus management:
 * - moves focus into `containerRef` when activated (capturing the prior focus),
 * - traps Tab so focus cycles within the container,
 * - closes on Escape via `onEscape`,
 * - restores focus to the opener when deactivated.
 */
export function useFocusTrap({
  active,
  containerRef,
  onEscape,
  focusKey,
}: FocusTrapOptions): void {
  const openerRef = useRef<HTMLElement | null>(null);

  // Move focus in on activate / restore to the opener on deactivate. The opener
  // is captured only on the initial activation (before focus moves inside).
  useEffect(() => {
    if (active) {
      openerRef.current ??= document.activeElement as HTMLElement | null;
      containerRef.current?.focus();
    } else if (openerRef.current) {
      openerRef.current.focus?.();
      openerRef.current = null;
    }
  }, [active, focusKey, containerRef]);

  // Trap Tab and handle Escape while active.
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      const outside = activeEl === container || !container.contains(activeEl);

      if (e.shiftKey && (activeEl === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (activeEl === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onEscape, containerRef]);
}
