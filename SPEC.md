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

| Persona               | Job-to-be-done                                               | Today                                                                                                                 | Biggest gap                                                                      |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Shopper** (DIY)     | Find a color that works in _my_ room and buy with confidence | Browse/filter, similar + coordinating, plain-language summary, "Get this color" (sample/store/buy + paint calculator) | Can't see it in context; no synced saves; no AI guidance                         |
| **Designer** (pro)    | Assemble, validate, present, and deliver client palettes     | Compare + contrast matrix, named palette projects with notes/room, PNG/PDF/JSON export, hue relationships, share URL  | No cloud sync / collaboration; no harmony auto-suggestions; no cross-brand match |
| **Marketer/promoter** | Drive discovery and create shareable, measurable content     | SSG/SEO, JSON-LD, per-color OG/social images, sitemap, share URLs, collections                                        | No analytics/attribution; no editorial/trend surfaces; no embeds                 |

### Now — remaining (0–1 quarter)

The rest of the Now horizon (plain-language summaries, contrast matrix, OG/social
images, "Get this color" + paint calculator, data code-split, palette projects +
notes, PNG/PDF export) has **shipped** — see the architecture sections above. One
item remains, intentionally on hold:

| Item                                                | Persona  | Builds on | Effort |
| --------------------------------------------------- | -------- | --------- | ------ |
| Privacy-respecting analytics + share tracking (UTM) | Marketer | —         | S–M    |

_On hold pending a product decision on analytics (privacy stance / approach)._

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

**Sequencing:** the compounding + cheap wins have shipped; **analytics (F3)** is
the remaining Now item and the measurement enabler for the bets below. Next, do
the **accounts** foundation before piling more state on localStorage; curated
Visualizer v1 earns the AR/upload v2.

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

### Now — remaining

F1, F2, F4–F8 have shipped (see the architecture sections above); only the
analytics enabler remains, and it's on hold pending a product decision.

**F3 · Analytics & share tracking** _(Marketer · S–M, enabler — on hold)_
Benefit: you can't improve what you can't measure; unblocks every roadmap metric. Privacy-respecting (no PII/cookies, honors DNT).

- **US3.1** As a marketer, I want privacy-respecting page + event analytics so I can see what performs.
  - AC: pageviews + key events (filter applied, compare/palette add, export, CTA click); no cookies/PII; respects DNT.
  - Tasks: pick approach (Plausible/Umami or first-party beacon to a serverless endpoint); add SSR-guarded `track(event, props)`; instrument events; document the event taxonomy.
- **US3.2** As a marketer, I want share links to carry UTM params so I can attribute traffic from shared colors/palettes.
  - AC: share actions append source/medium/campaign; analytics reads them.
  - Tasks: extend the share-URL builder; wire into copy-share actions; test.

### Next — epics (refine on approach)

- **E9 · Room Visualizer v1** _(Shopper · L)_ — curated scene recolor. Stories: scene picker · wall masking/recolor · lighting presets · save look · share. Depends: asset backend.
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
