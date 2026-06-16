# Spec: Migrate sw-color-tester to TypeScript + Vite + React with GitHub Pages CI/CD

_Status: Resolved open questions — awaiting final implementation approval._

---

## Objective

Migrate the existing vanilla-JS MVC PWA to a modern stack:

- **TypeScript** (strict) for static type safety across all source files
- **Vite** (v8) as the build tool and dev server
- **React 19** as the UI layer, replacing hand-rolled DOM manipulation
- **ES Modules** throughout (no CommonJS)
- **vite-plugin-pwa** to regenerate the service worker
- **GitHub Actions → GitHub Pages** for automated deployment on every push to `main`

The app's existing behaviour and visual design must be fully preserved, with the following deliberate scope changes:
- **Visualizer feature removed** — all Visualizer components, controllers, commands, and CSS are deleted
- **`templates.js` deleted** — HTML-string generation is replaced entirely by JSX
- **`DialogService` replaced** — `window.confirm`/`window.alert` calls are replaced by a `<ConfirmDialog />` React component

**Users:** The same end-users as today — people browsing Sherwin-Williams paint colours. They should notice no change in behaviour, only potentially faster initial load and improved caching from a Vite-optimised build.

**Success means:** The migrated app builds, passes `tsc --noEmit`, deploys to `https://Sonic12040.github.io/sw-color-tester/`, and exhibits identical behaviour to the current app.

---

## Tech Stack

| Layer | Technology | Installed version |
|---|---|---|
| Language | TypeScript | `^6.0.3` |
| Build / Dev | Vite | `^8.0.16` |
| UI | React + ReactDOM | `^19.2.7` |
| React Vite plugin | @vitejs/plugin-react | latest compatible |
| PWA | vite-plugin-pwa | latest compatible |
| CSS | CSS Modules (`.module.css`) | — |
| Deploy | GitHub Actions → GitHub Pages | — |

---

## Commands

```bash
# Install remaining deps (run once after spec is approved)
npm install

# Development server (hot reload)
npm run dev

# Type-check only (no emit)
npm run typecheck

# Production build (outputs to dist/)
npm run build

# Preview production build locally
npm run preview

# Deploy is automatic — push to main triggers GitHub Actions
```

Final `package.json` scripts section:

```json
{
  "dev":       "vite",
  "build":     "tsc --noEmit && vite build",
  "typecheck": "tsc --noEmit",
  "preview":   "vite preview"
}
```

---

## Project Structure

```
sw-color-tester/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions: build → Pages
├── public/
│   ├── favicon.svg             ← copied as-is from root
│   └── manifest.json           ← copied as-is from root
├── src/
│   ├── main.tsx                ← app entry point (replaces app.js)
│   ├── App.tsx                 ← root React component
│   │
│   ├── data/
│   │   └── palette.ts          ← color data (replaces constants.js)
│   │
│   ├── models/
│   │   ├── ColorModel.ts       ← migrated as-is, typed
│   │   └── AppState.ts         ← migrated as-is, typed
│   │
│   ├── commands/
│   │   ├── ColorCommand.ts
│   │   ├── ApplyColorCommand.ts
│   │   ├── BulkFavoriteCommand.ts
│   │   ├── BulkHideCommand.ts
│   │   ├── ClearFavoritesCommand.ts
│   │   ├── ClearHiddenCommand.ts
│   │   ├── ExportRoomCommand.ts
│   │   ├── ImportRoomCommand.ts
│   │   ├── ToggleFavoriteCommand.ts
│   │   ├── ToggleHiddenCommand.ts
│   │   ├── UnhideGroupCommand.ts
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── bitset-codec.ts
│   │   ├── CommandBus.ts
│   │   ├── config.ts
│   │   ├── dom.ts              ← kept; low-level DOM helpers used during init only
│   │   ├── EventEmitter.ts
│   │   ├── ExportService.ts
│   │   ├── featureFlags.ts
│   │   └── StorageService.ts
│   │   ← DialogService.ts DELETED (replaced by <ConfirmDialog />)
│   │   ← templates.ts NOT migrated (replaced by JSX)
│   │
│   ├── context/
│   │   └── AppContext.tsx       ← React context exposing AppState + CommandBus
│   │
│   ├── hooks/
│   │   ├── useAppState.ts       ← subscribes to AppState, returns reactive snapshot
│   │   ├── useColorController.ts← controller logic extracted from ColorController.js
│   │   └── useLrvFilter.ts      ← LrvFilterController logic
│   │   ← useVisualizer.ts NOT created (Visualizer removed)
│   │
│   ├── components/
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   └── Header.module.css
│   │   ├── ColorExplorer/
│   │   │   ├── ColorExplorer.tsx       ← replaces ColorController + ColorView
│   │   │   ├── ColorExplorer.module.css
│   │   │   ├── ColorAccordion/
│   │   │   │   ├── ColorAccordion.tsx
│   │   │   │   └── ColorAccordion.module.css
│   │   │   ├── ColorTile/
│   │   │   │   ├── ColorTile.tsx
│   │   │   │   └── ColorTile.module.css
│   │   │   └── BulkActionsPanel/
│   │   │       ├── BulkActionsPanel.tsx
│   │   │       └── BulkActionsPanel.module.css
│   │   ├── LrvFilter/
│   │   │   ├── LrvFilter.tsx
│   │   │   └── LrvFilter.module.css
│   │   ├── Modal/
│   │   │   ├── Modal.tsx               ← colour-detail modal
│   │   │   └── Modal.module.css
│   │   ├── ConfirmDialog/
│   │   │   ├── ConfirmDialog.tsx        ← replaces window.confirm / DialogService
│   │   │   └── ConfirmDialog.module.css
│   │   └── Toast/
│   │       ├── Toast.tsx
│   │       └── Toast.module.css
│   │   ← Visualizer/ NOT created (Visualizer removed)
│   │
│   └── styles/
│       ├── tokens.css          ← design tokens (migrated from css/tokens.css)
│       └── global.css          ← @layer declarations + base resets (not modularised)
│
├── index.html                  ← Vite root HTML (simplified — CSS links removed)
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
└── package.json
```

### What moves where

| Old path | New path | Notes |
|---|---|---|
| `app.js` | `src/main.tsx` | Wiring becomes React tree mount |
| `constants.js` | `src/data/palette.ts` | Typed with `Color` interface |
| `models/*.js` | `src/models/*.ts` | Class fields typed, private fields kept |
| `commands/*.js` | `src/commands/*.ts` | Types on constructor params |
| `utils/*.js` (except `templates.js`, `DialogService.js`) | `src/utils/*.ts` | Types added |
| `utils/templates.js` | **DELETED** | Replaced by JSX |
| `utils/DialogService.js` | **DELETED** | Replaced by `<ConfirmDialog />` |
| `views/ColorView.js` | `src/components/ColorExplorer/**` | Replaced by React |
| `views/VisualizerView.js` | **DELETED** | Visualizer removed |
| `controllers/ColorController.js` | `src/hooks/useColorController.ts` | Controller logic → hook |
| `controllers/LrvFilterController.js` | `src/hooks/useLrvFilter.ts` | Controller logic → hook |
| `controllers/ModalController.js` | `src/hooks/useModal.ts` | Controller logic → hook |
| `controllers/VisualizerController.js` | **DELETED** | Visualizer removed |
| `css/*.css` | `src/components/**/*.module.css` | Per-component CSS Modules |
| `css/tokens.css` | `src/styles/tokens.css` | Globally imported, not modularised |
| `index.html` | `index.html` | CSS `<link>` tags removed; Vite handles CSS |
| `service-worker.js` | Generated by vite-plugin-pwa | Hand-rolled SW deleted |
| `sw-registration.js` | Generated by vite-plugin-pwa | Deleted |
| `commands/ApplyColorCommand.js` | **DELETED** | Visualizer-only command |
| `commands/ExportRoomCommand.js` | **DELETED** | Visualizer-only command |
| `commands/ImportRoomCommand.js` | **DELETED** | Visualizer-only command |
| `css/visualizer.css` | **DELETED** | Visualizer removed |
| `version.js` | `import.meta.env.VITE_APP_VERSION` | Vite define replaces file |
| `manifest.json` | `public/manifest.json` | Copied as-is |
| `favicon.svg` | `public/favicon.svg` | Copied as-is |

---

## Code Style

### TypeScript / React conventions

```tsx
// Components: named exports, PascalCase, co-located CSS Module
import styles from './ColorTile.module.css';

interface ColorTileProps {
  color: Color;
  isFavorite: boolean;
  isHidden: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onView: (id: string) => void;
}

export function ColorTile({ color, isFavorite, isHidden, onToggleFavorite, onToggleHidden, onView }: ColorTileProps) {
  return (
    <article className={`${styles.tile} ${color.isDark ? styles.dark : styles.light}`}>
      {/* ... */}
    </article>
  );
}
```

### Key conventions

- **No default exports** for components — named exports only
- **Interfaces over types** for object shapes
- **`const` for everything** that doesn't need reassignment
- **Private class fields** (`#field`) preserved from original JS
- **CSS Modules** for component styles; class names from `styles.foo` not string literals
- **No `any`** — use `unknown` and narrow, or define a proper interface
- **Imports**: relative paths within `src/`, no path aliases unless added explicitly

### `ConfirmDialog` usage pattern

All callers of the old `DialogService.confirm()` / `window.confirm` pass a callback through a React context hook:

```tsx
// Caller
const { confirm } = useConfirmDialog();
const handleClear = async () => {
  const ok = await confirm({ message: 'Clear all favorites?' });
  if (ok) commandBus.dispatch(new ClearFavoritesCommand());
};

// ConfirmDialog renders a <dialog> element at the app root via portal
```

### `Color` type (canonical, defined in `src/data/palette.ts`)

```ts
export interface Color {
  id: string;
  name: string;
  colorNumber: string;
  brandKey: string;
  hex: string;
  red: number;
  green: number;
  blue: number;
  hue: number;
  saturation: number;
  lightness: number;
  lrv: number;
  isDark: boolean;
  isInterior: boolean;
  isExterior: boolean;
  colorFamilyNames: string[];
  brandedCollectionNames: string[];
  similarColors: string[];
  description: string[];
  storeStripLocator?: string;
  coordinatingColors?: {
    coord1ColorId?: string;
    coord2ColorId?: string;
    whiteColorId?: string;
  };
  archived?: boolean;
  ignore?: boolean;
}
```

---

## Architecture: MVC → React

The existing MVC architecture maps as follows:

```
Old                          New
─────────────────────────────────────────────────
ColorModel (JS class)    →   ColorModel.ts (unchanged logic, typed)
AppState (JS class)      →   AppState.ts (unchanged logic, typed)
CommandBus (JS class)    →   CommandBus.ts (unchanged logic, typed)
Commands (JS classes)    →   commands/*.ts (unchanged logic, typed)
                             (Visualizer-only commands deleted)
─────────────────────────────────────────────────
ColorView (DOM manip)    →   React components (ColorExplorer, ColorTile, …)
VisualizerView (DOM)     →   DELETED (Visualizer removed)
templates.js (HTML str)  →   DELETED (replaced by JSX)
DialogService.js         →   DELETED (replaced by <ConfirmDialog />)
─────────────────────────────────────────────────
ColorController          →   useColorController() hook
LrvFilterController      →   useLrvFilter() hook
ModalController          →   useModal() hook + <Modal /> component
VisualizerController     →   DELETED (Visualizer removed)
─────────────────────────────────────────────────
AppState subscription    →   useAppState() hook (subscribes via EventEmitter,
                             returns a React state snapshot)
```

**State flow:**

```
AppState (singleton, event-driven)
    ↓  useAppState() hook subscribes via EventEmitter
React components receive typed snapshot
    ↓  user interaction
Component calls hook handler
    ↓
CommandBus.dispatch(new XxxCommand(...))
    ↓
AppState mutates → emits 'change'
    ↓
useAppState() re-renders affected components
```

---

## Testing Strategy

No tests exist in the current codebase. Testing infrastructure setup is **out of scope** for this migration. A follow-up spec will cover test setup.

The migration is verified by:
1. `npm run typecheck` passes with zero errors
2. `npm run build` produces a `dist/` without errors
3. `npm run preview` — manual smoke test of all features

---

## GitHub Actions Workflow

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

The **GitHub Pages source** must be set to **GitHub Actions** in the repo settings (not the legacy "Deploy from branch" method).

---

## Vite Config

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/sw-color-tester/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we supply our own public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
});
```

---

## Boundaries

**Always:**
- Run `npm run typecheck` before considering any task done
- Use CSS Modules for component-scoped styles
- Keep Models, Commands, and utils as plain TypeScript classes (no React dependencies inside them)
- Use named exports for all components

**Ask first:**
- Adding any npm dependency not already in `package.json`
- Changing the `tsconfig.json` `strict` or `target` settings
- Modifying `public/manifest.json` content
- Changing the GitHub Actions Node version

**Never:**
- Use `any` — use `unknown` or proper interfaces
- Import React internals directly inside `src/models/`, `src/commands/`, or `src/utils/`
- Commit secrets or API keys
- Delete the original `.js` source files until the TypeScript equivalents are verified and building

---

## Success Criteria

- [ ] `npm run build` exits 0 with no TypeScript errors or Vite warnings
- [ ] `npm run typecheck` exits 0
- [ ] The deployed site at `https://Sonic12040.github.io/sw-color-tester/` loads and functions identically to the current app
- [ ] All colour families render in the accordion
- [ ] Favourite / hide / bulk-action commands work
- [ ] LRV filter works
- [ ] Modal (colour detail) opens and closes correctly
- [ ] Confirm dialogs (`<ConfirmDialog />`) work for bulk-clear actions
- [ ] Export / import works
- [ ] No Visualizer tab, Visualizer CSS, or Visualizer commands present in the build
- [ ] PWA installs (service worker registers, app is offline-capable)
- [ ] GitHub Actions workflow runs green on every push to `main`
- [ ] Lighthouse PWA audit passes

---

## Resolved Decisions

| Question | Decision |
|---|---|
| `templates.js` | **Deleted** — replaced entirely by JSX |
| `DialogService.js` | **Deleted** — replaced by `<ConfirmDialog />` React component |
| Visualizer | **Removed from scope** — all Visualizer files deleted |

---

## Implementation Plan (Phase 2 — pending approval)

Once this spec is approved, implementation will be broken into the following ordered phases:

1. **Scaffold** — `vite.config.ts`, `tsconfig.json`, install missing deps, GitHub Actions workflow, restructure folders
2. **Type the data layer** — `src/data/palette.ts` with `Color` interface, migrate `constants.js`
3. **Migrate Models + Utils** — `.js` → `.ts` with types, no logic changes
4. **Migrate Commands** — `.js` → `.ts` with types
5. **AppContext + useAppState** — React context wiring AppState to components
6. **ConfirmDialog** — `<ConfirmDialog />` component + `useConfirmDialog()` hook replaces `DialogService`
7. **Core components** — `ColorTile`, `ColorAccordion`, `ColorExplorer`
7. **Supporting components** — `LrvFilter`, `Modal`, `Header`, `Toast`
8. **Visualizer component** — `Visualizer.tsx`
9. **PWA + CSS polish** — CSS Modules conversion, vite-plugin-pwa config
10. **Deploy + verify** — Push to `main`, confirm GitHub Actions green, smoke test
