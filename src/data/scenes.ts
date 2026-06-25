import type { Scene } from "../domain/scene.js";

/**
 * Curated room scenes (E9, US9.1). Each is a 1200×800 procedural SVG: the
 * `walls` rectangles are recolored with the chosen paint color, the `foreground`
 * (floor, window, furniture) is drawn over them. Colors in the foreground are
 * deliberately muted/neutral so the wall color reads true.
 *
 * Authoring: add a `Scene` below; keep foreground fills neutral and leave the
 * wall area clear of large opaque shapes. `scenes.integrity.test.ts` guards
 * unique slugs and in-bounds wall rects.
 */
export const SCENES: Scene[] = [
  {
    slug: "living-room",
    name: "Living room",
    width: 1200,
    height: 800,
    walls: [{ x: 0, y: 0, w: 1200, h: 620 }],
    foreground: `
      <rect x="0" y="620" width="1200" height="180" fill="#c9bfae"/>
      <rect x="0" y="606" width="1200" height="16" fill="#b9ad99"/>
      <!-- window -->
      <rect x="120" y="120" width="300" height="320" fill="#dce8f0" stroke="#8a8f95" stroke-width="10"/>
      <line x1="270" y1="120" x2="270" y2="440" stroke="#8a8f95" stroke-width="10"/>
      <line x1="120" y1="280" x2="420" y2="280" stroke="#8a8f95" stroke-width="10"/>
      <!-- sofa -->
      <rect x="640" y="430" width="460" height="190" rx="24" fill="#8d8378"/>
      <rect x="660" y="400" width="420" height="90" rx="20" fill="#9b9185"/>
      <rect x="700" y="360" width="120" height="120" rx="16" fill="#a89e92"/>
      <rect x="900" y="360" width="120" height="120" rx="16" fill="#a89e92"/>
      <!-- plant -->
      <rect x="470" y="470" width="70" height="150" fill="#7c7264"/>
      <ellipse cx="505" cy="430" rx="80" ry="90" fill="#5f6b4f"/>
    `,
  },
  {
    slug: "bedroom",
    name: "Bedroom",
    width: 1200,
    height: 800,
    walls: [{ x: 0, y: 0, w: 1200, h: 640 }],
    foreground: `
      <rect x="0" y="640" width="1200" height="160" fill="#cabfb0"/>
      <rect x="0" y="628" width="1200" height="14" fill="#b6ab97"/>
      <!-- headboard + bed -->
      <rect x="300" y="360" width="600" height="120" rx="16" fill="#9a8f82"/>
      <rect x="270" y="470" width="660" height="170" rx="18" fill="#d8d2c8"/>
      <rect x="300" y="500" width="220" height="120" rx="16" fill="#eceae4"/>
      <!-- lamp -->
      <rect x="150" y="500" width="40" height="140" fill="#8a8073"/>
      <path d="M120 500 h100 l-20 -70 h-60 Z" fill="#e7dcc4"/>
      <!-- framed art -->
      <rect x="540" y="170" width="120" height="150" fill="#efe9dd" stroke="#7d7468" stroke-width="8"/>
    `,
  },
  {
    slug: "kitchen",
    name: "Kitchen",
    width: 1200,
    height: 800,
    walls: [{ x: 0, y: 0, w: 1200, h: 470 }],
    foreground: `
      <!-- backsplash + counter -->
      <rect x="0" y="470" width="1200" height="40" fill="#e7e2d8"/>
      <rect x="0" y="510" width="1200" height="60" fill="#3f4651"/>
      <!-- lower cabinets -->
      <rect x="0" y="570" width="1200" height="230" fill="#b9b1a3"/>
      <rect x="40" y="600" width="200" height="170" rx="8" fill="#a89f8f"/>
      <rect x="280" y="600" width="200" height="170" rx="8" fill="#a89f8f"/>
      <rect x="720" y="600" width="200" height="170" rx="8" fill="#a89f8f"/>
      <rect x="960" y="600" width="200" height="170" rx="8" fill="#a89f8f"/>
      <!-- upper cabinets -->
      <rect x="60" y="120" width="240" height="180" rx="8" fill="#cfc8ba"/>
      <rect x="900" y="120" width="240" height="180" rx="8" fill="#cfc8ba"/>
      <!-- window over sink -->
      <rect x="470" y="150" width="260" height="240" fill="#dce8f0" stroke="#8a8f95" stroke-width="10"/>
    `,
  },
  {
    slug: "exterior",
    name: "Exterior",
    width: 1200,
    height: 800,
    walls: [{ x: 100, y: 180, w: 1000, h: 470 }],
    foreground: `
      <!-- sky + lawn (outside the wall rect) -->
      <rect x="0" y="0" width="1200" height="180" fill="#cfe3f2"/>
      <rect x="0" y="650" width="1200" height="150" fill="#88a06a"/>
      <rect x="0" y="640" width="1200" height="14" fill="#768c58"/>
      <!-- side returns / framing -->
      <rect x="0" y="180" width="100" height="470" fill="#7f7468"/>
      <rect x="1100" y="180" width="100" height="470" fill="#7f7468"/>
      <!-- roof -->
      <path d="M60 180 L600 40 L1140 180 Z" fill="#5b5450"/>
      <!-- door -->
      <rect x="540" y="430" width="120" height="220" fill="#6f6457"/>
      <circle cx="640" cy="545" r="7" fill="#d8cba0"/>
      <!-- windows -->
      <rect x="220" y="300" width="160" height="180" fill="#dce8f0" stroke="#efe9dd" stroke-width="12"/>
      <rect x="820" y="300" width="160" height="180" fill="#dce8f0" stroke="#efe9dd" stroke-width="12"/>
    `,
  },
];
