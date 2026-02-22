# Visualizer Feature — Implementation Plan

## Table of Contents

1. [Current Information Architecture](#1-current-information-architecture)
2. [Navigation: Explorer ↔ Visualizer](#2-navigation-explorer--visualizer)
3. [How the Accordion Feeds the Visualizer](#3-how-the-accordion-feeds-the-visualizer)
4. [How Modals Affect the Visualizer](#4-how-modals-affect-the-visualizer)
5. [Mobile UX (`<600px`)](#5-mobile-ux-600px)
6. [Tablet UX (`600–899px`)](#6-tablet-ux-600899px)
7. [Desktop UX (`900px+`)](#7-desktop-ux-900px)
8. [Responsive Layout Summary](#8-responsive-layout-summary)
9. [Data Architecture Impact](#9-data-architecture-impact)
10. [Design Principles](#10-design-principles)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. Current Information Architecture

The app today is a **single-screen, browse-and-filter tool**:

```
Header (sticky) → Hamburger → [LRV Filter + Actions]
  └─ Accordion (scrollable)
       ├─ Favorites
       ├─ Hidden
       └─ Color Families × N
            └─ Tile Grid → Tap → Modal (full detail)
```

Adding a Visualizer creates a **second primary mode** — the biggest structural change since launch. Two top-level experiences must coexist without fragmenting the mobile flow.

---

## 2. Navigation: Explorer ↔ Visualizer

**Recommendation: Tab bar, not hamburger nesting.**

The hamburger already contains the LRV filter + 3 action buttons. Burying the Visualizer inside it would make it invisible — hamburger items have notoriously low discovery rates (~50% lower engagement). Instead:

| Device                   | Pattern                                            | Details                                                                                                                                              |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile** (`<600px`)    | **Bottom tab bar** (2 tabs: Explorer / Visualizer) | Fixed to viewport bottom, 48px tall, stays above toast z-index. Thumb-friendly. The hamburger stays for tools/actions.                               |
| **Tablet** (`600–899px`) | **Top segmented control** below header             | Two pill buttons inline under the title, above the accordion. Saves vertical space vs. bottom bar.                                                   |
| **Desktop** (`900px+`)   | **Side-by-side split** or **top tabs**             | At 900px+, there's room for a persistent sidebar canvas alongside the accordion. Alternatively, top tabs at the `max-width: 1200px` container level. |

**Why not a toggle in the hamburger?** The Visualizer is a _destination_, not a _setting_. It deserves first-class navigation — the same level of prominence as the accordion.

---

## 3. How the Accordion Feeds the Visualizer

The accordion is the **color source**. The Visualizer is the **color destination**. The two need a frictionless bridge:

| Interaction                      | Mechanism                                                | UX Detail                                                                                                                                                             |
| -------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Apply color to wall**          | Drag tile from accordion → drop on canvas wall           | Desktop only. Uses `draggable` + drop zones on canvas wall polygons.                                                                                                  |
| **Apply color to wall (mobile)** | "Apply to Wall" button appears in tile actions           | Tap tile → new CTA appears → tap target wall in Visualizer. Two-step, no drag needed.                                                                                 |
| **Apply from Modal**             | "Apply to Visualizer" action button in modal footer      | Sits alongside Favorite/Share/Copy/Hide. Opens Visualizer with color pre-selected if not already on that tab.                                                         |
| **Favorites as palette**         | Favorites section becomes a "Palette" in Visualizer mode | Favorites accordion section is recontextualized — its tiles become a selectable palette strip below the canvas.                                                       |
| **LRV filter context**           | Visualizer shows LRV-aware lighting preview              | When a wall color has low LRV, the lighting simulation should visually darken that surface under low-light conditions — reinforcing what LRV _means_ beyond a number. |

### Data Flow

```
Accordion Tile (ColorModel)
  → User taps "Apply to Wall"
  → VisualizerState.assignColor(wallId, colorId)
  → VisualizerCanvas re-renders affected wall polygon
  → Wall reflects color's HSL + LRV under current lighting
```

---

## 4. How Modals Affect the Visualizer

The color detail modal is currently a full-screen overlay on mobile. It must **not block Visualizer context**:

| Scenario                             | Current Behavior                        | Recommended Behavior                                                                                                                                                                     |
| ------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Open modal from Explorer**         | Full overlay, body scroll locked        | No change — works fine.                                                                                                                                                                  |
| **Open modal from Visualizer**       | (new)                                   | **Sheet/drawer from bottom (mobile)** or **side panel (desktop)**. Semi-transparent backdrop so the canvas stays partially visible. User can see their room while reading color details. |
| **"Apply to Visualizer" from modal** | (new)                                   | Closes modal, switches to Visualizer tab, highlights the target wall for color assignment. If no wall is selected, prompts "Tap a wall to apply [Color Name]".                           |
| **Coordinating colors in modal**     | Mini-tiles, clickable to open sub-modal | Add a secondary action: "Apply Palette" — assigns coord1 to Wall A, coord2 to Wall B, white to trim. Pre-mapped based on room template roles.                                            |

**Key principle:** The modal should be a **decision accelerator** for the Visualizer, not a dead end. Every color detail view should have a clear path to "see this on a wall."

---

## 5. Mobile UX (`<600px`)

| Concern                      | Solution                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Screen real estate**       | Canvas takes 50–60% of viewport height. Palette strip (favorites) takes ~80px below canvas. Bottom tab bar takes 48px. Remaining space scrolls.                                                   |
| **Touch precision on walls** | Minimum wall polygon tap target: 44×44px (already enforced system-wide). Small accent walls get a "zoom to region" on tap, expanding the area.                                                    |
| **Orientation**              | **Portrait:** Stacked layout (canvas top, palette bottom). **Landscape:** Side-by-side (canvas left 60%, palette right 40%). Matches existing landscape breakpoint `<900px width, <500px height`. |
| **Sticky header conflict**   | In Visualizer mode, header collapses to minimal bar (app name + tab bar only). Hamburger still accessible. Maximizes canvas area.                                                                 |
| **Performance**              | Canvas renders at `devicePixelRatio` capped at 2× on mobile. Use `OffscreenCanvas` for lighting calculations if available. Debounce touch-move events to 16ms (1 frame).                          |
| **Thumb zone**               | Bottom tab bar + bottom palette strip = all primary actions in the natural thumb arc. "Undo last color" as a floating action button (FAB) in bottom-right corner.                                 |

---

## 6. Tablet UX (`600–899px`)

| Concern            | Solution                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layout**         | Canvas fills ~65% of width. Right sidebar shows a compact "Color Palette" panel (favorites + recently used). Segmented control above for Explorer/Visualizer. |
| **Modal behavior** | Side sheet (slides from right, ~60% width) instead of full overlay. Canvas remains partly visible.                                                            |
| **Touch + Stylus** | Support `pointer: fine` media query — if stylus, enable precision wall edge editing. If `pointer: coarse`, stick to tap-to-select.                            |

---

## 7. Desktop UX (`900px+`)

| Concern          | Solution                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layout**       | **Split view** — Accordion on left (~350px collapsible sidebar), Canvas center (flexible), Color details panel on right (optional, collapsible). Three-column at `1200px+`, two-column at `900–1199px`. |
| **Drag & drop**  | Drag tiles from accordion directly onto canvas walls. Visual feedback: wall highlights on hover, ghost tile follows cursor.                                                                             |
| **Hover states** | Canvas walls show hover outline (2px `--color-border-focus`). Wall name tooltip appears. Existing `@media (hover: hover) and (pointer: fine)` already handles this.                                     |
| **Keyboard**     | Tab through walls (focus ring on each polygon). Arrow keys cycle walls. Enter/Space assigns currently selected color. Matches existing accordion keyboard pattern.                                      |
| **Modal**        | Standard centered modal — canvas visible behind semi-transparent backdrop. "Apply to Visualizer" button in actions footer.                                                                              |

---

## 8. Responsive Layout Summary

### Mobile (`<600px`)

```
┌─────────────────────────────────────────────────┐
│ Header (compact) + Hamburger                    │
├─────────────────────────────────────────────────┤
│                                                 │
│           Canvas (50-60vh)                      │
│                                                 │
├─────────────────────────────────────────────────┤
│ Palette Strip (scrollable horizontal, ~80px)    │
├─────────────────────────────────────────────────┤
│ Lighting Controls (collapsed, expandable)       │
├─────────────────────────────────────────────────┤
│ [Explorer]  [Visualizer]   ← Bottom Tab Bar     │
└─────────────────────────────────────────────────┘
```

### Tablet (`600–899px`)

```
┌─────────────────────────────────────────────────┐
│ Header + [Explorer | Visualizer] segmented ctrl │
├──────────────────────┬──────────────────────────┤
│                      │                          │
│    Canvas (65%)      │  Palette Panel (35%)     │
│                      │  - Favorites             │
│                      │  - Recent                │
│                      │  - Lighting              │
│                      │                          │
└──────────────────────┴──────────────────────────┘
```

### Desktop (`900px+`)

```
┌──────────┬────────────────────────────┬──────────────────┐
│ Accordion│                            │ Color Details    │
│ Sidebar  │       Canvas               │ (optional)       │
│ (~300px) │                            │ (~280px)         │
│          │                            │                  │
│ Drag     │  Drop zone targets         │ Applied colors   │
│ source   │                            │ list             │
│          ├────────────────────────────┤ Room controls    │
│          │ Lighting Toolbar           │                  │
└──────────┴────────────────────────────┴──────────────────┘
```

---

## 9. Data Architecture Impact

### New State Model

The Visualizer needs its own state model alongside the existing `AppState`:

| New Concern           | Approach                                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`VisualizerState`** | Stores `roomId`, `wallAssignments: Map<wallId, colorId>`, `lightingSources`, `timeOfDay`, `activePreset`. Persisted to `localStorage` alongside existing favorites/hidden. |
| **Color references**  | Wall assignments store `colorId` strings — resolved at render time via `ColorModel.getColorById()`. No data duplication.                                                   |
| **Undo/Redo**         | Command pattern already exists (`ToggleFavoriteCommand`, etc.). Add `AssignWallColorCommand`, `ChangeLightingCommand`. Stack-based undo with max depth of 20.              |
| **Room templates**    | Static JSON: wall polygons, window regions, fixture positions. Imported like color data. No API dependency.                                                                |

### New Files (Projected)

```
models/
  VisualizerState.js          — Wall assignments, lighting, undo stack
views/
  VisualizerView.js           — Canvas rendering, palette strip DOM
  VisualizerCanvas.js         — Canvas 2D drawing engine
controllers/
  VisualizerController.js     — User interactions, coordinates model/view
commands/
  AssignWallColorCommand.js   — Apply color to wall (undoable)
  ChangeLightingCommand.js    — Change lighting preset (undoable)
  ApplyPaletteCommand.js      — Assign coordinating set to room roles
data/
  rooms/
    living-room.json          — Wall polygons, windows, fixtures
    bedroom.json
    kitchen.json
utils/
  lighting.js                 — Gradient-based light source calculations
  room-renderer.js            — Canvas polygon fill + lighting compositing
```

### Existing File Modifications

| File                             | Change                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `index.html`                     | Add bottom tab bar, `<canvas>` container, palette strip markup, Visualizer view container                   |
| `styles.css`                     | Tab bar styles, canvas container responsive styles, palette strip, Visualizer-specific breakpoint overrides |
| `controllers/ColorController.js` | Add "Apply to Visualizer" handler in modal setup, tab switching logic                                       |
| `views/ColorView.js`             | Expose method to get selected/hovered color for cross-view communication                                    |
| `utils/config.js`                | Add new ELEMENT_IDS, CSS_CLASSES, DATA_ATTRIBUTES for Visualizer components                                 |
| `utils/templates.js`             | Add "Apply to Visualizer" button to `colorDetailModal()` actions footer                                     |
| `app.js`                         | Initialize `VisualizerController` alongside `ColorController`, wire tab navigation                          |
| `version.js`                     | Bump version for service worker cache bust                                                                  |
| `service-worker.js`              | Add new files to cache list                                                                                 |
| `manifest.json`                  | Update if any new icons/screenshots needed                                                                  |

---

## 10. Design Principles

1. **The Visualizer is a peer view, not a sub-feature.** It gets equal navigation weight to the Explorer.
2. **Colors flow from Explorer → Visualizer.** Never force users to leave the Visualizer to find a color — bring a palette strip into the Visualizer view.
3. **Modals become context-aware.** When opened from the Visualizer, they show an "Apply" CTA. When opened from the Explorer, they show navigational links to the Visualizer.
4. **LRV is the bridge.** The LRV filter in the Explorer and the lighting engine in the Visualizer tell the same story — how light interacts with color. Connect them: "This LRV 12 color will look like _this_ under evening light."
5. **Mobile-first, thumb-first.** Primary actions (color selection, wall tapping, undo) all live in the bottom 40% of the screen.
6. **Progressive disclosure.** Lighting controls default to a single "Time of Day" slider. Advanced controls (individual light sources, custom Kelvin values) are behind an "Advanced" accordion — the same pattern already used in the modal's technical details section.

---

## 11. Implementation Phases

### Phase 1 — Room Data & Canvas Foundation

**Goal:** Static bedroom illustration rendered on a `<canvas>` in single-point perspective, with all surfaces selectable.

#### Design Decisions

| Decision               | Choice                                      | Rationale                                                                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Visual style**       | Single-point perspective                    | Most immersive. Shows 2-3 walls with realistic depth. Matches how users mentally picture a room.                                                                                                                                                                     |
| **First room**         | Bedroom                                     | Simpler geometry than living room/kitchen. One accent wall (behind bed), two side walls, clear window placement. Common paint project.                                                                                                                               |
| **Perspective**        | Off-center (asymmetrical)                   | Vanishing point offset — one side wall appears larger. Feels like standing near a doorway looking in. More natural than a perfectly centered view.                                                                                                                   |
| **Paintable surfaces** | 5-6 zones                                   | Left wall, back wall (accent), right wall, trim/baseboard, ceiling, and optionally door. Matches how coordinating colors work in the modal: accent, trim, coordinating.                                                                                              |
| **Window**             | Large picture window                        | On the back or side wall. Non-paintable cutout. Will serve as primary daylight source for the lighting engine in Phase 4. Reduces paintable area on that wall but adds visual drama.                                                                                 |
| **Furniture**          | Silhouettes with window dressing            | Bed outline, nightstand silhouettes, window with curtain outline. All non-interactive/non-paintable. Adds realistic context so users can judge how wall colors look _in a room_, not just on rectangles. Rendered as semi-transparent overlays on top of wall fills. |
| **Default fill**       | Wireframe / no fill                         | Empty walls with visible outlines and surface labels. Makes it immediately obvious the user needs to add color. Outlines use `--color-border-primary`. Background shows a subtle crosshatch or dotted pattern to distinguish "no color assigned" from white.         |
| **Selection UX**       | Persistent labels + high-contrast highlight | Most WCAG 2.2 AA accessible option (see below).                                                                                                                                                                                                                      |

#### Accessibility — Selection UX (WCAG 2.2 AA)

The selected approach uses **persistent labels on all surfaces** combined with a **high-contrast highlight border on the active selection**:

- **1.1.1 Non-text Content** — Every paintable zone has a visible text label (e.g., "Back Wall", "Trim", "Ceiling") so identification doesn't rely solely on position or color.
- **1.4.1 Use of Color** — Selection is communicated via a distinct border style _and_ a label state change (e.g., bold or inverted), not color alone.
- **1.4.11 Non-text Contrast** — Selection border meets 3:1 contrast against the wall fill (use `--color-border-focus` which is blue-600).
- **2.4.6 Headings and Labels** — Descriptive surface names always visible, not just on hover.
- **2.4.7 Focus Visible** — Keyboard focus ring on each zone when tabbing through surfaces. Uses the same `outline: 2px solid var(--color-border-focus); outline-offset: 2px` pattern as the rest of the app.
- **4.1.2 Name, Role, Value** — Each canvas zone has an associated ARIA description. Since `<canvas>` is a single element, we use an off-screen description list or ARIA live region that announces the currently selected surface.

**Selection visual behavior:**

1. All surfaces show faint text labels at all times (e.g., "Back Wall", "Left Wall", "Trim")
2. Tapping/clicking a surface highlights it with a 3px `--color-border-focus` dashed border inside the polygon
3. The label for the selected surface becomes bold/inverted
4. Only one surface can be selected at a time (tap another to switch, tap same to deselect)
5. On desktop, hovering a surface shows a subtle 1px highlight before click

#### Room Template JSON Format

```jsonc
{
  "id": "bedroom-01",
  "name": "Bedroom",
  "description": "Off-center perspective bedroom with picture window",
  "version": "1.0",

  // Coordinate system: 0-1 normalized (scaled to canvas size at render time)
  // Origin (0,0) = top-left of canvas
  "viewpoint": {
    "type": "single-point-perspective",
    "vanishingPoint": { "x": 0.38, "y": 0.42 }, // Off-center left
    "alignment": "asymmetric",
  },

  "surfaces": [
    {
      "id": "back-wall",
      "label": "Back Wall",
      "role": "accent", // Maps to coordinating color roles
      "paintable": true,
      "polygon": [
        { "x": 0.18, "y": 0.12 },
        { "x": 0.78, "y": 0.12 },
        { "x": 0.78, "y": 0.72 },
        { "x": 0.18, "y": 0.72 },
      ],
      "cutouts": [
        {
          "id": "picture-window",
          "type": "window",
          "polygon": [
            { "x": 0.22, "y": 0.18 },
            { "x": 0.52, "y": 0.18 },
            { "x": 0.52, "y": 0.55 },
            { "x": 0.22, "y": 0.55 },
          ],
        },
      ],
    },
    {
      "id": "left-wall",
      "label": "Left Wall",
      "role": "coordinating",
      "paintable": true,
      "polygon": [
        { "x": 0.0, "y": 0.0 },
        { "x": 0.18, "y": 0.12 },
        { "x": 0.18, "y": 0.72 },
        { "x": 0.0, "y": 0.88 },
      ],
      "cutouts": [],
    },
    {
      "id": "right-wall",
      "label": "Right Wall",
      "role": "coordinating",
      "paintable": true,
      "polygon": [
        { "x": 0.78, "y": 0.12 },
        { "x": 1.0, "y": 0.0 },
        { "x": 1.0, "y": 0.88 },
        { "x": 0.78, "y": 0.72 },
      ],
      "cutouts": [],
    },
    {
      "id": "ceiling",
      "label": "Ceiling",
      "role": "trim",
      "paintable": true,
      "polygon": [
        { "x": 0.0, "y": 0.0 },
        { "x": 0.18, "y": 0.12 },
        { "x": 0.78, "y": 0.12 },
        { "x": 1.0, "y": 0.0 },
      ],
      "cutouts": [],
    },
    {
      "id": "trim",
      "label": "Trim & Baseboard",
      "role": "trim",
      "paintable": true,
      "polygon": [
        // Baseboard strip at bottom of each wall — rendered as a composite
        // of thin rectangles along wall bases. Exact coords computed at render time.
      ],
      "compositeType": "baseboard",
      "thickness": 0.03, // 3% of canvas height
    },
    {
      "id": "floor",
      "label": "Floor",
      "role": null,
      "paintable": false,
      "polygon": [
        { "x": 0.0, "y": 0.88 },
        { "x": 0.18, "y": 0.72 },
        { "x": 0.78, "y": 0.72 },
        { "x": 1.0, "y": 0.88 },
        { "x": 1.0, "y": 1.0 },
        { "x": 0.0, "y": 1.0 },
      ],
      "fillStyle": "#c4a882", // Hardwood floor color
      "cutouts": [],
    },
  ],

  "furniture": [
    {
      "id": "bed",
      "type": "silhouette",
      "label": "Bed",
      "polygon": [
        { "x": 0.28, "y": 0.5 },
        { "x": 0.68, "y": 0.5 },
        { "x": 0.72, "y": 0.85 },
        { "x": 0.24, "y": 0.85 },
      ],
      "style": {
        "fill": "rgba(0,0,0,0.08)",
        "stroke": "rgba(0,0,0,0.25)",
        "lineWidth": 1.5,
      },
    },
    {
      "id": "nightstand-left",
      "type": "silhouette",
      "label": "Nightstand",
      "polygon": [
        { "x": 0.14, "y": 0.55 },
        { "x": 0.26, "y": 0.52 },
        { "x": 0.26, "y": 0.7 },
        { "x": 0.14, "y": 0.73 },
      ],
      "style": {
        "fill": "rgba(0,0,0,0.06)",
        "stroke": "rgba(0,0,0,0.20)",
        "lineWidth": 1,
      },
    },
    {
      "id": "nightstand-right",
      "type": "silhouette",
      "label": "Nightstand",
      "polygon": [
        { "x": 0.7, "y": 0.52 },
        { "x": 0.82, "y": 0.55 },
        { "x": 0.82, "y": 0.73 },
        { "x": 0.7, "y": 0.7 },
      ],
      "style": {
        "fill": "rgba(0,0,0,0.06)",
        "stroke": "rgba(0,0,0,0.20)",
        "lineWidth": 1,
      },
    },
    {
      "id": "curtain-left",
      "type": "silhouette",
      "label": "Curtain",
      "polygon": [
        { "x": 0.19, "y": 0.14 },
        { "x": 0.24, "y": 0.15 },
        { "x": 0.24, "y": 0.6 },
        { "x": 0.19, "y": 0.62 },
      ],
      "style": {
        "fill": "rgba(0,0,0,0.05)",
        "stroke": "rgba(0,0,0,0.15)",
        "lineWidth": 1,
      },
    },
    {
      "id": "curtain-right",
      "type": "silhouette",
      "label": "Curtain",
      "polygon": [
        { "x": 0.5, "y": 0.15 },
        { "x": 0.55, "y": 0.14 },
        { "x": 0.55, "y": 0.62 },
        { "x": 0.5, "y": 0.6 },
      ],
      "style": {
        "fill": "rgba(0,0,0,0.05)",
        "stroke": "rgba(0,0,0,0.15)",
        "lineWidth": 1,
      },
    },
  ],

  "lightSources": [
    {
      "id": "picture-window-light",
      "type": "window",
      "surfaceRef": "back-wall",
      "cutoutRef": "picture-window",
      "notes": "Daylight source for Phase 4 lighting engine",
    },
  ],
}
```

#### Canvas Rendering Pipeline

Render order (back to front, painter's algorithm):

1. **Clear canvas** — fill background with `--color-surface-tertiary` or transparent
2. **Draw ceiling polygon** — fill with assigned color or wireframe pattern
3. **Draw back wall polygon** — fill, then subtract window cutout
4. **Draw left wall polygon** — fill with assigned color or wireframe
5. **Draw right wall polygon** — fill with assigned color or wireframe
6. **Draw floor polygon** — always filled with hardwood color (non-paintable)
7. **Draw trim/baseboard** — thin strips along wall bases
8. **Draw window glass** — light blue tint or transparent with frame outline
9. **Draw furniture silhouettes** — semi-transparent overlays on top of everything
10. **Draw surface labels** — persistent text labels centered in each paintable polygon
11. **Draw selection highlight** — dashed border on currently selected surface (if any)

#### VisualizerCanvas Class — API Surface

```javascript
class VisualizerCanvas {
  constructor(canvasElement, roomTemplate) { }

  // --- Lifecycle ---
  init()                          // Set up canvas size, DPR, attach event listeners
  destroy()                       // Clean up listeners, cancel animation frames

  // --- Rendering ---
  render()                        // Full re-render (calls all draw methods in order)
  _drawSurface(surface, color)    // Fill a polygon with HSL color or wireframe pattern
  _drawCutout(surface, cutout)    // Subtract a window/door from a wall polygon
  _drawFurniture(item)            // Render a furniture silhouette
  _drawLabel(surface)             // Render persistent text label centered in polygon
  _drawSelectionHighlight(id)     // Dashed border around selected surface
  _drawWireframePattern(polygon)  // Crosshatch fill for unassigned surfaces

  // --- Hit Testing ---
  getSurfaceAtPoint(x, y)         // Returns surface ID or null (point-in-polygon)
  _pointInPolygon(point, polygon) // Ray-casting algorithm

  // --- Interaction ---
  selectSurface(surfaceId)        // Mark surface as selected, re-render
  deselectSurface()               // Clear selection
  getSelectedSurface()            // Returns current selection ID or null

  // --- Color Assignment ---
  assignColor(surfaceId, hslColor) // Set color for a surface, re-render
  clearColor(surfaceId)            // Reset to wireframe, re-render
  getAssignments()                 // Returns Map<surfaceId, hslColor>

  // --- Responsive ---
  resize()                         // Recalculate canvas dimensions, re-render
  _scaledPoint(normalizedPoint)    // Convert 0-1 coords to pixel coords
}
```

#### Responsive Canvas Sizing

| Breakpoint           | Canvas Container           | Behavior                                                                           |
| -------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| Mobile (`<600px`)    | 100% width, 50-60vh height | Fills viewport width, aspect ratio maintained via `object-fit` logic. Max DPR: 2×. |
| Tablet (`600-899px`) | ~65% of container width    | Right side reserved for palette panel (Phase 3).                                   |
| Desktop (`900px+`)   | Flexible center column     | Accordion sidebar left, optional details panel right.                              |
| Landscape mobile     | 60% width, 100vh - header  | Side-by-side with palette strip.                                                   |

Canvas always renders at `devicePixelRatio` (capped at 2 on mobile for performance):

```javascript
const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 2 : 3);
canvas.width = container.clientWidth * dpr;
canvas.height = container.clientHeight * dpr;
canvas.style.width = container.clientWidth + "px";
canvas.style.height = container.clientHeight + "px";
ctx.scale(dpr, dpr);
```

Resize handled via `ResizeObserver` on the canvas container (no `window.onresize`).

#### Implementation Checklist

- [ ] Define room template JSON schema (surfaces, cutouts, furniture, lightSources, viewpoint)
- [ ] Create `data/rooms/bedroom.json` with off-center perspective bedroom layout
- [ ] Tune polygon coordinates iteratively until the room "looks right" on a 390×844 mobile viewport
- [ ] Build `VisualizerCanvas` class in `views/VisualizerCanvas.js`
- [ ] Implement canvas init + DPR-aware sizing + `ResizeObserver`
- [ ] Implement full render pipeline (10-step painter's algorithm above)
- [ ] Implement wireframe/crosshatch pattern for unassigned surfaces
- [ ] Implement furniture silhouette rendering (semi-transparent overlays)
- [ ] Implement window cutout rendering (clip path subtraction)
- [ ] Implement persistent surface labels (centered in each polygon, legible on any fill)
- [ ] Implement `pointInPolygon` hit-testing (ray-casting algorithm)
- [ ] Implement `getSurfaceAtPoint` for mouse/touch coordinate → surface ID mapping
- [ ] Implement selection highlight (3px dashed `--color-border-focus` border)
- [ ] Implement single-selection behavior (tap to select, tap again to deselect)
- [ ] Implement hover highlight on desktop (`pointer: fine` only, 1px subtle border)
- [ ] Implement keyboard navigation: Tab cycles through surfaces, Enter/Space selects
- [ ] Implement ARIA: off-screen live region announces selected surface name
- [ ] Implement `assignColor()` / `clearColor()` methods (visually fills polygon with HSL)
- [ ] Add canvas container + placeholder markup to `index.html` (hidden until Phase 2 navigation)
- [ ] Add basic canvas container CSS (responsive sizing, border-radius `--radius-md`)
- [ ] Unit test: `pointInPolygon` with known inside/outside points
- [ ] Visual QA: render bedroom on iPhone SE (375×667), iPhone 14 (390×844), iPad (768×1024), desktop (1920×1080)

### Phase 2 — Navigation & View Shell

**Goal:** Users can switch between Explorer and Visualizer via first-class tab navigation on all breakpoints.

#### Design Decisions

| Decision                  | Choice                                                | Rationale                                                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tab appearance**        | Icon + text label                                     | Clearest meaning for new users. Grid icon + "Explorer", paintbrush icon + "Visualizer". Follows Material Design bottom navigation guidance.                                                                                 |
| **Tab visual style**      | Filled active + outlined inactive                     | Strong visual separation. Active tab has filled dark background (`--color-primary`), inactive is outlined/ghost. High contrast for WCAG.                                                                                    |
| **Desktop navigation**    | Top tabs (one view at a time)                         | Consistent mental model across all breakpoints — always tab-switching, never split-screen. Keeps implementation simple. Same tab component, different CSS placement.                                                        |
| **Header behavior**       | Title updates with active view                        | "Sherwin-Williams Color Explorer" when on Explorer tab, "Sherwin-Williams Room Visualizer" when on Visualizer tab. Reinforces which mode the user is in.                                                                    |
| **View transition**       | Instant (no animation)                                | Fastest perceived switch. No animation delay. Respects `prefers-reduced-motion` by default.                                                                                                                                 |
| **URL state**             | Query parameter `?view=explorer` / `?view=visualizer` | Works alongside existing `?color=` sharing param. Supports bookmarking and direct links. Page refresh preserves active view.                                                                                                |
| **Canvas initialization** | Eager-load both views on startup                      | Visualizer canvas pre-renders while hidden. Zero delay on first tab switch. Cost is ~1 extra render on page load (acceptable since the bedroom template is lightweight).                                                    |
| **Hamburger behavior**    | Context-aware (different tools per view)              | **Explorer**: current content (LRV filter + Export/Clear actions). **Visualizer**: room settings, lighting controls (Phase 5), reset room. Hamburger icon + toggle stay the same; panel contents swap based on active view. |

#### Tab Bar Anatomy

**Mobile (`<600px`) — Bottom Tab Bar:**

```
┌─────────────────────────────────────────────────┐
│                 App Content                     │
├───────────────────────┬─────────────────────────┤
│  ◫ Explorer           │  🖌 Visualizer          │  ← Fixed bottom, 48px
└───────────────────────┴─────────────────────────┘
```

- Fixed to viewport bottom (`position: fixed; bottom: 0`)
- Height: 48px (meets 44px minimum touch target with 2px padding)
- Z-index: `--z-sticky` (200) — below modal (1000) but above content
- Full viewport width, no gap between tabs
- Border-top: `1px solid var(--color-border-primary)`
- Background: `var(--color-surface-primary)` with subtle backdrop blur
- Each tab: flex column layout (icon 20px above text 12px), centered

**Tablet (`600-899px`) — Top Segmented Control:**

```
┌─────────────────────────────────────────────────┐
│ Header + Hamburger                              │
├─────────────────────────────────────────────────┤
│     [ ◫ Explorer ]  [ 🖌 Visualizer ]           │  ← Inline below header
├─────────────────────────────────────────────────┤
│                 Active View                     │
```

- Inline below header, inside `max-width: 1200px` container
- Height: 40px, horizontal row with `--spacing-2` gap
- Pills with `--radius-full` (fully rounded)
- Active: filled `--color-primary`, white text
- Inactive: `--color-surface-secondary` background, `--color-text-primary` text, 1px border

**Desktop (`900px+`) — Top Tabs:**

```
┌─────────────────────────────────────────────────┐
│ Header                              [Hamburger] │
├─────────────────────────────────────────────────┤
│ [ ◫ Explorer ]  [ 🖌 Visualizer ]               │  ← Horizontal tabs
├─────────────────────────────────────────────────┤
│                 Active View                     │
```

- Same as tablet segmented control, but slightly larger (44px height)
- Sits in its own row below the header border
- Left-aligned within `max-width: 1200px` container
- Bottom border indicator on active tab (2px `--color-primary`)

#### Context-Aware Hamburger Contents

The hamburger toggle button and animation remain unchanged. Only the `toolbar__panel` contents change based on active view:

**Explorer Toolbar Panel** (current, unchanged):

```
┌─────────────────────────────────────────┐
│ LRV Filter section                      │
│ [0 ────●────────────●──── 100]          │
│ Showing X of Y colors         [Reset]   │
├─────────────────────────────────────────┤
│ [Export Favorites] [Clear Favorites]     │
│ [Clear All Hidden Colors]               │
└─────────────────────────────────────────┘
```

**Visualizer Toolbar Panel** (new):

```
┌─────────────────────────────────────────┐
│ Room: Bedroom                    [▼]    │  ← Room selector (Phase 7, disabled until then)
├─────────────────────────────────────────┤
│ Lighting: (Phase 5 placeholder)         │  ← Empty section with "Coming soon" label
├─────────────────────────────────────────┤
│ [Reset All Colors]  [Screenshot]        │  ← Screenshot is Phase 7, disabled until then
└─────────────────────────────────────────┘
```

Both panels are full `toolbar__panel` DOM nodes. On tab switch:

1. Close the hamburger if open (`aria-expanded="false"`, `panel.hidden = true`)
2. Swap which `toolbar__panel` element is referenced by `aria-controls`
3. No DOM re-creation — both panels exist in the HTML, only one is active

#### Header Title Switching

```javascript
// On tab switch
const headerTitle = document.querySelector(".header h1");
headerTitle.textContent =
  activeView === "explorer"
    ? "Sherwin-Williams Color Explorer"
    : "Sherwin-Williams Room Visualizer";
```

The `<h1>` text content updates instantly. No layout shift — both strings are similar length.

#### URL Query Parameter Integration

Current app already uses `URLSearchParams` for `?color=` (shared color deep links). The `?view=` param integrates with this:

```
// Explorer (default — param can be omitted)
https://app.example.com/
https://app.example.com/?view=explorer

// Visualizer
https://app.example.com/?view=visualizer

// Shared color opens in Explorer, then user can switch
https://app.example.com/?color=SW6244&view=explorer

// Direct link to Visualizer (ignores ?color= on Visualizer tab)
https://app.example.com/?view=visualizer
```

**Behavior rules:**

- On page load, read `?view=` param. Default to `explorer` if absent.
- On tab switch, update URL via `history.replaceState()` (no page reload, no history pollution).
- If `?color=` param is present and `?view=visualizer`, auto-switch to Explorer first to open the color modal, then allow manual switch to Visualizer.

#### View Container HTML Structure

```html
<!-- Existing header stays as-is, plus a second toolbar panel -->
<header class="header">
  <div class="header__top">
    <h1>Sherwin-Williams Color Explorer</h1>
    <button type="button" id="toolbar-toggle" class="toolbar__toggle" ...>
      ...hamburger icon...
    </button>
  </div>

  <!-- Explorer toolbar panel (existing, unchanged) -->
  <div id="toolbar-panel-explorer" class="toolbar__panel" hidden>
    ...LRV filter + action buttons...
  </div>

  <!-- Visualizer toolbar panel (new) -->
  <div id="toolbar-panel-visualizer" class="toolbar__panel" hidden>
    <div class="toolbar__content">
      <div class="toolbar__section toolbar__section--room">
        <h2 class="toolbar__section-title">Room</h2>
        <span class="toolbar__placeholder">Bedroom</span>
      </div>
      <div class="toolbar__section toolbar__section--lighting">
        <h2 class="toolbar__section-title">Lighting</h2>
        <span class="toolbar__placeholder toolbar__placeholder--future"
          >Coming in a future update</span
        >
      </div>
      <div class="toolbar__section toolbar__section--actions">
        <div class="toolbar__actions">
          <button id="reset-room-btn" class="header__button">
            Reset All Colors
          </button>
          <button id="screenshot-btn" class="header__button" disabled>
            Screenshot
          </button>
        </div>
      </div>
    </div>
  </div>
</header>

<!-- Tab navigation (renders differently per breakpoint via CSS) -->
<nav class="view-tabs" aria-label="View navigation">
  <button
    type="button"
    class="view-tabs__tab view-tabs__tab--active"
    data-view="explorer"
    aria-selected="true"
    role="tab"
  >
    <svg
      class="view-tabs__icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <!-- Grid icon for Explorer -->
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
    </svg>
    <span class="view-tabs__label">Explorer</span>
  </button>
  <button
    type="button"
    class="view-tabs__tab"
    data-view="visualizer"
    aria-selected="false"
    role="tab"
  >
    <svg
      class="view-tabs__icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <!-- Paintbrush icon for Visualizer -->
      <path
        d="M18.37 2.63a2.12 2.12 0 0 1 3 3L14 13l-4 1 1-4z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M9 14.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h4.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span class="view-tabs__label">Visualizer</span>
  </button>
</nav>

<!-- View containers (only one visible at a time) -->
<main
  id="explorer-view"
  class="view view--active"
  role="tabpanel"
  aria-labelledby="explorer-tab"
>
  <div
    id="color-accordion"
    class="accordion"
    aria-label="Color families accordion"
  ></div>
</main>

<section
  id="visualizer-view"
  class="view"
  role="tabpanel"
  aria-labelledby="visualizer-tab"
  hidden
>
  <div class="visualizer">
    <div class="visualizer__canvas-container">
      <canvas id="visualizer-canvas" class="visualizer__canvas"></canvas>
    </div>
    <!-- Palette strip and controls added in Phase 3+ -->
  </div>
</section>
```

#### Responsive CSS Rules

```css
/* === View Tabs — Base (mobile-first) === */
.view-tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sticky);
  display: flex;
  height: 48px;
  background: var(--color-surface-primary);
  border-top: 1px solid var(--color-border-primary);
}

.view-tabs__tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs); /* 12px label */
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-1) 0;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);
  min-height: 44px;
  -webkit-tap-highlight-color: transparent;
}

.view-tabs__tab--active {
  color: var(--color-text-inverse);
  background: var(--color-primary);
  font-weight: var(--font-weight-bold);
}

.view-tabs__tab:not(.view-tabs__tab--active):hover {
  background: var(--color-surface-hover);
}

.view-tabs__tab:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: -2px;
}

.view-tabs__icon {
  width: 20px;
  height: 20px;
}

.view-tabs__label {
  line-height: var(--line-height-tight);
}

/* Ensure main content doesn't hide behind fixed bottom bar */
body {
  padding-bottom: 48px;
}

/* === View containers === */
.view {
  display: block;
}
.view[hidden] {
  display: none;
}

/* === Tablet: move tabs to top, render as segmented control === */
@media (min-width: 600px) {
  .view-tabs {
    position: static;
    height: 40px;
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-2) var(--spacing-4);
    border-top: none;
    border-bottom: 1px solid var(--color-border-primary);
    gap: var(--spacing-2);
    background: none;
  }

  .view-tabs__tab {
    flex: 0 1 auto;
    flex-direction: row;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    border: 1px solid var(--color-border-primary);
    min-height: 36px;
  }

  .view-tabs__tab--active {
    border-color: var(--color-primary);
  }

  body {
    padding-bottom: 0; /* No fixed bottom bar on tablet+ */
  }
}

/* === Desktop: slightly larger tabs === */
@media (min-width: 900px) {
  .view-tabs {
    padding: var(--spacing-2) var(--spacing-8);
  }

  .view-tabs__tab {
    min-height: 40px;
    font-size: var(--font-size-base);
    padding: var(--spacing-2) var(--spacing-5);
  }
}
```

#### Tab Switching Logic

```javascript
// In app.js or a new NavigationController
class NavigationController {
  constructor() {
    this.activeView = "explorer"; // default
    this.tabs = document.querySelectorAll(".view-tabs__tab");
    this.explorerView = document.getElementById("explorer-view");
    this.visualizerView = document.getElementById("visualizer-view");
    this.headerTitle = document.querySelector(".header h1");
    this.toolbarToggle = document.getElementById("toolbar-toggle");
    this.explorerToolbar = document.getElementById("toolbar-panel-explorer");
    this.visualizerToolbar = document.getElementById(
      "toolbar-panel-visualizer",
    );
  }

  init() {
    // Read initial view from URL
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    if (viewParam === "visualizer") {
      this.switchTo("visualizer");
    }

    // Tab click delegation
    document.querySelector(".view-tabs").addEventListener("click", (e) => {
      const tab = e.target.closest(".view-tabs__tab");
      if (tab) {
        this.switchTo(tab.dataset.view);
      }
    });

    // Keyboard: left/right arrow to switch between tabs
    document.querySelector(".view-tabs").addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const target =
          this.activeView === "explorer" ? "visualizer" : "explorer";
        this.switchTo(target);
        // Focus the newly active tab
        document
          .querySelector(`.view-tabs__tab[data-view="${target}"]`)
          .focus();
      }
    });
  }

  switchTo(view) {
    if (view === this.activeView) return;
    this.activeView = view;

    // Close hamburger if open
    this.toolbarToggle.setAttribute("aria-expanded", "false");
    this.explorerToolbar.hidden = true;
    this.visualizerToolbar.hidden = true;

    // Update tab states
    this.tabs.forEach((tab) => {
      const isActive = tab.dataset.view === view;
      tab.classList.toggle("view-tabs__tab--active", isActive);
      tab.setAttribute("aria-selected", isActive);
    });

    // Switch view containers (instant, no animation)
    this.explorerView.hidden = view !== "explorer";
    this.visualizerView.hidden = view !== "visualizer";

    // Update header title
    this.headerTitle.textContent =
      view === "explorer"
        ? "Sherwin-Williams Color Explorer"
        : "Sherwin-Williams Room Visualizer";

    // Swap toolbar panel reference for hamburger
    this.toolbarToggle.setAttribute(
      "aria-controls",
      view === "explorer"
        ? "toolbar-panel-explorer"
        : "toolbar-panel-visualizer",
    );

    // Update URL (replaceState — no history entry)
    const url = new URL(window.location);
    url.searchParams.set("view", view);
    history.replaceState(null, "", url);
  }
}
```

#### Accessibility Considerations (WCAG 2.2 AA)

| Criterion                      | Implementation                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **2.4.3 Focus Order**          | Tab bar uses `role="tab"` with `aria-selected`. Arrow keys switch tabs. Focus moves logically from header → tabs → active view content. |
| **4.1.2 Name, Role, Value**    | Each tab has `role="tab"`, `aria-selected`. View containers have `role="tabpanel"`, `aria-labelledby` pointing to their tab.            |
| **1.4.11 Non-text Contrast**   | Active tab filled background meets 3:1 against inactive tab. Active icon color meets 3:1 against fill.                                  |
| **2.4.7 Focus Visible**        | `:focus-visible` with 2px `--color-border-focus` outline on tabs.                                                                       |
| **2.1.1 Keyboard**             | Arrow keys switch tabs. Enter/Space on a tab activates it. Tab key moves focus into the active view content.                            |
| **1.3.1 Info & Relationships** | `<nav aria-label="View navigation">` wraps tabs. Programmatic relationship between tabs and panels via `aria-controls`.                 |

#### Implementation Checklist

- [ ] Add `<nav class="view-tabs">` with two tab buttons (Explorer + Visualizer) to `index.html`
- [ ] Wrap existing `<main>` accordion in `#explorer-view` container with `role="tabpanel"`
- [ ] Add `#visualizer-view` container with canvas element, `role="tabpanel"`, initially `hidden`
- [ ] Add second toolbar panel `#toolbar-panel-visualizer` to header (Room label, lighting placeholder, Reset + Screenshot buttons)
- [ ] Rename existing `#toolbar-panel` to `#toolbar-panel-explorer`
- [ ] Add `view-tabs` CSS: fixed bottom bar on mobile, segmented control on tablet, top tabs on desktop
- [ ] Add `view-tabs__tab--active` filled style + inactive outlined style
- [ ] Add `body { padding-bottom: 48px }` on mobile to account for fixed bottom bar
- [ ] Remove `padding-bottom` on tablet+ where tabs are inline
- [ ] Add `.view` and `.view[hidden]` CSS for view container show/hide
- [ ] Create `NavigationController` class (or add navigation methods to existing controller)
- [ ] Implement `switchTo(view)` — toggle views, update tabs, update title, swap toolbar, update URL
- [ ] Read `?view=` query param on page load to set initial view
- [ ] Update URL via `history.replaceState()` on tab switch (no history stack pollution)
- [ ] Handle `?color=` + `?view=visualizer` conflict (auto-switch to Explorer if shared color present)
- [ ] Add keyboard support: Arrow Left/Right to switch tabs, Enter/Space to activate
- [ ] Add `role="tab"`, `aria-selected`, `aria-controls` attributes to tab buttons
- [ ] Add `role="tabpanel"`, `aria-labelledby` to view containers
- [ ] Update `config.js` with new ELEMENT_IDS: `EXPLORER_VIEW`, `VISUALIZER_VIEW`, `VIEW_TABS`, `TOOLBAR_PANEL_EXPLORER`, `TOOLBAR_PANEL_VISUALIZER`, `VISUALIZER_CANVAS`, `RESET_ROOM_BTN`, `SCREENSHOT_BTN`
- [ ] Update `config.js` with new CSS_CLASSES: `VIEW_TABS_TAB`, `VIEW_TABS_TAB_ACTIVE`, `VIEW_TABS_ICON`, `VIEW_TABS_LABEL`, `VIEW_ACTIVE`, `VISUALIZER`, `VISUALIZER_CANVAS_CONTAINER`
- [ ] Connect `VisualizerCanvas.init()` on page load (eager initialization, pre-renders bedroom while hidden)
- [ ] Ensure hamburger `aria-controls` attribute swaps to the correct toolbar panel on tab switch
- [ ] Visual QA: bottom tab bar on iPhone SE (375×667), iPhone 14 (390×844)
- [ ] Visual QA: segmented control on iPad Mini (768×1024), iPad Air (820×1180)
- [ ] Visual QA: top tabs on desktop (1366×768, 1920×1080)
- [ ] Verify toast notifications still appear above the bottom tab bar on mobile
- [ ] Version bump `version.js` for service worker cache bust

### Phase 3 — Color Assignment & Palette

**Goal:** Users can assign colors to walls from the Explorer or a palette strip.

- [ ] Create `VisualizerState` model (wall assignments, persistence to localStorage)
- [ ] Create `AssignWallColorCommand` (extends existing command pattern)
- [ ] Implement palette strip UI (horizontal scrollable, favorites-sourced)
- [ ] "Apply to Wall" button on color tiles (mobile)
- [ ] Drag-and-drop from accordion tiles to canvas walls (desktop)
- [ ] "Apply to Visualizer" action button in color detail modal
- [ ] Canvas re-renders walls with assigned HSL colors
- [ ] Undo/redo stack (FAB on mobile, keyboard shortcut on desktop)

### Phase 4 — Lighting Engine

**Goal:** Canvas walls respond to simulated lighting conditions.

- [ ] Build gradient-based light source renderer (`utils/lighting.js`)
- [ ] Light source types: window (directional daylight), overhead fixture (radial), lamp (spot)
- [ ] `globalCompositeOperation` blending for light/shadow layers on canvas
- [ ] LRV integration — surface reflection intensity scales with color's LRV value
- [ ] Time-of-day slider (maps to color temperature + intensity presets)
- [ ] Window regions in room template emit daylight; intensity tied to time slider

### Phase 5 — Lighting UI Controls

**Goal:** Users can adjust lighting interactively.

- [ ] Default: single "Time of Day" slider (dawn → midday → dusk → night)
- [ ] Preset buttons: "Bright Daylight", "Overcast", "Evening Warm", "Night / Artificial"
- [ ] "Advanced" accordion (progressive disclosure) for per-source toggles and Kelvin values
- [ ] Responsive: collapsed by default on mobile, inline on desktop
- [ ] LRV callout: when a wall has LRV < 20 and lighting is low, show educational tooltip

### Phase 6 — Context-Aware Modals

**Goal:** Modals adapt behavior based on which view they're opened from.

- [ ] When opening modal from Visualizer: render as bottom sheet (mobile) / side panel (desktop)
- [ ] Semi-transparent backdrop so canvas stays partially visible
- [ ] "Apply to Visualizer" CTA prominently placed in modal actions
- [ ] "Apply Palette" action: assigns coordinating colors to room wall roles automatically
- [ ] Modal mini-tiles (coordinating/similar) get "Apply" quick action on long-press or secondary tap

### Phase 7 — Multiple Rooms, Persistence & Polish

**Goal:** Full feature parity and quality polish.

- [ ] Additional room templates: bedroom, kitchen, bathroom, exterior
- [ ] Room selector UI (thumbnail grid)
- [ ] "Screenshot" / export canvas as PNG (via `canvas.toBlob()`)
- [ ] Compare mode: side-by-side two lighting conditions or two color schemes
- [ ] Full localStorage persistence of all room assignments
- [ ] Performance optimization pass (OffscreenCanvas, requestAnimationFrame batching)
- [ ] Accessibility audit: keyboard navigation for all Visualizer controls, screen reader announcements for wall selection and color assignment
- [ ] Version bump and service worker cache update

---

## Existing Design System References

These tokens and patterns from `design-system.md` and `styles.css` apply directly:

| Token / Pattern                              | Usage in Visualizer                                               |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `--z-sticky: 200`                            | Tab bar z-index (must be below modal but above content)           |
| `--z-overlay: 500`                           | Canvas overlay controls (undo FAB, zoom)                          |
| `--button-min-height: 44px`                  | All Visualizer touch targets                                      |
| `--radius-sm: 6px`                           | Palette strip tile corners                                        |
| `--radius-md: 8px`                           | Canvas container border radius                                    |
| `--shadow-md`                                | Palette strip elevation                                           |
| `--transition-fast: 150ms`                   | Wall hover highlight                                              |
| `--transition-base: 200ms`                   | Tab switching                                                     |
| `--transition-medium: 300ms`                 | Lighting slider response                                          |
| `--color-border-focus`                       | Selected wall outline                                             |
| `--color-surface-secondary`                  | Palette strip background                                          |
| `--spacing-2` through `--spacing-8`          | All padding/gap values                                            |
| BEM naming convention                        | `.visualizer__canvas`, `.palette-strip__item`, `.tab-bar__button` |
| Command pattern                              | `AssignWallColorCommand`, `ChangeLightingCommand`                 |
| Delegated event handling                     | Single listener on canvas container for wall clicks               |
| `@media (hover: none) and (pointer: coarse)` | Disable drag-and-drop on touch devices                            |
| `@media (prefers-reduced-motion: reduce)`    | Disable lighting transition animations                            |

---

**Version**: 1.0
**Created**: February 21, 2026
**Last Updated**: February 22, 2026
