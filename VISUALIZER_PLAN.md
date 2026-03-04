# Visualizer Feature — Staff-Level Implementation Plan (v6.0)

## Table of Contents

1. [Architectural Paradigm](#1-architectural-paradigm)
2. [The Vector Scene Graph API](#2-the-vector-scene-graph-api)
3. [The Vector Optical Stack (Lighting)](#3-the-vector-optical-stack-lighting)
4. [State Portability: Export & Import](#4-state-portability-export--import)
5. [Unified Rendering Engine](#5-unified-rendering-engine)
6. [UI/UX & Responsive Flow](#6-uiux--responsive-flow)
7. [AI-Digestible Implementation Bites](#7-ai-digestible-implementation-bites)

---

## 1. Architectural Paradigm

The Visualizer integrates seamlessly into the existing decoupled Vanilla JS architecture (CommandBus, EventEmitter, DOM Fragment templating) with **zero external dependencies and zero image assets**.

- **Pure Vector Rendering:** Rooms are generated entirely via SVG paths. This eliminates network waterfalls, solves CORS issues, and provides infinite scalability for high-DPI displays.
- **Event-Driven UI:** The `VisualizerView` subscribes to the global `AppState`. It does not communicate directly with the Color Explorer.
- **Command Bus Routing:** All state mutations (painting walls, importing rooms, changing lighting) are encapsulated as Commands and dispatched through the `CommandBus`.

---

## 2. The Vector Scene Graph API

Rooms are defined by a strict JSON schema that acts as a Scene Graph. The schema contains a `viewport`, `defs` (for textures and gradients), and an array of `layers` rendered from back-to-front using the Painter's Algorithm.

### Layer Types & Enterprise Features

- `paintable`: Interactive walls/trim. Includes `physicalAreaSqFt` for paint volume calculations and `texture` references for realistic drywall/plaster effects.
- `static`: Floors, ceilings. Includes `variants` arrays to allow users to swap between flooring types (e.g., Light Oak vs. Dark Walnut).
- `furniture`: Sofas, decor. Drawn _over_ paintable layers. Includes `shoppable` metadata (brand, price, URL) for affiliate monetization.
- `shadow` / `light-source` / `environment`: The optical stack layers that govern realism.

### Complete Enterprise JSON Schema

```json
{
  "version": "3.0",
  "room": {
    "id": "vector-modern-living",
    "name": "Modern Living Room",
    "metadata": { "roomType": "living-room", "sponsor": "Wayfair" },
    "viewport": { "width": 1200, "height": 800 },
    "lightingPresets": {
      "daylight": { "temperatureHex": "#E6F2FF", "shadowOpacity": 0.7, "sourceOpacity": 0.2 },
      "evening": { "temperatureHex": "#FFDAB9", "shadowOpacity": 0.4, "sourceOpacity": 0.9 }
    },
    "defs": [
      {
        "id": "texture-drywall",
        "type": "filter",
        "svgFilterNode": "<feTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='3' result='noise' /> <feColorMatrix type='matrix' values='1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.05 0' in='noise' result='coloredNoise' /> <feBlend in='SourceGraphic' in2='coloredNoise' mode='multiply' />"
      }
    ],
    "layers": [
      {
        "id": "floor-main",
        "type": "static",
        "variants": [
          { "id": "light-oak", "name": "Light Oak", "fill": "#D2B48C" },
          { "id": "dark-walnut", "name": "Dark Walnut", "fill": "#4A3728" }
        ],
        "activeVariantId": "light-oak",
        "path": "M0,600 L1200,600 L1200,800 L0,800 Z",
        "zIndex": 10
      },
      {
        "id": "wall-accent",
        "type": "paintable",
        "tags": ["wall", "accent"],
        "label": "Back Accent Wall",
        "path": "M200,100 L1000,100 L1000,600 L200,600 Z",
        "defaultHex": "#EAEAEA",
        "texture": "url(#texture-drywall)",
        "physicalAreaSqFt": 145,
        "zIndex": 20
      },
      {
        "id": "sofa-main",
        "type": "furniture",
        "path": "M300,550 C300,500 800,500 800,550 L800,700 L300,700 Z",
        "fill": "#D3D3D3",
        "shoppable": {
          "brand": "West Elm",
          "productName": "Hamilton Leather Sofa",
          "price": "$2,499",
          "outboundUrl": "https://..."
        },
        "zIndex": 40
      },
      {
        "id": "global-temperature",
        "type": "environment",
        "path": "M0,0 L1200,0 L1200,800 L0,800 Z",
        "blendMode": "soft-light",
        "zIndex": 100
      }
    ]
  }
}

3. The Vector Optical Stack (Lighting)

Lighting is offloaded 100% to the browser's hardware-accelerated CSS compositor engine via mix-blend-mode.

    Shadows (type: "shadow"): Baked directional shadows. mix-blend-mode: multiply.

    Ambient Sources (type: "light-source"): Lamps, window blooms using SVG <radialGradient> defs. mix-blend-mode: screen or overlay.

    Global Temperature (type: "environment"): Full-viewport rectangle at the top Z-index. mix-blend-mode: soft-light or overlay. Tints the entire room based on the active lightingPreset.

4. State Portability: Export & Import

Because the Bitset URL architecture cannot hold custom rooms, lighting configurations, or applied colors across massive spaces, we utilize a file-based state portability API.

    Export (ExportRoomCommand): Merges the AppState.roomColors, AppState.currentLighting, and the room's base JSON into a single consolidated .json payload. It triggers a browser download (e.g., my-living-room-design.json).

    Import (ImportRoomCommand): A user uploads a .json file. The command parses it, saves the custom room to IndexedDB, extracts the embedded roomColors/lighting state, and hydrates AppState.

    The Value: Designers can email complete room mockups to clients, who can then drop the file into the app and see the exact same lighting and colors perfectly reproduced.

5. Unified Rendering Engine

    Instantiate: Create <svg viewBox="0 0 {width} {height}"> and an inner <defs> block.

    Sort: Sort layers array by zIndex.

    Construct & Map: Loop through array, create <path> elements. Apply mix-blend-mode properties dynamically based on type.

    Textures: If a layer has texture: "url(#texture-drywall)", apply it.

    Inject: Append the SVG to the DOM wrapper.

6. UI/UX & Responsive Flow

    Mobile (< 900px): Two-tab PWA ("Explorer" | "Visualizer"). The user's Favorites are a horizontal scrolling "Paint Bucket" strip docked to the bottom.

    Desktop (>= 900px): Split pane. Users can drag-and-drop colors from the Explorer grid directly onto SVG polygons in the Visualizer.

    Floating Controls: A glassmorphic panel in the Visualizer for "Lighting Adjust", "Swap Flooring", "Paint Calculator", and "Export Room".
```
