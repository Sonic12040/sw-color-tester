import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/**
 * Announces client-side route changes to assistive tech. SPA navigation doesn't
 * trigger a page load, so screen readers stay silent unless we tell them — this
 * polite live region speaks the new page's title after each navigation.
 *
 * Placed last in the layout so its effect runs after the active page's
 * `useDocumentMeta` effect has updated `document.title`. The first render is
 * skipped (the initial document title is already announced by the page load).
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [message, setMessage] = useState("");
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setMessage(`Navigated to ${document.title || pathname}`);
  }, [pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
