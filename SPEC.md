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
2. **Entity** (`/colors/:slug`) — a canonical, pre-rendered page per color: a
   plain-language summary, a "Get this color" panel (sample/store/buy links +
   paint calculator), JSON-LD, coordinating/similar colors, with HSL/LAB and raw
   specs tucked under a "Technical details" disclosure.
3. **Workspace** — `/compare` (up to 4 side-by-side, with a pairwise WCAG
   contrast matrix) and `/palette` — multiple named projects, each with
   collect / reorder / per-color notes + room tags / export (JSON · PNG board ·
   PDF spec sheet) / per-row hue relationships / shareable `?c=` URL.

## Source layout

```text
src/
├── main.tsx              # client entry: createBrowserRouter + hydrate/createRoot
├── entry-server.tsx      # SSG render(path) + buildHead() + sitemap/colors helpers
├── routes.tsx            # shared route tree (RootLayout → pages)
├── appModel.ts           # singletons: colorModel, exportService
├── data/                 # palette.ts (generated, ~1.7k active; code-split into its own client chunk) + types.ts
├── models/ColorModel.ts  # index (id/slug/family/collection/designer) + query (filter/sort)
├── context/              # Favorites, Hidden, Filters, Compare, Palette, Toast, App
├── hooks/                # useSet, usePersistent{Set,State}, useFocusTrap, useDocumentMeta
├── pages/                # GalleryPage, ColorDetailPage, ComparePage, PalettePage, NotFoundPage
├── components/
│   ├── RootLayout.tsx    # skip link + sticky Header + <main> + CompareTray; AppProviders
│   ├── Header/           # sticky brand + primary nav
│   ├── Atlas/            # AtlasLayout (rail/drawer shell), AtlasToolbar, FilterPanel,
│   │                     #   ActiveFilters, ColorGrid, ColorCard (memoized)
│   ├── ColorDetailView/  # ColorDetail, DetailActions, GetColorPanel, PaintCalculator,
│   │                     #   ColorGridSection, MiniTile, HslBreakdown
│   ├── Workspace/        # CompareTray, ContrastMatrix
│   ├── Toast/, ErrorBoundary/, seo/JsonLd
├── domain/               # types.ts (shared facet/sort vocabulary)
├── utils/                # base.ts, config.ts, storage.ts, slug.ts, seo.ts, breakpoints.ts, clipboard.ts, colorMath.ts,
│                         #   colorCopy.ts, paint.ts, swLinks.ts, ogTemplate.ts, ExportService.ts, paletteExport.ts (lazy)
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

`usePersistent*` use **two-phase init** (render `initial`, then load from storage)
so server-prerendered markup and the first client render agree (no hydration
mismatch); storage access is guarded. The load runs in a **layout effect**
(`useIsomorphicLayoutEffect`) — before the browser paints — so a persisted sort
or hidden set shows in the first visible frame instead of flashing the default.

`ColorModel` is a thin repository: it builds the indexes (by id/slug, families,
collections, designer picks) and delegates faceting to the pure `queryColors` /
`sortColors` in `models/colorQuery.ts` (no `this`, fully unit-tested). Color math
(`hsl`, `classifyLrv`, `undertone`, `neutrality`, `contrastRatio`, `hueRelation`)
lives in `utils/colorMath.ts`;
user-facing prose (`summarize`, `describeLrv`, `similarityRole`, `formatUseTypes`)
in `utils/colorCopy.ts`. Shared facet/sort types live in `domain/types.ts`.
`summarize` composes a one-sentence, jargon-free description (warmth + lightness +
chroma + use suggestion) used on the detail page and in the SEO meta/JSON-LD.

**Neutrality** = inverse of perceptual chroma: `0.6·(C*ab/60) + 0.25·rgbSpread +
0.15·saturation`, banded High/Medium/Low at dataset terciles (`config.ts`).

## Rendering / SSG

`build` runs: `tsc` → client build → SSR build (`entry-server`) → `prerender.mjs`,
which renders `/`, `/compare`, `/palette`, and every `/colors/<slug>` to static
HTML (authoritative `<head>` injected by `buildHead`), plus `sitemap.xml`,
`robots.txt`, `colors.json`, and a `404.html` SPA fallback. It also rasterizes a
1200×630 Open Graph PNG per color (+ a brand default) into `/og/` with `resvg`
(SVG from `utils/ogTemplate.ts`, Roboto WOFF embedded), referenced via
`og:image`/`twitter:image` in `buildHead`. The PWA precaches the shell only and
runtime-caches color pages (OG PNGs are written after the client build, so they
never enter the precache manifest).

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

`verify` (lint → format:check → typecheck → test) → `build` (`build:assets`,
uploads the `dist` artifact) → `e2e` (Playwright/axe against the reused artifact)
→ `deploy` to GitHub Pages. Build runs once; `e2e` consumes its artifact rather
than rebuilding, and typecheck runs only in `verify`.

## Known follow-ups

- Soft 404s can't return a real HTTP 404 on static hosting; mitigated with a
  client-side `noindex` (`useNoindex`) on the not-found view.

## Roadmap

Product direction beyond the current architecture. North star: move users from
_"I like this color"_ → _"I'm confident using it"_ → _"I acted on it,"_ and make
every color and palette worth sharing. Discovery is solved; the roadmap adds
**confidence**, **planning**, and **reach**.

**Assumptions:** "marketers" = anyone promoting colors/collections (their currency
is reach + shareable assets + measurement); a lightweight backend is acceptable —
today everything is localStorage/SSG, which caps cross-device saves, projects,
analytics, and visualization.

**Principles:** confidence over catalog · plain language first, data on demand · a
color is a first-class shareable object · earn heavy features (curated/build-time
before live/AI) · accessible + fast as table stakes.

### Personas

| Persona               | Job-to-be-done                                               | Today                                                               | Biggest gap                                                                          |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Shopper** (DIY)     | Find a color that works in _my_ room and buy with confidence | Browse/filter, similar + coordinating, LRV/undertone, store locator | Can't see it in context; jargon-heavy; no buy/sample path; no synced saves           |
| **Designer** (pro)    | Assemble, validate, present, and deliver client palettes     | Compare (≤4), one Palette, JSON export, share URL                   | One palette only; no client-ready output; no harmony/contrast intelligence; no cloud |
| **Marketer/promoter** | Drive discovery and create shareable, measurable content     | SSG/SEO, JSON-LD, sitemap, share URLs, collections                  | No social/OG images; no editorial/trend surfaces; no embeds; no analytics            |

### Now — quick wins + foundations (0–1 quarter)

| Item                                                            | Persona      | Builds on                            | Effort |
| --------------------------------------------------------------- | ------------ | ------------------------------------ | ------ |
| Dynamic OG/social images per color & palette                    | Marketer     | SSG pages, share URLs                | M      |
| Plain-language color summary on detail pages                    | Shopper      | `colorCopy` / undertone / LRV engine | S      |
| "Get this color": paint calculator + sample/store/buy CTA       | Shopper      | `storeStripLocator`                  | M      |
| Projects: multiple named palettes + per-color notes & room tags | Designer     | Palette + `?c=` share-decode         | M      |
| Rich palette export: PNG board + PDF spec sheet                 | Designer/Mkt | Palette + swatch rendering           | M      |
| Contrast & pairing matrix in Compare/Palette                    | Designer     | `contrast.test` math                 | S–M    |
| Privacy-respecting analytics + share tracking (UTM)             | Marketer     | —                                    | S–M    |
| Serve color data as fetched JSON; code-split the bundle         | All (perf)   | known follow-up                      | M      |

### Next — core differentiators (1–3 quarters)

| Item                                                                     | Persona           | Effort |
| ------------------------------------------------------------------------ | ----------------- | ------ |
| Room Visualizer v1 (curated scenes, recolor walls, lighting presets)     | Shopper           | L      |
| Accounts & cloud sync (unlocks saves / projects / dashboards)            | All               | L      |
| Palette intelligence: auto-coordinate, 60-30-10 roles, scheme-from-color | Designer/Shopper  | M–L    |
| Editorial / trend collection landing pages + light curation              | Marketer          | M–L    |
| Client presentation boards (branded, read-only, comments/approval)       | Designer          | M      |
| Embeddable swatch/palette widget                                         | Marketer/partners | M      |

### Later — ambitious bets (3+ quarters)

| Item                                                                      | Persona            | Effort |
| ------------------------------------------------------------------------- | ------------------ | ------ |
| Upload-your-room photo recolor + lighting simulation (AR)                 | Shopper            | L      |
| AI color assistant (natural-language over the color data + scheme engine) | Shopper/Designer   | L      |
| Cross-brand color matching (data-licensing dependent)                     | Designer           | L      |
| Public API / partner data program                                         | Marketer/ecosystem | L      |
| Teams + e-commerce checkout (sample/paint ordering, firm seats)           | Designer/Shopper   | L      |

**Sequencing:** ship compounding + cheap first (OG images, plain-language copy,
analytics, export) to measure before the big bets; do foundations (accounts,
data-API/perf) before piling features on localStorage; curated Visualizer v1
earns the AR/upload v2.

### Success metrics

- **Shopper:** detail → "Get this color" CTR; visualizer engagement; saves that lead to a sample/buy.
- **Designer:** projects created; exports & shared boards opened; multi-color palette rate; 4-week retention.
- **Marketer:** organic traffic; share rate; OG-card impressions; widget embeds; trend-page traffic.
- **Health (always-on):** Core Web Vitals; axe = 0 serious/critical; e2e green.

## Delivery backlog

The roadmap broken into **features → stories → tasks**, sequenced by value vs.
work. Grooming method: **WSJF-lite** — rank ≈ (business value + enablement) ÷
effort. The **Now** horizon is groomed to task level; **Next/Later** stay as
epics until they reach the top. In practice these become tracker issues; this
section is the source of truth for shape and priority.

### Now — ranked by value ÷ effort

| Rank | Feature                          | Persona      | Value | Effort | Why this order                                    |
| ---- | -------------------------------- | ------------ | ----- | ------ | ------------------------------------------------- |
| 1 ✅ | F1 Plain-language summaries      | Shopper      | High  | S      | Cheap; reuses color engine; lifts UX + SEO/AI     |
| 2 ✅ | F2 Contrast & pairing matrix     | Designer     | High  | S–M    | Reuses contrast math; pro decision tool           |
| 3    | F3 Analytics & share tracking    | Marketer     | High  | S–M    | Enabler — measures every other bet                |
| 4 ✅ | F4 Dynamic OG/social images      | Marketer     | High  | M      | Compounding reach on existing SSG                 |
| 5 ✅ | F5 "Get this color" panel        | Shopper      | High  | M      | The missing _act_ step for the largest persona    |
| 6 ✅ | F6 Color data API / code-split   | All          | Med   | M      | Perf foundation; data source later features reuse |
| 7 ✅ | F7 Projects (palettes + notes)   | Designer     | Med   | M      | Pro depth; stepping stone to accounts             |
| 8 ✅ | F8 Rich palette export (PNG/PDF) | Designer/Mkt | Med   | M      | Client deliverable; builds on F7                  |

### Features → stories → tasks (Now)

**F1 · Plain-language color summary** ✅ _shipped_ _(Shopper · S · rank 1)_
Benefit: removes the LRV/undertone jargon barrier for the largest audience; richer page copy compounds SEO/AI.
Delivered: `summarize()` in `colorCopy.ts` (warmth + lightness + chroma + use suggestion); rendered as the lead paragraph in `ColorDetail` with HSL/LAB + raw specs moved under a "Technical details" `<details>` disclosure; threaded into `colorDescription` (meta + JSON-LD); covered by `colorCopy`/`seo`/`atlas` tests and the e2e SSG check.

- **US1.1** As a shopper, I want a plain-English summary on each color page so I grasp its character without knowing the jargon.
  - AC: names warmth + lightness + a use suggestion in plain words; on every prerendered page; no layout shift.
  - Tasks: add `summarize(color)` to `colorCopy.ts` (undertone + LRV band + neutrality → sentence); render in `ColorDetail` above the technical breakdown, move HSL/LAB under a "Technical details" disclosure; unit-test warm/cool/neutral × dark/medium/light; assert presence in the e2e SSG check.
- **US1.2** As an AI crawler / sharer, I want the summary in the meta description + JSON-LD so indexed and shared results read naturally.
  - AC: `colorDescription` and JSON-LD `description` use the summary.
  - Tasks: thread `summarize` through `utils/seo.ts`; update `seo` unit test.

**F2 · Contrast & pairing matrix** ✅ _shipped_ _(Designer · S–M · rank 2)_
Benefit: turns Compare/Palette from display into a decision tool (legibility + harmony).
Delivered: `contrastRatio()` + `hueRelation()` in `colorMath.ts`; `ContrastMatrix` (semantic `<table>`, marks + labels carry meaning, not color alone) on ComparePage; per-row hue relationship on PalettePage; covered by `colorMath`/`atlas` tests and axe-clean in e2e.

- **US2.1** As a designer, I want a pairwise WCAG-contrast matrix for selected colors so I know which pairings are legible.
  - AC: N×N ratios with AA/AAA pass-fail badges; updates live; accessible table.
  - Tasks: extract `contrastRatio(a,b)` into `colorMath.ts` (from `contrast.test` logic) + unit test; build `ContrastMatrix` (semantic `<table>`); render in ComparePage; axe-clean.
- **US2.2** As a designer, I want hue-relationship hints in my palette (analogous/complementary) so I can sanity-check a scheme.
  - AC: relationship label per pair (or summary) from hue distance.
  - Tasks: add `hueRelation(a,b)` to `colorMath.ts` + test; surface in PalettePage.

**F3 · Analytics & share tracking** _(Marketer · S–M · rank 3, enabler)_
Benefit: you can't improve what you can't measure; unblocks every roadmap metric. Privacy-respecting (no PII/cookies, honors DNT).

- **US3.1** As a marketer, I want privacy-respecting page + event analytics so I can see what performs.
  - AC: pageviews + key events (filter applied, compare/palette add, export, CTA click); no cookies/PII; respects DNT.
  - Tasks: pick approach (Plausible/Umami or first-party beacon to a serverless endpoint); add SSR-guarded `track(event, props)`; instrument events; document the event taxonomy.
- **US3.2** As a marketer, I want share links to carry UTM params so I can attribute traffic from shared colors/palettes.
  - AC: share actions append source/medium/campaign; analytics reads them.
  - Tasks: extend the share-URL builder; wire into copy-share actions; test.

**F4 · Dynamic OG / social images** ✅ _shipped_ _(Marketer · M · rank 4)_
Benefit: every color/palette becomes a branded shareable card → compounding social + SEO reach.
Delivered: pure SVG builders in `utils/ogTemplate.ts` (unit-tested), rasterized to 1200×630 PNGs by `prerender.mjs` via `@resvg/resvg-js` + embedded Roboto WOFF (`roboto-fontface`) → `dist/og/<slug>.png` + `dist/og/default.png`; `og:image`/`twitter:image` emitted in `buildHead` for color pages (specific) and gallery/compare/palette (brand default — covers palette shares); e2e asserts the file + meta. Per-palette dynamic OG would need serverless (out of static scope) — default-card fallback used.

- **US4.1** As a sharer, I want each color page to have a branded OG image (swatch + name + SW number + hex) so links look professional.
  - AC: per-color 1200×630 image generated at build; `og:image`/`twitter:image` set.
  - Tasks: add OG generation to `prerender.mjs` (satori/resvg or canvas) → `dist/og/<slug>.png`; emit og/twitter meta in `buildHead`; e2e asserts a sample file + meta.
- **US4.2** As a sharer, I want palette shares to render a swatch card so shared palettes entice clicks.
  - AC: palette `?c=` share resolves an OG image; brand-default fallback.
  - Tasks: generate palette OG (static common-case or serverless); fallback wiring.

**F5 · "Get this color" conversion panel** ✅ _shipped_ _(Shopper · M · rank 5)_
Benefit: the missing _act_ step; ties browsing to a real outcome and right-quantity confidence.
Delivered: `GetColorPanel` on the detail page (order-a-sample / find-a-store / view-at-SW links via centralized best-effort `swLinks.ts`, surfaces the in-store rack locator) + a `PaintCalculator` (pure `paint.ts` `paintEstimate`, accessible fieldset, live result) in a disclosure; covered by `paint`/`swLinks`/`atlas` tests and axe-clean in e2e. Outbound-click tracking deferred with the rest of F3 (hook point noted in code).

- **US5.1** As a shopper, I want a "Get this color" panel (order sample / find store / buy) so I can act.
  - AC: panel on detail page; surfaces `storeStripLocator`; outbound clicks tracked (F3).
  - Tasks: build `GetColorPanel`; wire store locator + SW deep links; instrument clicks.
- **US5.2** As a shopper, I want a paint calculator so I buy the right amount.
  - AC: inputs (area or L×W×H, openings, coats) → gallons + cans; sensible defaults.
  - Tasks: pure `paintEstimate()` util + unit tests; `PaintCalculator` component; accessible form.

**F6 · Color data API / code-split** ✅ _shipped_ _(All · M · rank 6, foundation)_
Benefit: removes the ~1.6 MB bundle from first load (CWV for everyone).
Delivered: Vite `manualChunks` splits `data/palette` into its own client chunk — main entry **1.6 MB → 336 KiB**, the ~1.25 MB dataset now loads in parallel (modulepreload) and caches separately across deploys. Per the "use stored data, no external call" directive it stays a bundled chunk (no `fetch`/`colors.json`/dynamic data call), which also keeps SSG hydration synchronous. Guarded by `scripts/check-bundle.mjs` (run in `build:client`).

- **US6.1** As any user, I want fast first load so the gallery is interactive quickly.
  - AC: `palette.ts` out of the main client bundle; client reads `colors.json` (already emitted) or a split chunk; SSG pages unchanged; LCP/TBT improve.
  - Tasks: switch client `appModel` to fetch/lazy-load data; keep the build/SSG path importing data at build; add loading skeleton; verify hydration still matches; add a bundle-size budget check.

**F7 · Projects: named palettes + notes/tags** ✅ _shipped_ _(Designer · M · rank 7)_
Benefit: real multi-project workflow; stepping stone to accounts.
Delivered: `PaletteContext` now holds `{ projects, activeId }` (entries carry optional `note`/`room`), with legacy `string[]` migration and the prior `palette`/`togglePalette`/`inPalette` API preserved over the active project (no consumer churn). PalettePage gains a project switcher (select / rename / new / delete, never below one), per-row note + room inputs, reorder that reconciles by id (notes survive), and annotated JSON export (`serializeColors` carries `project` + per-color `note`/`room`). Covered by `PaletteContext`/`ExportService`/`atlas` tests.

- **US7.1** As a designer, I want multiple named palettes so I can keep one per project/room.
  - AC: create/rename/delete/switch; persisted; per-palette colors + share URL.
  - Tasks: refactor `PaletteContext` to a keyed collection; migrate the existing single palette; add a palette switcher to PalettePage; tests.
- **US7.2** As a designer, I want per-color notes + a room tag so I can capture intent.
  - AC: editable note + room tag per entry; persisted; included in export.
  - Tasks: extend the palette-entry model + UI + persistence; tests.

**F8 · Rich palette export** ✅ _shipped_ _(Designer/Marketer · M · rank 8, depends on F7)_
Benefit: client-ready deliverable.
Delivered: `utils/paletteExport.ts` — pure `buildSpecRows`/`hexToRgb`/`boardGrid` (unit-tested), a `pdf-lib` spec sheet (`buildPalettePdf`, swatch + name/SW#/hex/LRV/undertone/family + notes/room, paginated; tested down to the `%PDF` bytes), and a canvas PNG swatch board (`renderBoardToCanvas`). `ExportService` gains `exportSpecPdf`/`exportBoardPng`, both **dynamic-importing** the module so pdf-lib lands in its own lazy chunk (main entry stayed 341 KiB). PalettePage exposes Export PDF / PNG / JSON, all carrying the active project's name + per-color annotations.

- **US8.1** As a designer, I want a PNG board export so I can drop a palette into a presentation.
  - AC: branded PNG of swatches + names/numbers; one click.
  - Tasks: render palette to canvas/SVG→PNG; download via the `ExportService` pattern; unit-test the pure serialize step.
- **US8.2** As a designer, I want a PDF spec sheet so I can hand specs to a client/contractor.
  - AC: multi-color PDF (hex, LRV, coordinating, notes/room tags).
  - Tasks: PDF generation (e.g. pdf-lib); template; pure data-assembly tested separately from rendering.

### Next — epics (refine on approach)

- **E9 · Room Visualizer v1** _(Shopper · L)_ — curated scene recolor. Stories: scene picker · wall masking/recolor · lighting presets · save look · share. Depends: F6, asset backend.
- **E10 · Accounts & cloud sync** _(All · L)_ — auth · sync favorites/hidden/palettes/projects · localStorage migration. Unblocks shopper saves, designer projects, marketer dashboards.
- **E11 · Palette intelligence** _(Designer/Shopper · M–L)_ — auto-coordinate · 60-30-10 role assignment · scheme-from-a-color. Builds on `colorMath`.
- **E12 · Editorial / trend collection pages** _(Marketer · M–L)_ — collection landing pages · light curation · SEO. Builds on collections data.
- **E13 · Client presentation boards** _(Designer · M)_ — branded read-only board · comments/approval. Depends: E10.
- **E14 · Embeddable widget** _(Marketer/partners · M)_ — iframe/script embed of a swatch or palette.

### Later — epics (one-liners)

AR photo recolor + lighting · AI color assistant · cross-brand matching · public
API / partner data · teams + e-commerce checkout.

### Definition of Ready / Done

- **Ready:** persona + benefit + acceptance criteria + estimate + known dependencies.
- **Done:** AC met; unit/integration tests added; `tsc`/ESLint/Prettier clean;
  `vitest` green; axe 0 serious/critical; e2e passing; SPEC/docs updated; no Core
  Web Vitals regression.
