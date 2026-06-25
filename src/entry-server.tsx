import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { routes } from "./routes.js";
import { colorModel } from "./appModel.js";
import {
  BASENAME,
  SITE_ORIGIN,
  SITE_URL,
  colorCanonicalUrl,
  collectionCanonicalUrl,
  collectionsIndexCanonicalUrl,
  collectionOgImageUrl,
  ogImageUrl,
  OG_DEFAULT_IMAGE,
} from "./utils/base.js";
import { colorDescription } from "./utils/seo.js";

// Re-export so the Node prerender script gets the base path from one source.
export { BASE_URL, BASENAME } from "./utils/base.js";
// Re-export the OG SVG builders so the prerender script can rasterize them.
export {
  colorOgSvg,
  collectionOgSvg,
  defaultOgSvg,
} from "./utils/ogTemplate.js";
import { undertone } from "./utils/colorMath.js";
import { toSlug } from "./utils/slug.js";

const handler = createStaticHandler(routes, { basename: BASENAME });

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Open Graph + Twitter image tags shared by every route. */
function ogImageTags(imageUrl: string, alt: string): string[] {
  return [
    `<meta property="og:image" content="${imageUrl}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(alt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:image" content="${imageUrl}">`,
  ];
}

/**
 * Authoritative <head> markup for a route, injected at <!--app-head--> during
 * prerender. Building it here (rather than in React) keeps a single <title>/
 * canonical per page in the static HTML — no client/server head conflicts.
 */
function buildHead(appPath: string): string {
  const tags: string[] = [];
  if (appPath === "/" || appPath === "") {
    const total = colorModel.getActiveColors().length;
    tags.push(
      `<title>Sherwin-Williams Color Atlas — browse ${total} paint colors</title>`,
      `<meta name="description" content="${esc(`Search, filter, and compare ${total} Sherwin-Williams paint colors by color family, undertone, lightness (LRV), and collection.`)}">`,
      `<link rel="canonical" href="${SITE_URL}">`,
      `<meta property="og:site_name" content="Sherwin-Williams Color Atlas">`,
      `<meta property="og:title" content="Sherwin-Williams Color Atlas">`,
      `<meta property="og:description" content="${esc(`Browse, filter, and compare ${total} Sherwin-Williams paint colors.`)}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:url" content="${SITE_URL}">`,
      ...ogImageTags(OG_DEFAULT_IMAGE, "Sherwin-Williams Color Atlas"),
    );
  } else if (appPath === "/compare") {
    tags.push(
      `<title>Compare colors | Sherwin-Williams Color Atlas</title>`,
      `<meta name="robots" content="noindex">`,
      `<meta property="og:title" content="Compare colors | Sherwin-Williams Color Atlas">`,
      ...ogImageTags(OG_DEFAULT_IMAGE, "Sherwin-Williams Color Atlas"),
    );
  } else if (appPath === "/palette") {
    tags.push(
      `<title>My palette | Sherwin-Williams Color Atlas</title>`,
      `<meta name="robots" content="noindex">`,
      `<meta property="og:title" content="My palette | Sherwin-Williams Color Atlas">`,
      ...ogImageTags(OG_DEFAULT_IMAGE, "Sherwin-Williams Color Atlas"),
    );
  } else if (appPath === "/visualizer") {
    const canonical = `${SITE_ORIGIN}${BASENAME}/visualizer/`;
    tags.push(
      `<title>Room Visualizer | Sherwin-Williams Color Atlas</title>`,
      `<meta name="description" content="${esc("Preview Sherwin-Williams paint colors on real room surfaces — pick a scene, switch colors, and try different lighting.")}">`,
      `<link rel="canonical" href="${canonical}">`,
      `<meta property="og:site_name" content="Sherwin-Williams Color Atlas">`,
      `<meta property="og:title" content="Room Visualizer | Sherwin-Williams Color Atlas">`,
      `<meta property="og:description" content="${esc("See a paint color in a real room before you commit.")}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:url" content="${canonical}">`,
      ...ogImageTags(OG_DEFAULT_IMAGE, "Sherwin-Williams Room Visualizer"),
    );
  } else if (appPath === "/collections") {
    tags.push(
      `<title>Color collections | Sherwin-Williams Color Atlas</title>`,
      `<meta name="description" content="${esc("Curated Sherwin-Williams color collections — trend-driven and timeless palettes for every room.")}">`,
      `<link rel="canonical" href="${collectionsIndexCanonicalUrl}">`,
      `<meta property="og:site_name" content="Sherwin-Williams Color Atlas">`,
      `<meta property="og:title" content="Color collections | Sherwin-Williams Color Atlas">`,
      `<meta property="og:description" content="${esc("Curated Sherwin-Williams color collections for every room.")}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:url" content="${collectionsIndexCanonicalUrl}">`,
      ...ogImageTags(OG_DEFAULT_IMAGE, "Sherwin-Williams color collections"),
    );
  } else if (appPath.startsWith("/collections/")) {
    const slug = decodeURIComponent(
      appPath.slice("/collections/".length).replace(/\/$/, ""),
    );
    const collection = colorModel.getCollectionBySlug(slug);
    if (collection) {
      const canonical = collectionCanonicalUrl(slug);
      const title = `${collection.title} — Sherwin-Williams color collection`;
      tags.push(
        `<title>${esc(`${title} | Color Atlas`)}</title>`,
        `<meta name="description" content="${esc(collection.blurb)}">`,
        `<link rel="canonical" href="${canonical}">`,
        `<meta property="og:title" content="${esc(title)}">`,
        `<meta property="og:description" content="${esc(collection.blurb)}">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:url" content="${canonical}">`,
        `<meta property="og:site_name" content="Sherwin-Williams Color Atlas">`,
        ...ogImageTags(
          collectionOgImageUrl(slug),
          `${collection.title} — a curated Sherwin-Williams color collection`,
        ),
      );
    }
  } else if (appPath.startsWith("/colors/")) {
    const slug = decodeURIComponent(
      appPath.slice("/colors/".length).replace(/\/$/, ""),
    );
    const color = colorModel.getColorBySlug(slug);
    if (color) {
      const canonical = colorCanonicalUrl(slug);
      const desc = colorDescription(color);
      tags.push(
        `<title>${esc(`${color.name} — SW ${color.colorNumber} | Sherwin-Williams Color Atlas`)}</title>`,
        `<meta name="description" content="${esc(desc)}">`,
        `<link rel="canonical" href="${canonical}">`,
        `<meta property="og:title" content="${esc(`${color.name} (SW ${color.colorNumber})`)}">`,
        `<meta property="og:description" content="${esc(desc)}">`,
        `<meta property="og:type" content="product">`,
        `<meta property="og:url" content="${canonical}">`,
        `<meta property="og:site_name" content="Sherwin-Williams Color Atlas">`,
        ...ogImageTags(
          ogImageUrl(slug),
          `${color.name} (SW ${color.colorNumber}) paint color swatch`,
        ),
      );
    }
  }
  return tags.join("\n    ");
}

export interface RenderResult {
  html: string;
  head: string;
}

/**
 * Render an app-relative path (e.g. "/" or "/colors/sw-6258-tricorn-black")
 * to its body HTML + head markup for static generation.
 */
export async function render(appPath: string): Promise<RenderResult> {
  const path = appPath === "/" ? "/" : appPath;
  const request = new Request(`http://localhost${BASENAME}${path}`);
  const context = await handler.query(request);

  if (context instanceof Response) {
    throw new Error(
      `Unexpected redirect while prerendering ${appPath} (status ${context.status})`,
    );
  }

  const router = createStaticRouter(handler.dataRoutes, context);
  const html = renderToString(
    <StaticRouterProvider router={router} context={context} />,
  );

  return { html, head: buildHead(path) };
}

/** App-relative paths to prerender: gallery + workspace + collections + colors. */
export function getPrerenderPaths(): string[] {
  return [
    "/",
    "/compare",
    "/palette",
    "/visualizer",
    "/collections",
    ...colorModel.getCollections().map((c) => `/collections/${c.slug}`),
    ...colorModel.getAllSlugs().map((s) => `/colors/${s}`),
  ];
}

/** Absolute URLs for sitemap.xml (gallery + collections + every color page). */
export function getSitemapUrls(): string[] {
  return [
    SITE_URL,
    `${SITE_ORIGIN}${BASENAME}/visualizer/`,
    collectionsIndexCanonicalUrl,
    ...colorModel.getCollections().map((c) => collectionCanonicalUrl(c.slug)),
    ...colorModel.getAllSlugs().map((s) => colorCanonicalUrl(s)),
  ];
}

/** Per-collection OG card data (slug + title + swatch hexes) for the prerender. */
export function getCollectionsOgData(): {
  slug: string;
  title: string;
  hexes: string[];
}[] {
  return colorModel.getCollections().map((c) => ({
    slug: c.slug,
    title: c.title,
    hexes: c.colors.map((color) => color.hex.toUpperCase()),
  }));
}

/** Machine-readable color index (colors.json) for AI/data consumers. */
export function getColorsIndex(): object[] {
  return colorModel.getActiveColors().map((c) => {
    const slug = toSlug(c);
    return {
      slug,
      name: c.name,
      number: c.colorNumber,
      hex: c.hex.toUpperCase(),
      lrv: c.lrv,
      family: c.colorFamilyNames[0] ?? null,
      undertone: undertone(c),
      url: colorCanonicalUrl(slug),
    };
  });
}
