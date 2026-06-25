/**
 * Embeddable widget helpers (E14) — pure URL/snippet builders for the read-only
 * swatch/palette embed. The embed is a static route (`/embed?c=…&theme=…`) that
 * partners drop into an `<iframe>`; there's no backend and no embed write-path.
 * Back-links carry UTM params so partners' *own* analytics can attribute (we run
 * none of our own). Kept framework-free so it's unit-tested.
 */

export const EMBED_THEMES = ["light", "dark"] as const;
export type EmbedTheme = (typeof EMBED_THEMES)[number];

export const isEmbedTheme = (v: unknown): v is EmbedTheme =>
  v === "light" || v === "dark";

/** Append UTM params to an absolute URL (idempotent-ish; appends, doesn't dedupe). */
export function withUtm(
  url: string,
  {
    source = "embed",
    medium = "widget",
    campaign,
  }: { source?: string; medium?: string; campaign?: string } = {},
): string {
  const sep = url.includes("?") ? "&" : "?";
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
    ...(campaign ? { utm_campaign: campaign } : {}),
  });
  return `${url}${sep}${params.toString()}`;
}

/** Build the embed page URL: `<base>/embed?c=slug,slug&theme=light`. */
export function buildEmbedSrc(
  base: string,
  { slugs, theme }: { slugs: string[]; theme: EmbedTheme },
): string {
  const params = new URLSearchParams();
  if (slugs.length) params.set("c", slugs.join(","));
  params.set("theme", theme);
  return `${base}/embed?${params.toString()}`;
}

/** Build the copy-paste `<iframe>` snippet for an embed `src`. */
export function buildEmbedIframe(
  src: string,
  {
    width,
    height,
    title,
  }: { width: number | string; height: number; title: string },
): string {
  const w = typeof width === "number" ? `${width}` : width;
  return (
    `<iframe src="${src}" width="${w}" height="${height}" ` +
    `style="border:0;width:100%;max-width:${typeof width === "number" ? `${width}px` : width}" ` +
    `loading="lazy" title="${title.replace(/"/g, "&quot;")}"></iframe>`
  );
}

/** Suggested iframe height for a count of colors at a given width (px). */
export function suggestEmbedHeight(count: number, width: number): number {
  if (count <= 1) return 180;
  const perRow = Math.max(1, Math.floor(width / 160));
  const rows = Math.ceil(count / perRow);
  return 96 + rows * 116; // header/footer chrome + ~116px per swatch row
}
