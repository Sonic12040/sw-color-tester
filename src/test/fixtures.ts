import type { Color } from "../data/types.js";

/**
 * Realistic shared test palette — true RGB/HSL/LAB so chroma-, undertone-, and
 * lightness-derived behavior is exercised honestly (not all-gray placeholders).
 *
 * Computed properties (used by tests):
 *   family order   : Red, Yellow, Green, Blue, Neutral
 *   undertone      : Warm {Accessible Beige, Cherry Tomato, Forsythia}
 *                    Cool {Naval, Tradewind, Quietude}
 *                    Neutral {Tricorn Black, Repose Gray}
 *   lightness band : Dark {Tricorn Black, Naval, Cherry Tomato}
 *                    Medium {Repose Gray, Accessible Beige, Tradewind, Quietude}
 *                    Light {Forsythia}
 *   neutrality band: High {Tricorn Black 99, Repose Gray 93, Accessible Beige 86}
 *                    Medium {Tradewind 83, Quietude 83, Naval 76}
 *                    Low {Cherry Tomato 15, Forsythia 6}
 *   collections    : "Timeless Color" {Repose Gray, Accessible Beige}
 *   designer pick  : Accessible Beige
 *   ("Archived One" is filtered out by ColorModel.)
 */
const base = (over: Partial<Color>): Color => ({
  id: "id",
  name: "Name",
  colorNumber: "0000",
  brandKey: "SW",
  hex: "#888888",
  red: 136,
  green: 136,
  blue: 136,
  hue: 0,
  saturation: 0.5,
  lightness: 0.5,
  lrv: 50,
  isDark: false,
  isInterior: true,
  isExterior: true,
  colorFamilyNames: ["Neutral"],
  brandedCollectionNames: [],
  similarColors: [],
  description: [],
  ...over,
});

export const TEST_COLORS: Color[] = [
  base({
    id: "tricorn",
    name: "Tricorn Black",
    colorNumber: "6258",
    hex: "#2f2f30",
    red: 47,
    green: 47,
    blue: 48,
    hue: 0.66,
    saturation: 0.01,
    lightness: 0.19,
    lrv: 3,
    isDark: true,
    colorFamilyNames: ["Neutral"],
    lab: { L: 19, A: 0, B: -1 },
    storeStripLocator: "194-C1",
  }),
  base({
    id: "repose",
    name: "Repose Gray",
    colorNumber: "7015",
    red: 204,
    green: 201,
    blue: 194,
    hue: 0.11,
    saturation: 0.1,
    lightness: 0.78,
    lrv: 58,
    colorFamilyNames: ["Neutral"],
    brandedCollectionNames: ["Timeless Color"],
    lab: { L: 81, A: 1, B: 4 },
  }),
  base({
    id: "accessible",
    name: "Accessible Beige",
    colorNumber: "7036",
    red: 209,
    green: 199,
    blue: 182,
    hue: 0.1,
    saturation: 0.21,
    lightness: 0.77,
    lrv: 57,
    colorFamilyNames: ["Neutral"],
    brandedCollectionNames: [
      "Designer Color Collection - Pottery",
      "Timeless Color",
    ],
    lab: { L: 80, A: 2, B: 8 },
  }),
  base({
    id: "naval",
    name: "Naval",
    colorNumber: "6244",
    red: 45,
    green: 61,
    blue: 80,
    hue: 0.58,
    saturation: 0.28,
    lightness: 0.25,
    lrv: 4,
    isDark: true,
    isExterior: false,
    colorFamilyNames: ["Blue"],
    lab: { L: 25, A: -3, B: -16 },
  }),
  base({
    id: "tradewind",
    name: "Tradewind",
    colorNumber: "6218",
    red: 160,
    green: 190,
    blue: 195,
    hue: 0.52,
    saturation: 0.2,
    lightness: 0.7,
    lrv: 50,
    colorFamilyNames: ["Blue"],
    lab: { L: 77, A: -8, B: -7 },
  }),
  base({
    id: "cherry",
    name: "Cherry Tomato",
    colorNumber: "6864",
    red: 200,
    green: 55,
    blue: 45,
    hue: 0.01,
    saturation: 0.63,
    lightness: 0.48,
    lrv: 18,
    isDark: true,
    colorFamilyNames: ["Red"],
    lab: { L: 48, A: 58, B: 40 },
  }),
  base({
    id: "forsythia",
    name: "Forsythia",
    colorNumber: "6907",
    red: 245,
    green: 205,
    blue: 40,
    hue: 0.13,
    saturation: 0.91,
    lightness: 0.56,
    lrv: 78,
    isInterior: false,
    colorFamilyNames: ["Yellow"],
    lab: { L: 82, A: 2, B: 80 },
  }),
  base({
    id: "quietude",
    name: "Quietude",
    colorNumber: "6212",
    red: 150,
    green: 175,
    blue: 160,
    hue: 0.4,
    saturation: 0.13,
    lightness: 0.64,
    lrv: 40,
    colorFamilyNames: ["Green"],
    lab: { L: 69, A: -12, B: 5 },
  }),
  base({
    id: "arch",
    name: "Archived One",
    colorNumber: "9999",
    colorFamilyNames: ["Red"],
    archived: true,
  }),
];
