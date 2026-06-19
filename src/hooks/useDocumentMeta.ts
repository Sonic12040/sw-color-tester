import { useEffect } from "react";

/**
 * Client-side document title + meta description updater for SPA navigation.
 * The authoritative `<head>` of prerendered pages is injected at build time
 * (see prerender.mjs / entry-server `buildHead`); this keeps the head correct
 * as the user navigates between routes after hydration. No-op during SSR
 * (effects don't run on the server).
 */
export function useDocumentMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = title;
    if (description === undefined) return;
    let el = document.head.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "description");
      document.head.appendChild(el);
    }
    el.setAttribute("content", description);
  }, [title, description]);
}
