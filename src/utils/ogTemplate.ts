/**
 * Open Graph / social-card SVG templates. Pure string builders (no rasterizer,
 * no DOM) so they're unit-testable; the build step (`prerender.mjs`) rasterizes
 * them to PNG with resvg. 1200×630 is the standard OG card size.
 */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Escape text for inclusion in SVG markup. */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Truncate over-long names so they fit the card width. */
function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export interface ColorOgInput {
  name: string;
  number: string;
  hex: string;
}

/**
 * Per-color card: the color fills the card, with a dark band carrying the name,
 * SW number, and hex (white-on-dark for guaranteed contrast).
 */
export function colorOgSvg({ name, number, hex }: ColorOgInput): string {
  const bandY = 440;
  const HEX = hex.toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${esc(HEX)}"/>
  <rect y="${bandY}" width="${OG_WIDTH}" height="${OG_HEIGHT - bandY}" fill="#1b1c20"/>
  <text x="64" y="525" font-family="Roboto" font-weight="700" font-size="60" fill="#ffffff">${esc(clip(name, 28))}</text>
  <text x="64" y="575" font-family="Roboto" font-weight="400" font-size="30" fill="#ffffff" fill-opacity="0.82">SW ${esc(number)} · ${esc(HEX)}</text>
  <text x="${OG_WIDTH - 64}" y="600" text-anchor="end" font-family="Roboto" font-weight="500" font-size="24" fill="#ffffff" fill-opacity="0.7">Sherwin-Williams Color Atlas</text>
</svg>`;
}

export interface CollectionOgInput {
  title: string;
  hexes: string[];
}

/**
 * Editorial-collection card (E12): a band of the collection's swatches across the
 * top, then the collection title + a "curated collection" tagline on dark.
 */
export function collectionOgSvg({ title, hexes }: CollectionOgInput): string {
  const stripH = 280;
  const swatches = hexes.length > 0 ? hexes : ["#1b1c20"];
  const w = OG_WIDTH / swatches.length;
  const strip = swatches
    .map(
      (h, i) =>
        `<rect x="${i * w}" y="0" width="${Math.ceil(w)}" height="${stripH}" fill="${esc(h.toUpperCase())}"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#1b1c20"/>
  ${strip}
  <text x="64" y="${stripH + 110}" font-family="Roboto" font-weight="400" font-size="28" fill="#ffffff" fill-opacity="0.7">Curated collection</text>
  <text x="64" y="${stripH + 175}" font-family="Roboto" font-weight="700" font-size="64" fill="#ffffff">${esc(clip(title, 26))}</text>
  <text x="64" y="${OG_HEIGHT - 48}" font-family="Roboto" font-weight="500" font-size="24" fill="#ffffff" fill-opacity="0.6">Sherwin-Williams Color Atlas</text>
</svg>`;
}

/**
 * Brand-default card (gallery / palette / compare / share fallback): a strip of
 * sample swatches over a dark card with the product name + tagline.
 */
export function defaultOgSvg(sampleHexes: string[]): string {
  const stripH = 130;
  const swatches = sampleHexes.length > 0 ? sampleHexes : ["#1b1c20"];
  const w = OG_WIDTH / swatches.length;
  const strip = swatches
    .map(
      (h, i) =>
        `<rect x="${i * w}" y="0" width="${Math.ceil(w)}" height="${stripH}" fill="${esc(h.toUpperCase())}"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#1b1c20"/>
  ${strip}
  <text x="64" y="345" font-family="Roboto" font-weight="700" font-size="68" fill="#ffffff">Sherwin-Williams Color Atlas</text>
  <text x="64" y="405" font-family="Roboto" font-weight="400" font-size="34" fill="#ffffff" fill-opacity="0.82">Browse, compare &amp; build paint palettes</text>
  <text x="64" y="560" font-family="Roboto" font-weight="500" font-size="26" fill="#ffffff" fill-opacity="0.6">Search, filter, and compare paint colors by family, undertone &amp; LRV</text>
</svg>`;
}
