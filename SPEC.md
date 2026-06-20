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
├── domain/               # types.ts (shared facet/sort vocabulary)
├── utils/                # base.ts, config.ts, storage.ts, slug.ts, seo.ts, breakpoints.ts,
│                         #   clipboard.ts, colorMath.ts, colorCopy.ts, ExportService.ts
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

`ColorModel` is a thin repository: it builds the indexes (by id/slug, families,
collections, designer picks) and delegates faceting to the pure `queryColors` /
`sortColors` in `models/colorQuery.ts` (no `this`, fully unit-tested). Color math
(`hsl`, `classifyLrv`, `undertone`, `neutrality`) lives in `utils/colorMath.ts`;
user-facing prose (`describeLrv`, `similarityRole`, `formatUseTypes`) in
`utils/colorCopy.ts`. Shared facet/sort types live in `domain/types.ts`.

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
undertone / neutrality / lightness); SPA navigations announced via a polite live
region (`RouteAnnouncer`).

## Testing

- **Unit**: `colorMath`, `colorCopy`, `colorQuery`, `ColorModel`, `slug`, `seo`,
  `contrast`, `ExportService`, `Toast`, dataset integrity (`palette.integrity`),
  the hooks, and each context.
- **Integration**: `atlas.test.tsx` drives the routed app (facets, sort, views,
  compare, palette, detail, clipboard) via the DOM; `ColorCard.test.tsx`.
- **E2E**: `scripts/validate-devices.mjs` — 6 device profiles, axe scan, skip link,
  no-overflow, SSG-markup, no-trailing-slash redirect (run against `vite preview`).

## CI/CD (`.github/workflows/deploy.yml`)

`verify` (lint → format:check → typecheck → test) and `e2e` (Playwright/axe via
`npm run test:e2e:ci`) both gate `build` → `deploy` to GitHub Pages.

## Known follow-ups

- `palette.ts` (~1.6 MB) is statically bundled — code-split or fetch as JSON.
- Soft 404s can't return a real HTTP 404 on static hosting; mitigated with a
  client-side `noindex` (`useNoindex`) on the not-found view.
