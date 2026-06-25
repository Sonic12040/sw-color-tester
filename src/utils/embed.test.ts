import { describe, it, expect } from "vitest";
import {
  buildEmbedIframe,
  buildEmbedSrc,
  isEmbedTheme,
  suggestEmbedHeight,
  withUtm,
} from "./embed.js";

describe("withUtm", () => {
  it("appends default embed UTM params", () => {
    const u = new URL(withUtm("https://x.test/sw/colors/a/"));
    expect(u.searchParams.get("utm_source")).toBe("embed");
    expect(u.searchParams.get("utm_medium")).toBe("widget");
  });
  it("respects an existing query string and a campaign", () => {
    const out = withUtm("https://x.test/p?a=1", { campaign: "spring" });
    expect(out).toContain("a=1&utm_source=embed");
    expect(out).toContain("utm_campaign=spring");
  });
});

describe("buildEmbedSrc", () => {
  it("builds an /embed URL carrying the slugs + theme", () => {
    const src = buildEmbedSrc("https://x.test/sw-color-tester", {
      slugs: ["a", "b"],
      theme: "dark",
    });
    const u = new URL(src);
    expect(u.pathname).toBe("/sw-color-tester/embed");
    expect(u.searchParams.get("c")).toBe("a,b");
    expect(u.searchParams.get("theme")).toBe("dark");
  });
});

describe("buildEmbedIframe", () => {
  it("produces an iframe with the src, lazy loading, and a title", () => {
    const html = buildEmbedIframe("https://x.test/embed?c=a", {
      width: 600,
      height: 200,
      title: 'Colors "x"',
    });
    expect(html).toContain('<iframe src="https://x.test/embed?c=a"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('height="200"');
    expect(html).toContain("&quot;x&quot;"); // title quotes escaped
  });
});

describe("suggestEmbedHeight", () => {
  it("is compact for a single swatch and grows with rows", () => {
    expect(suggestEmbedHeight(1, 600)).toBeLessThan(suggestEmbedHeight(8, 600));
    expect(suggestEmbedHeight(0, 600)).toBeGreaterThan(0);
  });
});

describe("isEmbedTheme", () => {
  it("accepts only known themes", () => {
    expect(isEmbedTheme("light")).toBe(true);
    expect(isEmbedTheme("dark")).toBe(true);
    expect(isEmbedTheme("neon")).toBe(false);
  });
});
