import { describe, it, expect } from "vitest";
import { colorOgSvg, defaultOgSvg, OG_WIDTH, OG_HEIGHT } from "./ogTemplate.js";

describe("colorOgSvg", () => {
  it("renders a 1200×630 card with the color, name, number, and hex", () => {
    const svg = colorOgSvg({
      name: "Tricorn Black",
      number: "6258",
      hex: "#2f2f30",
    });
    expect(svg).toContain(`width="${OG_WIDTH}" height="${OG_HEIGHT}"`);
    expect(svg).toContain('fill="#2F2F30"'); // swatch + uppercased hex
    expect(svg).toContain("Tricorn Black");
    expect(svg).toContain("SW 6258 · #2F2F30");
    expect(svg).toContain("Sherwin-Williams Color Atlas");
  });

  it("escapes markup in the name", () => {
    const svg = colorOgSvg({ name: "Red <b>", number: "0001", hex: "#abcdef" });
    expect(svg).toContain("Red &lt;b&gt;");
    expect(svg).not.toContain("<b>");
  });

  it("truncates very long names with an ellipsis", () => {
    const svg = colorOgSvg({
      name: "A Ridiculously Long Color Name That Overflows The Card",
      number: "0001",
      hex: "#abcdef",
    });
    expect(svg).toContain("…");
    expect(svg).not.toContain("Overflows");
  });
});

describe("defaultOgSvg", () => {
  it("includes a swatch strip from the samples and the brand title", () => {
    const svg = defaultOgSvg(["#aabbcc", "#112233"]);
    expect(svg).toContain('fill="#AABBCC"');
    expect(svg).toContain('fill="#112233"');
    expect(svg).toContain("Sherwin-Williams Color Atlas");
  });

  it("never produces an empty strip when no samples are given", () => {
    const svg = defaultOgSvg([]);
    expect(svg).toContain(`width="${OG_WIDTH}"`);
    expect(svg).toContain("#1b1c20");
  });
});
