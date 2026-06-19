// Single source of truth for the deploy base path, so the Vite `base`
// (trailing slash) and the react-router `basename` (no trailing slash) never
// drift, and so workbox / prerender / sitemap all agree.

/** Vite `base` — has a trailing slash. */
export const BASE_URL = "/sw-color-tester/";

/** react-router `basename` — no trailing slash. */
export const BASENAME = "/sw-color-tester";

/**
 * Public origin the site is served from, used for canonical URLs, Open Graph,
 * and sitemap.xml. Update this to the real deploy origin.
 */
export const SITE_ORIGIN = "https://sonic12040.github.io";

/** Absolute site root, e.g. https://…/sw-color-tester/ */
export const SITE_URL = SITE_ORIGIN + BASE_URL;

/** Router path to a color detail page (relative to basename). */
export const colorPath = (slug: string): string => `/colors/${slug}`;

/** Absolute canonical URL for a color page (for SEO/sitemap/canonical). */
export const colorCanonicalUrl = (slug: string): string =>
  `${SITE_ORIGIN}${BASENAME}/colors/${slug}/`;
