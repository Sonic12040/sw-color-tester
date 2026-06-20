// Static-site generation step. Runs AFTER `vite build` (client) and
// `vite build --ssr` (server bundle). Renders the gallery + one HTML page per
// color into dist/, plus sitemap.xml, robots.txt, and colors.json.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, "dist");

const {
  render,
  getPrerenderPaths,
  getSitemapUrls,
  getColorsIndex,
  colorOgSvg,
  defaultOgSvg,
  BASENAME,
} = await import("./dist-server/entry-server.js");

// Roboto WOFFs (from the roboto-fontface dep) embedded so OG text renders the
// same locally and in CI — no system-font dependency.
const require = createRequire(import.meta.url);
const fontBuffers = [
  "Roboto-Regular.woff",
  "Roboto-Medium.woff",
  "Roboto-Bold.woff",
].map((f) =>
  readFileSync(require.resolve(`roboto-fontface/fonts/roboto/${f}`)),
);

/** Rasterize an OG SVG string to a PNG buffer. */
function svgToPng(svg) {
  return new Resvg(svg, {
    font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: "Roboto" },
    fitTo: { mode: "width", value: 1200 },
  })
    .render()
    .asPng();
}

// Use the built client index.html (already has hashed asset tags + PWA SW
// registration) as the shell. Strip its default <title> so the per-route one
// injected at <!--app-head--> is authoritative (exactly one title per page).
const template = readFileSync(resolve(dist, "index.html"), "utf8").replace(
  /<title>.*?<\/title>\s*/s,
  "",
);

/** Map an app path to its output file: "/" → dist/index.html, "/colors/x" → dist/colors/x/index.html */
function outFile(appPath) {
  if (appPath === "/") return resolve(dist, "index.html");
  return resolve(dist, appPath.replace(/^\//, ""), "index.html");
}

const paths = getPrerenderPaths();
let done = 0;

// Render in batches to keep memory bounded across ~2,000 pages.
const BATCH = 50;
for (let i = 0; i < paths.length; i += BATCH) {
  const slice = paths.slice(i, i + BATCH);
  await Promise.all(
    slice.map(async (appPath) => {
      const { html, head } = await render(appPath);
      const page = template
        .replace("<!--app-head-->", head)
        .replace("<!--app-html-->", html);
      const file = outFile(appPath);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, page);
    }),
  );
  done += slice.length;
  process.stdout.write(`\r  prerendered ${done}/${paths.length} pages`);
}
process.stdout.write("\n");

// Open Graph images: one branded card per color + a default for the gallery /
// palette / compare / share fallback. Written after the page render (so workbox,
// which globs at vite-build time, never precaches these ~2k PNGs).
const index = getColorsIndex();
const ogDir = resolve(dist, "og");
mkdirSync(ogDir, { recursive: true });
writeFileSync(
  resolve(ogDir, "default.png"),
  svgToPng(defaultOgSvg(index.slice(0, 12).map((c) => c.hex))),
);
let ogDone = 0;
for (const c of index) {
  writeFileSync(
    resolve(ogDir, `${c.slug}.png`),
    svgToPng(colorOgSvg({ name: c.name, number: c.number, hex: c.hex })),
  );
  ogDone += 1;
  if (ogDone % 100 === 0 || ogDone === index.length) {
    process.stdout.write(`\r  rendered ${ogDone}/${index.length} OG images`);
  }
}
process.stdout.write("\n");

// 404.html — SPA fallback for static hosts (e.g. GitHub Pages). Served for any
// unmatched path, including the base URL without a trailing slash; the client
// router then reads the real URL and renders the right route (the gallery for
// the bare base path, or the NotFound page for a bogus color slug).
const gallery = readFileSync(resolve(dist, "index.html"), "utf8");
writeFileSync(resolve(dist, "404.html"), gallery);

// sitemap.xml
const urls = getSitemapUrls();
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
  `\n</urlset>\n`;
writeFileSync(resolve(dist, "sitemap.xml"), sitemap);

// robots.txt
writeFileSync(
  resolve(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${urls[0].replace(/\/$/, "")}/sitemap.xml\n`,
);

// colors.json (machine-readable index for AI/data consumers)
writeFileSync(
  resolve(dist, "colors.json"),
  JSON.stringify(getColorsIndex(), null, 0),
);

console.log(
  `SSG complete: ${paths.length} pages + sitemap.xml, robots.txt, colors.json (base ${BASENAME})`,
);
