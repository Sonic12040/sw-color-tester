import { describe, it, expect } from "vitest";

// Minimal WCAG 2.x contrast math, used to guard the color choices made for the
// dark chrome (header / toolbar / rail / tiles). If a token is changed below a
// threshold, this test fails.

type RGB = [number, number, number];

function hex(h: string): RGB {
  const n = h.replace("#", "");
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

/** Composite a translucent foreground over an opaque background. */
function over([r, g, b, a]: [number, number, number, number], bg: RGB): RGB {
  return [
    Math.round(r * a + bg[0] * (1 - a)),
    Math.round(g * a + bg[1] * (1 - a)),
    Math.round(b * a + bg[2] * (1 - a)),
  ];
}

const white = (a: number): [number, number, number, number] => [
  255,
  255,
  255,
  a,
];

function relLum([r, g, b]: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a: RGB, b: RGB): number {
  const [l1, l2] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const BAR = hex("#1b1c20"); // header / toolbar / rail / tile bars
const GUTTER = hex("#808080"); // neutral page background between cards
const INPUT_BG = over(white(0.08), BAR); // search / sort field fill on the toolbar

const AA = 4.5;
const AAA = 7;
const NON_TEXT = 3;

describe("text contrast (AAA, 7:1) on the dark chrome", () => {
  const cases: [string, RGB, RGB][] = [
    ["title-bar / brand name", hex("#ffffff"), BAR],
    ["nav links", over(white(0.78), BAR), BAR],
    ["toolbar count", over(white(0.72), BAR), BAR],
    ["search placeholder", over(white(0.72), INPUT_BG), INPUT_BG],
    ["favorites count (amber)", hex("#fbbf24"), BAR],
    ["filter legends", over(white(0.82), BAR), BAR],
    ["checkbox labels", over(white(0.92), BAR), BAR],
    ["LRV hint", over(white(0.66), BAR), BAR],
  ];
  for (const [name, fg, bg] of cases) {
    it(`${name} ≥ 7:1`, () => {
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(AAA);
    });
  }
});

describe("chip/badge text contrast over the worst-case (white) swatch", () => {
  // Chips & badges are white text on rgba(20,21,25,.82) laid over the swatch.
  const chipBgOnWhite = over([20, 21, 25, 0.82], hex("#ffffff"));
  it("white-on-chip ≥ 7:1 even over a white swatch", () => {
    expect(ratio(hex("#ffffff"), chipBgOnWhite)).toBeGreaterThanOrEqual(AAA);
  });
  it("white-on-chip ≥ AA over mid-gray too", () => {
    const onGray = over([20, 21, 25, 0.82], hex("#b0b0b0"));
    expect(ratio(hex("#ffffff"), onGray)).toBeGreaterThanOrEqual(AA);
  });
});

describe("non-text contrast (≥ 3:1)", () => {
  it("card focus ring (black) on the gray gutter", () => {
    expect(ratio(hex("#000000"), GUTTER)).toBeGreaterThanOrEqual(NON_TEXT);
  });
  it("toolbar control borders on the dark bar", () => {
    expect(ratio(over(white(0.4), BAR), BAR)).toBeGreaterThanOrEqual(NON_TEXT);
  });
});
