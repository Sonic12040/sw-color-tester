# Architecture — sw-color-tester

The **Color Atlas**: a Progressive Web App for browsing, comparing, and
collecting Sherwin‑Williams paint colors. Built with **Vite + React 19 +
TypeScript (strict)** and **statically pre‑rendered** (one HTML page per color)
for SEO/AI discoverability.

## Tech stack

- **Vite 8** — dev/build; `vite-plugin-pwa` generates the service worker.
- **React 19** + **React Router 7** (data router).
- **TypeScript** strict; bundler resolution; `.js` extensions on relative imports.
- **Vitest + Testing Library (jsdom)** — unit + integration.
- **Playwright + axe-core** — cross-device + accessibility e2e (`scripts/validate-devices.mjs`).
- **ESLint (flat) + Prettier**, enforced in CI.

## Three-tier product

1. **Browse** (`/`) — a faceted gallery: one virtualized grid of all colors with a
   search/sort toolbar and a filter rail (family, undertone, neutrality, lightness,
   use, collection, favorites/hidden view).
2. **Entity** (`/colors/:slug`) — a canonical, pre-rendered page per color with
   JSON-LD, coordinating/similar colors, and HSL/LAB detail.
3. **Workspace** — `/compare` (up to 4 side-by-side) and `/palette` (collect,
   reorder, export, shareable `?c=` URL).

## Source layout

```text
src/
├── main.tsx              # client entry: createBrowserRouter + hydrate/createRoot
├── entry-server.tsx      # SSG render(path) + buildHead() + sitemap/colors helpers
├── routes.tsx            # shared route tree (RootLayout → pages)
├── appModel.ts           # singletons: colorModel, exportService
├── data/                 # palette.ts (generated, ~1.7k active) + types.ts (Color)
├── models/ColorModel.ts  # index (id/slug/family/collection/designer) + query (filter/sort)
├── context/              # Favorites, Hidden, Filters, Compare, Palette, Toast, App
├── hooks/                # useSet, usePersistent{Set,State}, useFocusTrap, useDocumentMeta
├── pages/                # GalleryPage, ColorDetailPage, ComparePage, PalettePage, NotFoundPage
├── components/
│   ├── RootLayout.tsx    # skip link + sticky Header + <main> + CompareTray; AppProviders
│   ├── Header/           # sticky brand + primary nav
│   ├── Atlas/            # AtlasLayout (rail/drawer shell), AtlasToolbar, FilterPanel,
│   │                     #   ActiveFilters, ColorGrid, ColorCard (memoized)
│   ├── ColorDetailView/  # ColorDetail + DetailActions, ColorGridSection, MiniTile, HslBreakdown
│   ├── Workspace/        # CompareTray
│   ├── Toast/, ErrorBoundary/, seo/JsonLd
├── utils/                # base.ts, config.ts, storage.ts, slug.ts, seo.ts,
│                         #   clipboard.ts, colorPresentation.ts, ExportService.ts
└── styles/               # tokens.css, breakpoints.css, a11y.css, global.css
prerender.mjs             # post-build: writes dist/colors/<slug>/index.html + 404.html, sitemap, colors.json
```

## State

Shared state lives in **separate, focused contexts** (composed by `AppProviders`)
so a change to one slice doesn't re-render consumers of another — validated by
`context/context-isolation.test.tsx`.

| Concern       | Source of truth                         | Hook            |
| ------------- | --------------------------------------- | --------------- |
| Color model   | `AppContext` (singleton)                | `useAppContext` |
| Favorites     | `FavoritesContext` (`usePersistentSet`) | `useFavorites`  |
| Hidden        | `HiddenContext` (`usePersistentSet`)    | `useHidden`     |
| Facets + sort | `FiltersContext`                        | `useFilters`    |
| Compare (≤4)  | `CompareContext` (`usePersistentState`) | `useCompare`    |
| Palette       | `PaletteContext` (`usePersistentState`) | `usePalette`    |
| Toasts        | `ToastContext`                          | `useToast`      |

`usePersistent*` use **two-phase init** (render `initial`, load from storage in an
effect) so server-prerendered markup and the first client render agree (no
hydration mismatch); storage access is guarded.

`ColorModel` holds no UI state. `getFilteredColors(criteria, favorites, hidden)`
and `sortColors` take state as arguments and return fresh arrays. Color math +
classification (`hsl`, `classifyLrv`, `undertone`, `neutrality`, `describeLrv`)
live in `utils/colorPresentation.ts`.

**Neutrality** = inverse of perceptual chroma: `0.6·(C*ab/60) + 0.25·rgbSpread +
0.15·saturation`, banded High/Medium/Low at dataset terciles (`config.ts`).

## Rendering / SSG

`build` runs: `tsc` → client build → SSR build (`entry-server`) → `prerender.mjs`,
which renders `/`, `/compare`, `/palette`, and every `/colors/<slug>` to static
HTML (authoritative `<head>` injected by `buildHead`), plus `sitemap.xml`,
`robots.txt`, `colors.json`, and a `404.html` SPA fallback. The PWA precaches the
shell only and runtime-caches color pages.

## Design system

Dark chrome (header, toolbar, rail, tile bars, detail card) over a neutral-gray
color canvas. All surfaces/text on dark come from tokens in `tokens.css`
(`--surface-dark`, `--chip-dark`, `--on-dark*`); the deploy base path is the single
literal in `utils/base.ts` (consumed by the app, `vite.config.ts`, and `prerender.mjs`).

## Accessibility

Skip link → `<main>`; sticky-aware `scroll-margin` (focus not obscured); focus
rings tuned per surface; ≥44px targets; AAA-grade contrast (guarded by
`styles/contrast.test.ts`); color never the sole signal (text chips for family /
undertone / neutrality / lightness).

## Testing

- **Unit**: `colorPresentation`, `ColorModel`, `slug`, `seo`, `contrast`, the
  hooks, and each context.
- **Integration**: `atlas.test.tsx` drives the routed app (facets, sort, views,
  compare, palette, detail, clipboard) via the DOM; `ColorCard.test.tsx`.
- **E2E**: `scripts/validate-devices.mjs` — 6 device profiles, axe scan, skip link,
  no-overflow, SSG-markup, no-trailing-slash redirect (run against `vite preview`).

## CI/CD (`.github/workflows/deploy.yml`)

`verify` (lint → format:check → typecheck → test) gates `build` → `deploy` to
GitHub Pages. **The Playwright/axe e2e is not yet wired into CI** (see follow-ups).

## Known follow-ups

- Wire `scripts/validate-devices.mjs` into CI as a gating `test:e2e`.
- Extract `getFilteredColors`/`sortColors` into pure functions; centralize domain
  types; split color _math_ from UI _copy_ in `colorPresentation.ts`.
- Unify the button styles; tokenize the remaining one-off on-dark alphas.
- `palette.ts` (~1.6 MB) is statically bundled — code-split or fetch as JSON.
- SPA route changes aren't announced to screen readers; soft 404s return HTTP 200.
