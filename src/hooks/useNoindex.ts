import { useEffect } from "react";

/**
 * Adds `<meta name="robots" content="noindex">` to the document head while
 * mounted, removing it on unmount.
 *
 * Static hosts (GitHub Pages) can't return a real 404 status for client-routed
 * "not found" views, so search engines could otherwise index these soft-404
 * pages. Crawlers that execute JS will see the noindex and drop the page.
 */
export function useNoindex(): void {
  useEffect(() => {
    const el = document.createElement("meta");
    el.setAttribute("name", "robots");
    el.setAttribute("content", "noindex");
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
}
