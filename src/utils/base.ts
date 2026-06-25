// Single source of truth for the deploy base path, so the Vite `base`
// (trailing slash) and the react-router `basename` (no trailing slash) never
// drift, and so workbox / prerender / sitemap all agree.

/** Vite `base` — has a trailing slash. The one literal everything derives from. */
export const BASE_URL = "/sw-color-tester/";

/** react-router `basename` — no trailing slash (derived from BASE_URL). */
export const BASENAME = BASE_URL.replace(/\/$/, "");

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

/** Absolute URL of a color's prerendered Open Graph image. */
export const ogImageUrl = (slug: string): string =>
  `${SITE_ORIGIN}${BASENAME}/og/${slug}.png`;

/** Absolute URL of the brand-default OG image (gallery / palette / share fallback). */
export const OG_DEFAULT_IMAGE = `${SITE_ORIGIN}${BASENAME}/og/default.png`;

// ── Editorial collections (E12) ───────────────────────────────────────────

/** Router path to a collection landing page (relative to basename). */
export const collectionPath = (slug: string): string => `/collections/${slug}`;

/** Absolute canonical URL for the collections index. */
export const collectionsIndexCanonicalUrl = `${SITE_ORIGIN}${BASENAME}/collections/`;

/** Absolute canonical URL for one collection landing page. */
export const collectionCanonicalUrl = (slug: string): string =>
  `${SITE_ORIGIN}${BASENAME}/collections/${slug}/`;

/** Absolute URL of a collection's prerendered Open Graph image. */
export const collectionOgImageUrl = (slug: string): string =>
  `${SITE_ORIGIN}${BASENAME}/og/collection-${slug}.png`;
