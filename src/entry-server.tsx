import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { routes } from "./routes.js";
import { colorModel } from "./appModel.js";
import { BASENAME, SITE_URL, colorCanonicalUrl } from "./utils/base.js";
import { colorDescription } from "./utils/seo.js";
import { undertone } from "./utils/colorPresentation.js";
import { toSlug } from "./utils/slug.js";

const handler = createStaticHandler(routes, { basename: BASENAME });

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    );
  } else if (appPath === "/compare") {
    tags.push(
      `<title>Compare colors | Sherwin-Williams Color Atlas</title>`,
      `<meta name="robots" content="noindex">`,
    );
  } else if (appPath === "/palette") {
    tags.push(
      `<title>My palette | Sherwin-Williams Color Atlas</title>`,
      `<meta name="robots" content="noindex">`,
    );
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

/** App-relative paths to prerender: gallery + workspace + one page per color. */
export function getPrerenderPaths(): string[] {
  return [
    "/",
    "/compare",
    "/palette",
    ...colorModel.getAllSlugs().map((s) => `/colors/${s}`),
  ];
}

/** Absolute URLs for sitemap.xml (gallery + every color page). */
export function getSitemapUrls(): string[] {
  return [
    SITE_URL,
    ...colorModel.getAllSlugs().map((s) => colorCanonicalUrl(s)),
  ];
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
