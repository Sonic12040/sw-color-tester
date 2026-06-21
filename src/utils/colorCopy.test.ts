import { describe, it, expect } from "vitest";
import type { Color } from "../data/types.js";
import {
  describeLrv,
  designerCollections,
  formatUseTypes,
  similarityRole,
  summarize,
  explainScheme,
  explainRole,
  SCHEME_LABEL,
} from "./colorCopy.js";
import { SCHEME_TYPES, PALETTE_ROLES } from "./paletteIntelligence.js";

function make(over: Partial<Color>): Color {
  return {
    id: "x",
    name: "X",
    colorNumber: "0000",
    brandKey: "SW",
    hex: "#888888",
    red: 136,
    green: 136,
    blue: 136,
    hue: 0.5,
    saturation: 0.5,
    lightness: 0.5,
    lrv: 50,
    isDark: false,
    isInterior: false,
    isExterior: false,
    colorFamilyNames: [],
    brandedCollectionNames: [],
    similarColors: [],
    description: [],
    ...over,
  };
}

describe("describeLrv", () => {
  it("classifies dark / medium / light with a formatted percentage", () => {
    expect(describeLrv(10).label).toBe("Dark");
    expect(describeLrv(50).label).toBe("Medium");
    expect(describeLrv(80).label).toBe("Light");
    expect(describeLrv(10).context).toContain("10.0%");
  });
});

describe("summarize", () => {
  it("composes warmth + lightness + chroma + a use suggestion", () => {
    expect(
      summarize(
        make({
          name: "Forsythia",
          lrv: 78,
          hue: 0.13,
          saturation: 0.91,
          red: 245,
          green: 205,
          blue: 40,
          colorFamilyNames: ["Yellow"],
          lab: { L: 82, A: 2, B: 80 },
        }),
      ),
    ).toBe(
      "Forsythia is a light warm yellow with rich, saturated color. " +
        "It keeps spaces feeling bright and open.",
    );

    expect(
      summarize(
        make({
          name: "Naval",
          lrv: 4,
          hue: 0.58,
          saturation: 0.28,
          red: 45,
          green: 61,
          blue: 80,
          colorFamilyNames: ["Blue"],
          lab: { L: 25, A: -3, B: -16 },
        }),
      ),
    ).toBe(
      "Naval is a deep cool blue with gently muted color. " +
        "It adds depth and a cozy, dramatic mood.",
    );
  });

  it("uses 'shade' (not a doubled noun) for neutral / unknown families", () => {
    expect(
      summarize(
        make({
          name: "Repose Gray",
          lrv: 58,
          hue: 0.11,
          saturation: 0.1,
          red: 204,
          green: 201,
          blue: 194,
          colorFamilyNames: ["Neutral"],
          lab: { L: 81, A: 1, B: 4 },
        }),
      ),
    ).toBe(
      "Repose Gray is a mid-tone neutral shade with soft, near-neutral color. " +
        "It's versatile enough to work in most rooms.",
    );
    expect(
      summarize(make({ name: "Mystery", colorFamilyNames: [] })),
    ).toContain("Mystery is a mid-tone");
  });
});

describe("designerCollections", () => {
  it("keeps only designer collections and strips the prefix", () => {
    const color = make({
      brandedCollectionNames: [
        "Designer Color Collection - Classic",
        "Some Other Collection",
      ],
    });
    expect(designerCollections(color)).toEqual(["Classic"]);
  });
});

describe("formatUseTypes", () => {
  it("joins the applicable use types", () => {
    expect(formatUseTypes(make({ isInterior: true }))).toBe("Interior");
    expect(formatUseTypes(make({ isInterior: true, isExterior: true }))).toBe(
      "Interior & Exterior",
    );
    expect(formatUseTypes(make({}))).toBe("");
  });
});

describe("similarityRole", () => {
  const base = make({ hue: 0.5, lightness: 0.5 });

  it("labels by hue first, factoring in lightness", () => {
    expect(similarityRole(base, make({ hue: 0.7, lightness: 0.5 }), 0)).toBe(
      "Warmer",
    );
    expect(similarityRole(base, make({ hue: 0.7, lightness: 0.9 }), 0)).toBe(
      "Warmer & Lighter",
    );
    expect(similarityRole(base, make({ hue: 0.3, lightness: 0.5 }), 0)).toBe(
      "Cooler",
    );
  });

  it("falls back to lightness, then to a positional differentiator", () => {
    expect(similarityRole(base, make({ hue: 0.5, lightness: 0.9 }), 0)).toBe(
      "Lighter",
    );
    expect(similarityRole(base, make({ hue: 0.5, lightness: 0.1 }), 0)).toBe(
      "Darker",
    );
    // Same hue & lightness → positional label by index.
    expect(similarityRole(base, make({ hue: 0.5, lightness: 0.5 }), 4)).toBe(
      "Similar Tone",
    );
  });
});

describe("explainScheme / explainRole", () => {
  it("has a label + non-empty rationale for every scheme type", () => {
    for (const t of SCHEME_TYPES) {
      expect(SCHEME_LABEL[t]).toBeTruthy();
      expect(explainScheme(t).length).toBeGreaterThan(0);
    }
  });

  it("explains each 60-30-10 role with its proportion", () => {
    expect(explainRole("Dominant")).toContain("60%");
    expect(explainRole("Secondary")).toContain("30%");
    expect(explainRole("Accent")).toContain("10%");
    for (const r of PALETTE_ROLES) {
      expect(explainRole(r).length).toBeGreaterThan(0);
    }
  });
});
