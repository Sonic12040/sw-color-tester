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

Vitest is split into **projects** (run by name; `npm test` runs unit + integration):

- **unit** (Node env, colocated `*.test.ts`): pure logic — `colorMath`, `colorCopy`,
  `colorQuery`, `ColorModel`, `paletteIntelligence`, `paletteExport`, `slug`, `seo`,
  `contrast`, dataset integrity (`palette.integrity`), and the index-shell check.
- **integration** (jsdom + RTL + `@testing-library/user-event`): component/hook/flow
  specs — each context, the hooks, `ColorCard`, `Toast`, and the routed-app suites in
  `src/test/integration/` (gallery, colorDetail, compare, palette, emptyStates,
  appShell) sharing `integration/harness.tsx`. `ExportService.test.ts` lives here too
  (it touches `document`/`URL`). `src/test/setup.ts` clears storage + auto-cleans.
- **build-output** (Node, `test:build-output`): asserts the prerendered `dist/` (SEO
  markup, JSON-LD, plain-language summary, OG images). Runs only after a build, so
  it's excluded from the default test run.

**E2E** — Playwright Test runner (`playwright.config.ts`, specs in `e2e/`): a
`webServer` starts `vite preview`; `responsive.spec.ts` runs across a 6-profile device
matrix (rail-vs-drawer decided from viewport width), and `a11y` / `routing` / `flows`
run on the Desktop project (axe scans of gallery + both workspaces, skip link,
no-trailing-slash redirect, and full user flows: palette build + PDF/PNG download,
share link, scheme-to-palette, clipboard copy, sort persistence, NotFound/noindex).

## CI/CD (`.github/workflows/deploy.yml`)

`verify` (lint → format:check → typecheck → test) → `build` (`build:assets`,
uploads the `dist` artifact) → `e2e` (`playwright test` + `test:build-output`
against the reused artifact) → `deploy` to GitHub Pages. Build runs once; `e2e`
consumes its artifact rather than rebuilding, and typecheck runs only in `verify`.

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

The paint lifecycle runs discover → specify → **execute** → promote, plus a
non-human data consumer. Each persona is a distinct job, not a distinct app: they
share the catalog and (increasingly) one **Project** object viewed through
different lenses.

| Persona                                  | Job-to-be-done                                                                                                       | Today                                                                                                                                   | Biggest gap                                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shopper** (DIY)                        | Find a color that works in _my_ room and buy with confidence                                                         | Browse/filter, similar + coordinating, plain-language summary, "Get this color" (sample/store/buy + paint calculator)                   | Can't see it in context; no synced saves; no AI guidance                                                                                                               |
| **Designer** (pro)                       | Assemble, validate, present, and deliver client palettes                                                             | Compare + contrast matrix, named palette projects (notes/room, 60-30-10 roles, scheme/companion suggestions), PNG/PDF export, share URL | No cloud sync / collaboration; no client approval/sign-off workflow; no cross-brand match                                                                              |
| **Painter** (contractor / trades)        | Turn a chosen palette into the right materials applied to the right surfaces — accurately and efficiently on the job | Per-color SW number + in-store rack locator, find-a-store links, a rough single-room paint calculator                                   | No job model (rooms → surfaces), no finish/sheen or product line, no per-room quantities or consolidated shopping list, no progress tracking or on-site **field mode** |
| **Marketer/promoter**                    | Drive discovery and create shareable, measurable content                                                             | SSG/SEO, JSON-LD, per-color OG/social images, sitemap, share URLs, collections                                                          | No analytics/attribution; no editorial/trend surfaces; no embeds                                                                                                       |
| **Integrator / AI agent** (programmatic) | Consume accurate, structured color data to power external tools, answers, or partner experiences                     | Machine-readable `colors.json` index, JSON-LD, canonical per-color pages, sitemap                                                       | No versioned/public API, bulk or query endpoints, usage terms, or change feed                                                                                          |

**Painter — the newly identified persona.** This is the _execution_ end of the
funnel the product currently underserves: it helps people **choose** and
**present** color but nearly stops where the job begins. The Painter's currency is
accuracy + efficiency at execution — _which color, which finish, how many coats,
how many gallons, where to buy it, what's done_. The single-room paint calculator
and the per-color rack locator are seeds of this, but there is no **job** object
(rooms → surfaces → color + finish + coats + measured area → quantities →
shopping list → progress). This reframes the "Palette" page: it is really an
immature **Project**, and a Painter's _Work Order/Spec_ and a Designer's _Board_
are two lenses over the same structured data. (Painter also raises the priority of
accounts/sync — the Designer → Painter → Client handoff is a stronger reason for a
backend than "save my favorites.")

**Adjacent / candidate personas (deliberately not yet first-class).** Persona
discipline matters more than coverage — over-fragmenting dilutes the roadmap.
Identified but parked:

- **Store associate / brand retail** — look up rack code, product availability,
  tint formula, hand a result to a walk-in. Genuinely distinct, but only relevant
  if Sherwin-Williams operationalizes this as an in-store/associate tool. Park
  until that's a goal.
- **Specifier / architect** — a more technical Designer (CSI specs, submittals,
  durability/finish requirements). Fold into Designer for now; split out only if
  construction-document workflows are pursued.
- **Stager / flipper / property manager** — a volume sub-segment of
  Designer/Shopper (many rooms, fast, resale-neutral palettes). Serve via the
  Project model, not a separate persona.
- **Inspiration seeker** — earlier-funnel homeowner browsing trends/mood before a
  decision. A sub-segment of Shopper, served by the Marketer's editorial surfaces.
- **Accessibility / low-vision users** — a cross-cutting _constraint_ (table
  stakes), not a persona.
- **Casual SEO visitor** — the Marketer's _audience_, not a persona of the tool.

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

Listed in **delivery order** (see the groomed feature/story backlog below for the
WSJF-lite scoring and dependencies). **E11 (palette intelligence) has shipped** —
see the architecture sections. The order now leads with the **Painter** line
(E15→E16→E17): the execution end of the funnel the product underserves, and the
move that takes the north star from "I'm confident" to "I acted on it."

| #   | Item                                                                           | Epic | Persona           | Effort |
| --- | ------------------------------------------------------------------------------ | ---- | ----------------- | ------ |
| 1   | Project model — palette becomes a structured Project (rooms → surfaces)        | E15  | Painter/Designer  | M–L    |
| 2   | Work Order / Spec lens + consolidated shopping list                            | E16  | Painter           | M–L    |
| 3   | Editorial / trend collection landing pages + light curation                    | E12  | Marketer          | M–L    |
| 4   | Accounts & cloud sync (Supabase + RLS; sync + Designer→Painter→Client handoff) | E10  | All               | L      |
| 5   | Field mode — on-site, high-contrast, offline work order                        | E17  | Painter           | M      |
| 6   | Room Visualizer v1 (curated scenes, recolor walls, lighting presets)           | E9   | Shopper           | L      |
| 7   | Client presentation boards (branded, read-only, comments/approval)             | E13  | Designer          | M      |
| 8   | Embeddable swatch/palette widget                                               | E14  | Marketer/partners | M      |

### Later — ambitious bets (3+ quarters)

| Item                                                                      | Persona              | Effort |
| ------------------------------------------------------------------------- | -------------------- | ------ |
| Upload-your-room photo recolor + lighting simulation (AR)                 | Shopper              | L      |
| AI color assistant (natural-language over the color data + scheme engine) | Shopper/Designer     | L      |
| Cross-brand color matching (data-licensing dependent)                     | Designer             | L      |
| Public API / partner data program                                         | Integrator/ecosystem | L      |
| Teams + e-commerce checkout (sample/paint ordering, firm seats)           | Designer/Shopper     | L      |

**Sequencing:** with E11 shipped, Next leads with the **Painter line** — the
underserved execution end. **E15 (Project model)** is a mostly-local refactor of
the palette that both unlocks the Painter _and_ upgrades the Designer board, so it
goes first; **E16 (Work Order + shopping list)** delivers the Painter on top of it
(a basic slice needs no backend — it reuses the paint calculator's coverage).
**E12 editorial** stays high as an independent SSG/SEO reach win. Then stand up the
**E10 accounts** foundation (now justified by the Designer→Painter→Client
handoff, not just saves) — earned _after_ validating the Project model locally,
per "earn heavy/live features." E15/E16 must persist through the existing
`usePersistentState` seam so E10's adapter syncs them for free. **E17 field mode**
follows E16; **E9** (shopper "see it in context") and the E10-gated **E13** follow;
**E14 widget** trails until editorial + analytics make embeds worth distributing.
_Enabler:_ a build-time **product-line / sheen / coverage** dataset (like the color
data) unlocks accurate per-product quantities in E16 — basic quantities ship
without it.

### Success metrics

- **Shopper:** detail → "Get this color" CTR; visualizer engagement; saves that lead to a sample/buy.
- **Designer:** projects created; exports & shared boards opened; multi-color palette rate; 4-week retention.
- **Painter:** projects given room/surface structure; work orders / shopping lists generated & printed; field-mode opens; jobs with progress tracked.
- **Marketer:** organic traffic; share rate; OG-card impressions; widget embeds; trend-page traffic.
- **Integrator:** `colors.json`/API fetches; partner integrations; (future) API keys issued.
- **Health (always-on):** Core Web Vitals; axe = 0 serious/critical; e2e green.

## Delivery backlog

The roadmap broken into **features → stories → tasks**, sequenced by value vs.
work. Grooming method: **WSJF-lite** — rank ≈ (business value + enablement) ÷
effort. The **Now** horizon is groomed to task level; **Next** is now groomed to
**feature/story** level (below); **Later** stays as epics until it reaches the
top. In practice these become tracker issues; this section is the source of truth
for shape and priority.

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

### Next — features & stories (groomed)

Reprioritized via WSJF-lite ((value + enablement) ÷ effort), then adjusted for
hard dependencies and the "earn heavy/live features · validate locally first"
principles. Effort: S=1, M=2, M–L=2.5, L=3 (value/enable on 1–5). Epic **IDs are
stable**; the table is in **delivery order**. **E11 has shipped** (removed).

| Rank | Epic                                 | Persona           | V   | Enable | Eff | WSJF | Why here                                                                                       |
| ---- | ------------------------------------ | ----------------- | --- | ------ | --- | ---- | ---------------------------------------------------------------------------------------------- |
| 1    | **E15 · Project model**              | Painter/Designer  | 5   | 4      | 2.5 | 3.6  | Unlocks the unserved Painter _and_ upgrades the Designer board; local refactor of the palette. |
| 2    | **E16 · Work Order + shopping list** | Painter           | 5   | 2      | 2.5 | 2.8  | Delivers the Painter ("I acted on it"); basic slice reuses the calculator, no backend.         |
| 3    | **E12 · Editorial / trend pages**    | Marketer          | 4   | 3      | 2.5 | 2.8  | Independent SSG/SEO/OG reach at low marginal cost.                                             |
| 4    | **E10 · Accounts & cloud sync**      | All               | 4   | 5      | 3   | 3.0  | Foundation: sync + Designer→Painter→Client handoff; earned after E15/E16 validate the model.   |
| 5    | **E17 · Field mode**                 | Painter           | 4   | 1      | 2   | 2.5  | On-site work order (high-contrast/offline); depends on **E16**.                                |
| 6    | **E9 · Room Visualizer v1**          | Shopper           | 5   | 3      | 3   | 2.7  | Biggest shopper gap ("see it in context"); earns the AR v2 bet.                                |
| 7    | **E13 · Client presentation boards** | Designer          | 3   | 2      | 2   | 2.5  | High designer delight, but **blocked on E10**.                                                 |
| 8    | **E14 · Embeddable widget**          | Marketer/partners | 3   | 3      | 2   | 3.0  | Distribution; worth most _after_ editorial + analytics exist.                                  |

Sequencing rationale: the Painter is the highest-value gap, so lead with **E15**
(a mostly-local palette→Project refactor that also upgrades the Designer board),
then **E16** (the Painter deliverable; a basic version ships with no backend).
**E12** stays high as an independent reach win. Stand up **E10 accounts** _after_
the Project model is validated locally — keeping E15/E16 on the existing
`usePersistentState` seam so E10's sync adapter adopts them for free, which
reconciles "more local state" with "earn the backend." Then **E17** (needs E16),
the heavy **E9**, the E10-gated **E13**, and **E14** last. (Pull **E10** forward if
cross-device/handoff demand spikes; pull **E14** forward if a concrete partner
appears.)

---

#### E15 · Project model — rooms → surfaces _(Painter/Designer · M–L)_ — foundation

Benefit: today's flat "palette" is really an immature **Project**. Model a Project
as colors **plus optional Rooms → Surfaces**, each surface assigned a color +
finish + coats + measured area. One object, persona lenses (Designer **Board** =
today's palette view; Painter **Work Order** = E16). Structure is opt-in
(progressive disclosure) and stays local-first behind the existing
`usePersistentState` / `storage` seam, so E10 syncs it for free.

**Feature: Structured project data model**

- **US15.1** As a user, I want my palette to optionally gain Rooms and Surfaces so it
  can describe a real job, while a plain color list still works for quick saves. _(M)_
  - AC: backward-compatible migration of existing `PaletteData`; a project is a color
    list plus optional `rooms[]`, each room with `surfaces[]`
    (wall/ceiling/trim/door/cabinet/other); the flat list stays the default view.
  - Tasks: extend `PaletteContext` types + parse/migrate (mirror `parsePaletteData`);
    add-room / add-surface UI; integrity + migration tests.
- **US15.2** As a user, I want to assign a color + finish + coats + measured area to a
  surface so the project captures what actually gets painted. _(M)_
  - AC: per-surface assignment (color; finish/sheen from flat/eggshell/satin/
    semi-gloss/gloss; coats; area or L×W×H); reuses the paint-calculator area math.
  - Tasks: assignment UI; lift `PaintCalculator` area math into a shared util;
    persist; unit-test.

**Feature: Project lenses**

- **US15.3** As a user, I want to switch a project between Board and Work Order views
  without duplicating data. _(S–M)_
  - AC: the same project renders as Board (Designer) or Work Order (Painter); view
    preference persists; flat/empty projects degrade gracefully.
  - Tasks: lens toggle + routing/state; reuse the existing palette board rendering.

#### E16 · Work Order / Spec + shopping list _(Painter · M–L)_ — depends E15

Benefit: turn a structured Project into **materials + quantities + where to buy +
progress** — the Painter deliverable that completes "I acted on it." A basic slice
needs no new data (reuse the calculator's ~350 sq ft/gal); per-product accuracy is
gated on the build-time **product/sheen/coverage** enabler.

**Feature: Work Order / Spec sheet**

- **US16.1** As a painter, I want a rooms × surfaces table (color, SW number, finish,
  coats, area) so I can execute the job, printable as a PDF. _(M)_
  - AC: per-room sections; surface rows with color chip + SW number + finish + coats +
    area; PDF via the existing `paletteExport` pipeline; field-readable layout.
  - Tasks: Work Order view + PDF template (extend `paletteExport`); tests.
- **US16.2** As a painter, I want per-room and per-color quantity estimates so I buy
  the right amount. _(M)_
  - AC: gallons/cans = area × coats ÷ coverage (default coverage now, per-product when
    the enabler lands); totals per color aggregated across rooms.
  - Tasks: extend the pure `paint` estimate to aggregate over assignments; unit-test.

**Feature: Consolidated shopping list**

- **US16.3** As a painter, I want one shopping list (each color × finish: SW number,
  rack location, total quantity) so I can buy everything in one trip. _(M)_
  - AC: one row per color×finish with total cans + `storeStripLocator`; printable +
    copyable; aggregated across all rooms.
  - Tasks: aggregate from assignments; render + export; tests.

**Feature: Progress tracking**

- **US16.4** As a painter, I want to check off surfaces/rooms as done so I can track
  job progress. _(S–M)_
  - AC: per-surface done state; per-room + overall progress; persists (and syncs once
    E10 lands).
  - Tasks: state + UI; persist via the storage seam; tests.

_Enabler:_ a build-time **product-line / sheen / coverage** dataset (sourced like
the color data) unlocks product selection + accurate per-product quantities; until
then, quantities use a documented default coverage.

#### E12 · Editorial / trend collection pages _(Marketer · M–L)_

Benefit: durable, indexable destinations that pull organic traffic and give
marketers a surface to promote curated/seasonal stories. Extends our existing
SSG / JSON-LD / OG pipeline (the cheapest reach lever we have).

**Feature: Prerendered collection landing pages**

- **US12.1** As a marketer, I want a prerendered landing page per curated collection
  (hero, blurb, the colors, JSON-LD, OG card) so it ranks and shares well. _(M)_
  - AC: `/collections/<slug>` SSG'd like color pages; authoritative `<head>`
    (title/description/canonical/OG); `ItemList` JSON-LD; in sitemap.
  - Tasks: add route + `buildHead` branch; extend `getPrerenderPaths`/sitemap;
    per-collection OG via `ogTemplate`; integration + SEO/static e2e assertions.

**Feature: Lightweight curation (build-time content model)**

- **US12.2** As a marketer/editor, I want a simple build-time content model (title,
  blurb, hero, ordered featured colors, publish flag) so I can author without code
  changes to components. _(M)_
  - AC: collections content authored in one data file (or MD/JSON) validated at
    build; unpublished entries excluded; ordering respected.
  - Tasks: define schema + loader in `data/`; integrity test (slugs resolve, no
    dupes); render from the model; document the authoring flow.

**Feature: Discovery & cross-linking**

- **US12.3** As a visitor, I want a trend/collections index plus cross-links from
  color pages so I can discover curated stories. _(S–M)_
  - AC: `/collections` index; each color page links the collections it's in; nav
    entry; all in sitemap.
  - Tasks: index page; reverse map color→collections; nav + internal links; tests.

#### E10 · Accounts & cloud sync _(All · L)_ — **foundation / enabler**

Benefit: removes the localStorage ceiling — cross-device saves, durable projects,
the **Designer→Painter→Client handoff**, the data spine for boards (E13), and
marketer dashboards. Privacy-first (honor the F3 stance; explicit export/delete).

**Tech (architect decision — ADR).** **Supabase**: managed **Auth** (passwordless
magic-link/OTP + OAuth, PKCE) + **Postgres with Row-Level Security** as the
authorization boundary; the browser talks to the DB directly via
`@supabase/supabase-js`. The front-end **stays static on GitHub Pages** (Supabase
is an external HTTPS service — no host change; SSG/PWA/prerender pipeline
untouched). Only two bespoke server pieces: **Edge Functions** for data **export**
and **hard delete** (`service_role`). Security: the `anon` key ships publicly and
is safe _only because RLS is default-deny_ — so RLS policy tests + a CI guard that
`service_role` never lands in `dist/` are mandatory; **XSS is the top risk** (strict
CSP, hash the pre-paint inline script, cap user free-text), access token kept in
memory (refresh token only — a pure static SPA can't use HttpOnly cookies without a
backend proxy; documented tradeoff). Sharing maps to a
`project_members(project_id, user_id, role)` table + RLS policies. Alternatives
weighed and rejected: Firebase (NoSQL fights the relational sharing model; weaker
export), Clerk+DB / Cloudflare D1+Workers (push the riskiest part — authorization —
into code we'd own). _Revisit only if_ a security review forbids in-memory tokens
(→ cookie-session proxy + a host change) or enterprise SSO becomes a headline need.

**Feature: Authentication**

- **US10.1** As any user, I want to sign in (passwordless email or OAuth) so my work
  follows me across devices. _(M)_
  - AC: sign-up/in/out; SSR-safe (no auth flicker on prerendered shell); works
    offline read-only; no PII beyond email.
  - Tasks: wire Supabase Auth (PKCE), access token in memory; resolve auth
    post-hydration (reuse the two-phase init pattern); auth UI; e2e happy-path.

**Feature: Cloud persistence & sync**

- **US10.2** As a signed-in user, I want favorites/hidden synced so they match on
  every device. _(M)_
- **US10.3** As a signed-in user, I want my projects (colors, order, notes, room
  tags, and the E15 rooms/surfaces structure) synced so my work is safe and
  portable. _(M–L)_
  - AC (10.2–10.3): writes persist to Postgres (RLS-scoped to the owner) and
    rehydrate on load; offline edits queue (idempotent upsert by id) and reconcile;
    last-write-wins with a visible "synced/offline" state; existing context APIs
    unchanged for consumers.
  - Tasks: storage adapter behind the current `usePersistent*` seam; outbox/sync
    queue + reconciliation; default-deny RLS policies + policy tests; tests for
    offline→online merge.

**Feature: Sharing & handoff (Designer→Painter→Client)**

- **US10.6** As a designer, I want to share a project with a painter (edit) or a
  client (view/comment) so the spec and board travel with the job. _(M)_
  - AC: invite by email/link with a role (owner/editor/commenter/viewer); access
    enforced by RLS via `project_members`; revocable.
  - Tasks: membership table + RLS; invite/accept flow; role-aware UI gating; tests.

**Feature: Migration & account hygiene**

- **US10.4** As a returning user, I want my existing localStorage data adopted into
  my account on first sign-in so I lose nothing. _(M)_
  - AC: one-time, idempotent merge (no dupes); clear before/after; reversible export.
- **US10.5** As a user, I want to export and delete my account/data so I stay in
  control. _(S–M)_
  - AC: full JSON export; hard delete (cascade rows + `project_members` + auth user);
    requires recent re-auth; honors privacy stance.
  - Tasks (10.4–10.5): migration routine + guard flag; export + delete **Edge
    Functions** (`service_role`, transactional); settings screen; tests.

#### E17 · Field mode _(Painter · M)_ — depends E16

Benefit: the Work Order gets used on a job site — bright light, gloves, spotty
signal. Field mode is a high-contrast, large-target, **offline-first** rendering of
the Work Order + shopping list (leans on the existing PWA).

**Feature: On-site work order**

- **US17.1** As a painter on-site, I want a high-contrast, large-type field view of
  the work order / shopping list so I can read it in sunlight with gloves. _(M)_
  - AC: field-mode toggle; larger type + ≥44px (ideally larger) targets; works
    offline (work-order route + active project precached); progress check-offs work
    offline and reconcile later.
  - Tasks: field theme; ensure the route is precached; offline e2e.
- **US17.2** As a painter, I want quick color lookup by SW number from field mode so
  I can confirm a color at the counter. _(S)_
  - AC: jump-to-number search reachable in field mode.
  - Tasks: number-search entry; reuse existing search.

#### E9 · Room Visualizer v1 _(Shopper · L)_

Benefit: closes the #1 shopper gap — "see it in context." v1 is **curated +
build-time** (static scenes/masks, client-side recolor) to earn the upload/AR v2
(Later). Depends: a curated scene/asset pipeline; "save/share look" depends on E10.

**Feature: Curated scenes**

- **US9.1** As a shopper, I want to pick from curated room scenes so I can preview a
  color in a realistic space. _(M)_
  - AC: scene gallery (living room, bedroom, exterior, kitchen…); each ships a
    base image + wall mask as static assets; lazy-loaded; accessible picker.
  - Tasks: asset pipeline (image + mask + metadata) in `data/`/`public`; scene
    picker UI; integrity test for assets.

**Feature: Wall masking & recolor**

- **US9.2** As a shopper, I want the wall(s) recolored to a chosen color so I see it
  on real surfaces. _(L)_
  - AC: canvas recolor through the mask preserving shadows/texture (multiply/luminance
    blend); reasonable fidelity; no layout overflow; perf budget held on mobile.
  - Tasks: canvas compositing util; map SW color→blend; reduced-motion/perf checks.
- **US9.3** As a shopper, I want to switch the applied color from within the
  visualizer (search/recent/palette) so I can compare options fast. _(M)_
  - AC: in-context color switcher; updates instantly; deep-linkable `?scene=&color=`.
  - Tasks: switcher UI; URL state; reuse search.

**Feature: Lighting & save/share**

- **US9.4** As a shopper, I want lighting presets (warm / neutral / cool / daylight)
  so I see the color under different conditions. _(M)_
  - AC: presets apply a white-balance/exposure transform over the composite; labeled.
- **US9.5** As a shopper, I want to save a look and share it so I can decide later or
  get input. _(M, **depends E10** for cross-device; localStorage fallback otherwise)_
  - AC: save (scene+color+lighting) to a palette/project; share via link + rendered
    image (OG).
  - Tasks (9.4–9.5): lighting transforms; save model; share/OG render; tests.

#### E13 · Client presentation boards _(Designer · M)_ — **depends E10**

Benefit: lets designers _deliver_, not just assemble — a branded, client-ready
artifact with feedback, closing the workflow loop.

**Feature: Branded read-only board**

- **US13.1** As a designer, I want to publish a project as a branded, read-only board
  at a shareable link so I can present to clients. _(M)_
  - AC: board renders colors + notes/room + roles (E11) read-only; light branding
    (title/logo); access via unguessable token; SSR/OG card.
  - Tasks: board view + token route; render from synced project (E10); OG.

**Feature: Comments & approval**

- **US13.2** As a client, I want to comment per color and approve / request changes
  so the designer gets clear feedback. _(M)_
  - AC: threaded per-color comments; board-level status (approved / changes
    requested); designer notification.
  - Tasks: comments data model (E10 backend); status + notify; tests.

#### E14 · Embeddable widget _(Marketer/partners · M)_

Benefit: extends reach beyond our domain — partners/bloggers embed live swatches
or palettes; compounds with editorial (E12) and share analytics (F3).

**Feature: Embeddable swatch/palette**

- **US14.1** As a partner, I want to embed a swatch or palette via iframe/script so I
  can show live SW colors on my site. _(M)_
  - AC: read-only, themable embed rendered from share data / `colors.json` (no auth,
    no backend write); responsive; accessible; cache-friendly.
  - Tasks: standalone embed entry/route + minimal bundle; data load from share URL;
    a11y + size budget.

**Feature: Embed builder & attribution**

- **US14.2** As a marketer, I want a builder to configure an embed and copy the
  snippet so it's self-serve. _(S–M)_
  - AC: pick swatch/palette + theme/size → copyable iframe/script snippet with live
    preview.
- **US14.3** As a marketer, I want embeds to carry attribution so I can measure reach.
  _(S, **ties F3**)_
  - AC: embed link/loads include source/medium params read by analytics; documented.
  - Tasks (14.2–14.3): builder UI; UTM-tagged embed URLs; event hooks (F3).

### Later — epics (one-liners)

AR photo recolor + lighting · AI color assistant · cross-brand matching · public
API / partner data · teams + e-commerce checkout.

### Definition of Ready / Done

- **Ready:** persona + benefit + acceptance criteria + estimate + known dependencies.
- **Done:** AC met; unit/integration tests added; `tsc`/ESLint/Prettier clean;
  `vitest` green; axe 0 serious/critical; e2e passing; SPEC/docs updated; no Core
  Web Vitals regression.
