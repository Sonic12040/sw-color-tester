import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

// Build-output assertions over the prerendered dist/ — the SEO/static + Open
// Graph guarantees that used to live in the e2e script. These are filesystem
// checks (no browser), so they belong in a Node project that runs AFTER a build
// (`npm run test:build-output`); they're excluded from the default test run.
const dist = resolve(process.cwd(), "dist");
const sample = readdirSync(resolve(dist, "colors"))[0];
const html = readFileSync(
  resolve(dist, "colors", sample, "index.html"),
  "utf8",
);

describe("prerendered color page (SEO without JS)", () => {
  it("ships an <h1>, JSON-LD, and a <title> in <head>", () => {
    expect(/<h1[\s>]/.test(html)).toBe(true);
    expect(html).toContain("application/ld+json");
    expect(/<head>[\s\S]*?<title>[\s\S]*?<\/head>/.test(html)).toBe(true);
  });

  it("renders the plain-language summary server-side (body + meta description)", () => {
    expect(/is a (deep|mid-tone|light) (warm|cool|neutral) /.test(html)).toBe(
      true,
    );
    expect(
      /<meta name="description" content="[^"]*is a (deep|mid-tone|light)/.test(
        html,
      ),
    ).toBe(true);
  });
});

describe("Open Graph assets", () => {
  it("writes a per-color + default OG image referenced by the page meta", () => {
    expect(existsSync(resolve(dist, "og", `${sample}.png`))).toBe(true);
    expect(existsSync(resolve(dist, "og", "default.png"))).toBe(true);
    expect(
      new RegExp(
        `<meta property="og:image" content="[^"]*/og/${sample}\\.png"`,
      ).test(html),
    ).toBe(true);
    expect(/<meta name="twitter:image"/.test(html)).toBe(true);
  });
});

describe("client presentation board (E13)", () => {
  it("prerenders a noindexed /board shell", () => {
    const page = readFileSync(resolve(dist, "board", "index.html"), "utf8");
    expect(/<title>Color board/.test(page)).toBe(true);
    expect(/<meta name="robots" content="noindex">/.test(page)).toBe(true);
  });
});

describe("embeddable widget (E14)", () => {
  it("prerenders a noindexed /embed fragment", () => {
    const page = readFileSync(resolve(dist, "embed", "index.html"), "utf8");
    expect(/<title>Sherwin-Williams color embed<\/title>/.test(page)).toBe(
      true,
    );
    expect(/<meta name="robots" content="noindex">/.test(page)).toBe(true);
  });

  it("prerenders the /embed-builder page with an authoritative head", () => {
    const page = readFileSync(
      resolve(dist, "embed-builder", "index.html"),
      "utf8",
    );
    expect(/<title>Embed builder/.test(page)).toBe(true);
    expect(/<link rel="canonical"[^>]*\/embed-builder\//.test(page)).toBe(true);
  });
});

describe("room visualizer (E9)", () => {
  it("prerenders /visualizer with an authoritative head", () => {
    const page = readFileSync(
      resolve(dist, "visualizer", "index.html"),
      "utf8",
    );
    expect(/<title>Room Visualizer/.test(page)).toBe(true);
    expect(/<link rel="canonical"[^>]*\/visualizer\//.test(page)).toBe(true);
    expect(/<meta property="og:image"/.test(page)).toBe(true);
  });
});

describe("editorial collections (E12)", () => {
  // Pick a prerendered collection from the SSG output (skip if none authored).
  const collectionsDir = resolve(dist, "collections");
  const slugs = existsSync(collectionsDir)
    ? readdirSync(collectionsDir).filter((d) =>
        existsSync(resolve(collectionsDir, d, "index.html")),
      )
    : [];

  it("prerenders a collections index with JSON-LD + canonical", () => {
    const indexHtml = readFileSync(
      resolve(collectionsDir, "index.html"),
      "utf8",
    );
    expect(/<h1[\s>]/.test(indexHtml)).toBe(true);
    expect(indexHtml).toContain('"@type":"CollectionPage"');
    expect(/<link rel="canonical"[^>]*\/collections\//.test(indexHtml)).toBe(
      true,
    );
  });

  it("prerenders each collection page with ItemList JSON-LD + OG card", () => {
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      const page = readFileSync(
        resolve(collectionsDir, slug, "index.html"),
        "utf8",
      );
      expect(page).toContain('"@type":"ItemList"');
      expect(
        new RegExp(
          `<meta property="og:image" content="[^"]*/og/collection-${slug}\\.png"`,
        ).test(page),
      ).toBe(true);
      expect(existsSync(resolve(dist, "og", `collection-${slug}.png`))).toBe(
        true,
      );
    }
  });
});
