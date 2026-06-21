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
