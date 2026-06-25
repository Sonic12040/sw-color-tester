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
   collect / reorder / per-color notes + room tags / 60-30-10 roles /
   export (PNG board · PDF spec sheet) / per-row hue relationships / shareable
   `?c=` URL. A project can optionally become a **structured Project** (Rooms →
   Surfaces, each assigned a color + finish + coats + measured area) viewed
   through two lenses: the Designer **Board** (the palette view) and the Painter
   **Work Order** — a rooms × surfaces spec with per-room/per-color paint
   quantities, a consolidated shopping list, per-surface progress check-off, and
   a printable PDF.

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
│   ├── Workspace/        # CompareTray, ContrastMatrix, WorkOrderView (Painter lens)
│   ├── Toast/, ErrorBoundary/, seo/JsonLd
├── domain/               # types.ts (shared facet/sort vocabulary), project.ts (Rooms → Surfaces model)
├── utils/                # base.ts, config.ts, storage.ts, slug.ts, seo.ts, breakpoints.ts, clipboard.ts, colorMath.ts,
│                         #   colorCopy.ts, paint.ts, workOrder.ts, swLinks.ts, ogTemplate.ts, ExportService.ts, paletteExport.ts (lazy)
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

`PaletteContext` holds the named projects; each is a color list **plus an optional
structured Project** (`domain/project.ts`: `rooms[] → surfaces[]`, with
parse/migrate so the legacy flat-list format still loads). Rooms/surfaces and
per-surface progress persist through the same `usePersistentState` / `storage` seam
as everything else; this seam (with its versioned serialize/parse) is also what
makes Project **file export/import** portability (E18) cheap — the product stays
local-first with no server. Paint quantities, the shopping list, and progress are
pure functions over the project (`utils/paint.ts`, `utils/workOrder.ts`).

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
is reach + shareable assets). **Deliberate constraint — no backend, no accounts:**
the product stays **fully static (SSG) + local-first (localStorage)**. We do _not_
add auth, a database, or server sync. Portability and the Designer→Painter→Client
handoff are served by **shareable URLs + local project file export/import**, not
cloud accounts — a product decision, not a gap to close. This rules out features
that structurally require a server (cross-device auto-sync, server-side analytics,
live multi-user comments/approval, a dynamic API, e-commerce checkout); the roadmap
below reflects that.

**Principles:** confidence over catalog · plain language first, data on demand · a
color is a first-class shareable object · **local-first & portable (share links +
file export, never a server)** · earn heavy features (curated/build-time before
live/AI) · accessible + fast as table stakes.

### Personas

The paint lifecycle runs discover → specify → **execute** → promote, plus a
non-human data consumer. Each persona is a distinct job, not a distinct app: they
share the catalog and (increasingly) one **Project** object viewed through
different lenses.

| Persona                                  | Job-to-be-done                                                                                                       | Today                                                                                                                                                                                                                                         | Biggest gap                                                                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shopper** (DIY)                        | Find a color that works in _my_ room and buy with confidence                                                         | Browse/filter, similar + coordinating, plain-language summary, "Get this color" (sample/store/buy + paint calculator)                                                                                                                         | Can't see it in context (no visualizer)                                                                                                               |
| **Designer** (pro)                       | Assemble, validate, present, and deliver client palettes                                                             | Compare + contrast matrix, named palette projects (notes/room, 60-30-10 roles, scheme/companion suggestions), PNG/PDF export, share URL                                                                                                       | No project file portability for handoff (export/import); no branded client-facing presentation board; no cross-brand match                            |
| **Painter** (contractor / trades)        | Turn a chosen palette into the right materials applied to the right surfaces — accurately and efficiently on the job | Structured Project (rooms → surfaces → color + finish + coats + area), Work Order lens with per-room/per-color quantities, consolidated shopping list, per-surface progress, printable PDF; per-color SW number + rack locator + find-a-store | No product-line/sheen dataset (quantities use a default coverage); no on-site **field mode**; handoff is by shared link / PDF / file, not a live sync |
| **Marketer/promoter**                    | Drive discovery and create shareable content                                                                         | SSG/SEO, JSON-LD, per-color OG/social images, sitemap, share URLs, collections                                                                                                                                                                | No editorial/trend surfaces; no embeddable widget (first-party analytics is out of scope under the no-backend stance)                                 |
| **Integrator / AI agent** (programmatic) | Consume accurate, structured color data to power external tools, answers, or partner experiences                     | Machine-readable `colors.json` index, JSON-LD, canonical per-color pages, sitemap                                                                                                                                                             | No versioned/documented static data contract or bulk-download page (a dynamic query API is out of scope — static artifacts only)                      |

**Painter — the _execution_ end of the funnel.** Once the underserved end of the
product — it helped people **choose** and **present** color but nearly stopped where
the job begins. That gap is now largely closed: the "Palette" page is a first-class
**Project**, and a Painter's _Work Order/Spec_ and a Designer's _Board_ are two
lenses over the same structured data (rooms → surfaces → color + finish + coats +
measured area → quantities → shopping list → progress). The Painter's currency is
accuracy + efficiency at execution — _which color, which finish, how many coats, how
many gallons, where to buy it, what's done_ — and the Work Order now answers each.
What remains is **accuracy** (a build-time product-line/sheen/coverage dataset, vs.
today's default coverage) and **on-site** delivery (E17 field mode). The
Designer → Painter → Client handoff is served **without a backend** — a shared
project link, an exported work-order PDF, and local project file export/import
(E18) — consistent with the no-accounts stance.

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
notes, PNG/PDF export) has **shipped** — see the architecture sections above. The
one remaining item, **privacy-respecting analytics + share tracking (F3)**, is
**dropped**: any analytics needs a server-side sink to receive events, which the
no-backend stance rules out. Marketers lean on platform/referrer signals and OG/
share reach instead. The Now horizon is therefore **complete**.

### Next — core differentiators (1–3 quarters)

Listed in **delivery order** (see the groomed feature/story backlog below for the
WSJF-lite scoring and dependencies). **E11 (palette intelligence), E15 (Project
model), and E16 (Work Order + shopping list) have shipped** — see the architecture
sections. **E10 (Accounts & cloud sync) is removed** — see the **no backend, no
accounts** stance in Assumptions. Every remaining epic is **fully static +
local-first**. The order leads with **E18 project portability** (the local-first
substitute for the handoff that accounts would have provided), then **E12 editorial
reach**, then **E17 field mode** to round out the Painter on-site.

| #   | Item                                                                   | Epic | Persona           | Effort |
| --- | ---------------------------------------------------------------------- | ---- | ----------------- | ------ |
| 1   | Project portability & sharing (file export/import + shareable Project) | E18  | Designer/Painter  | S–M    |
| 2   | Editorial / trend collection landing pages + light curation            | E12  | Marketer          | M–L    |
| 3   | Field mode — on-site, high-contrast, offline work order                | E17  | Painter           | M      |
| 4   | Room Visualizer v1 (curated scenes, recolor walls, lighting presets)   | E9   | Shopper           | L      |
| 5   | Embeddable swatch/palette widget                                       | E14  | Marketer/partners | M      |
| 6   | Client presentation boards (branded, read-only share)                  | E13  | Designer          | M      |

### Later — ambitious bets (3+ quarters)

All Later bets must hold the **no-backend** line; ones that structurally needed a
server have been dropped (see below the table).

| Item                                                                     | Persona              | Effort |
| ------------------------------------------------------------------------ | -------------------- | ------ |
| Upload-your-room photo recolor + lighting simulation (client-side WebGL) | Shopper              | L      |
| Cross-brand color matching (build-time, data-licensing dependent)        | Designer             | L      |
| Static public data program (`colors.json` + documented contract/bulk)    | Integrator/ecosystem | M–L    |

**Dropped as backend-dependent (incompatible with no-accounts):** an **AI color
assistant** (needs an LLM proxy/server), a **dynamic public API** (query endpoints —
superseded by the static data program above), and **teams + e-commerce checkout**
(accounts, carts, order state). Revisit only if the no-backend stance is ever
revised.

**Sequencing:** with the **Painter line** (E15 → E16) shipped and **no backend on the
table**, Next leads with **E18 project portability** — file export/import + a
shareable Project is the local-first answer to "move my work between devices and hand
it off," the value accounts would otherwise carry, at S–M effort. **E12 editorial**
follows as an independent SSG/SEO reach win. **E17 field mode** rounds out the Painter
on-site (depends on the shipped E16; leans on the existing PWA, so it's a natural
no-backend fit). Then the heavy, fully client-side **E9** (shopper "see it in
context"), the **E14 widget** (a static embed; compounds with editorial), and a
re-scoped **E13** client board last — a **branded, read-only shared board** (built on
E18's share primitive); its former live comments/approval is dropped as it would
require a backend.
_Enabler:_ a build-time **product-line / sheen / coverage** dataset (like the color
data) would unlock accurate per-product quantities in the shipped Work Order — which
today uses a documented default coverage. (Build-time, no server — compatible.)

### Success metrics

**Measurement under no-backend:** we run **no first-party product analytics** (no
event sink). These signals are tracked **directionally** from sources that don't
need our own server — static-host/CDN request logs, search-console impressions,
outbound SW sample/store/buy clicks, and inbound referrers/UTM on share links — and
the rest stay qualitative.

- **Shopper:** "Get this color" reach; visualizer deep-link shares; outbound sample/buy clicks.
- **Designer:** projects exported/imported & shared-board links opened; multi-color palette rate.
- **Painter:** projects given room/surface structure; work orders / shopping lists printed; field-mode use.
- **Marketer:** organic traffic (search console); share/referrer counts; OG-card reach; widget embeds; trend-page traffic.
- **Integrator:** `colors.json` / static-data requests (host logs); partner integrations.
- **Health (always-on):** Core Web Vitals; axe = 0 serious/critical; e2e green.

## Delivery backlog

The roadmap broken into **features → stories → tasks**, sequenced by value vs.
work. Grooming method: **WSJF-lite** — rank ≈ (business value + enablement) ÷
effort. The **Now** horizon is groomed to task level; **Next** is now groomed to
**feature/story** level (below); **Later** stays as epics until it reaches the
top. In practice these become tracker issues; this section is the source of truth
for shape and priority.

### Now — remaining

F1, F2, F4–F8 have shipped (see the architecture sections above). The one open
item, **F3 · Analytics & share tracking**, is **dropped** under the **no backend,
no accounts** stance: privacy-respecting or not, analytics needs a server-side sink
to receive events, so it's out of scope. Share links may still append UTM params
(a zero-cost, client-side change) so that _recipients'_ own tools can attribute —
but we operate no analytics of our own. Measurement falls back to the directional,
serverless signals noted under **Success metrics**. The **Now horizon is complete.**

### Next — features & stories (groomed)

Reprioritized via WSJF-lite ((value + enablement) ÷ effort), then adjusted for hard
dependencies and the "**local-first, no backend** · validate locally first"
principles. Effort: S=1, M=2, M–L=2.5, L=3 (value/enable on 1–5). Epic **IDs are
stable**; the table is in **delivery order**. **E11, E15, and E16 have shipped**
(removed — see the architecture sections); **E10 (Accounts & cloud sync) is removed**
as backend-dependent. Every epic below is fully static + local-first.

| Rank | Epic                                 | Persona           | V   | Enable | Eff | WSJF | Why here                                                                                  |
| ---- | ------------------------------------ | ----------------- | --- | ------ | --- | ---- | ----------------------------------------------------------------------------------------- |
| 1    | **E18 · Project portability**        | Designer/Painter  | 4   | 3      | 1.5 | 4.7  | Local-first handoff/portability — the no-account substitute for sync; cheap, high-enable. |
| 2    | **E12 · Editorial / trend pages**    | Marketer          | 4   | 3      | 2.5 | 2.8  | Independent SSG/SEO/OG reach at low marginal cost.                                        |
| 3    | **E17 · Field mode**                 | Painter           | 4   | 1      | 2   | 2.5  | On-site work order (high-contrast/offline); depends on the shipped **E16**; PWA-only.     |
| 4    | **E9 · Room Visualizer v1**          | Shopper           | 5   | 3      | 3   | 2.7  | Biggest shopper gap ("see it in context"); fully client-side; earns the AR v2 bet.        |
| 5    | **E14 · Embeddable widget**          | Marketer/partners | 3   | 3      | 2   | 3.0  | Static embed distribution; compounds with editorial.                                      |
| 6    | **E13 · Client presentation boards** | Designer          | 3   | 2      | 2   | 2.5  | Branded read-only share (built on E18); live comments/approval dropped (no backend).      |

Sequencing rationale: with **no backend on the table**, lead with **E18** — file
export/import + a shareable Project is the local-first answer to portability and the
Designer→Painter→Client handoff (the value accounts would carry), and it's the
cheapest item on the board (S–M). **E12** is an independent SSG/SEO reach win.
**E17** rounds out the Painter on-site (needs the shipped E16; PWA-only, no server).
Then the heavy but fully client-side **E9**, the static **E14** widget, and a
re-scoped **E13** last (read-only board on E18's share primitive). Raw WSJF would
float **E14** above **E9**; we hold E9 higher as the biggest unserved shopper gap.
(Pull **E14** forward if a concrete partner appears.)

---

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

#### E18 · Project portability & sharing _(Designer/Painter · S–M)_ — local-first handoff

Benefit: the **local-first substitute for accounts** — move a Project between
devices and hand it Designer→Painter→Client **without a backend**. Today `?c=`
shares a flat color list; a full structured Project (rooms → surfaces, assignments,
and progress) is too large for a URL, so portability becomes **file export/import**
plus an optional compressed share link, all client-side. Reuses the existing
serializer/parse-migrate seam (`parsePaletteData`), so imported data flows through
the same validation as stored data.

**Feature: Project file export / import**

- **US18.1** As a user, I want to export a Project to a file and import it on another
  device (or from a teammate) so my work is portable without an account. _(S–M)_
  - AC: export the active Project (colors + notes/room/roles + rooms/surfaces +
    progress) to a versioned JSON file; import validates + migrates through
    `parsePaletteData` (rejects malformed input gracefully); import lands as a new
    Project (no silent overwrite); round-trips losslessly.
  - Tasks: versioned serialize/deserialize over the storage seam; export/import UI on
    the projects switcher; unit tests (round-trip + malformed/legacy input).

**Feature: Shareable Project link (best-effort, no server)**

- **US18.2** As a designer, I want a copyable link that carries a whole Project so I
  can hand off a structured job, not just a color list. _(S–M)_
  - AC: encode the Project into the URL (compressed) for reasonable sizes; above a
    size threshold, fall back to "export a file instead" with a clear message; the
    recipient opens read-to-import; no backend, no stored state.
  - Tasks: compress/encode + decode; size-guard + fallback copy; extend the existing
    share-URL flow; tests for the threshold + decode.

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
(Later). Depends: a curated scene/asset pipeline. Fully client-side — no backend;
"save a look" persists locally and shares via a deep link + rendered OG image.

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
  get input. _(M)_
  - AC: save (scene+color+lighting) to a palette/project in localStorage; share via a
    deep link (`?scene=&color=&lighting=`) + rendered OG image — no account needed.
  - Tasks (9.4–9.5): lighting transforms; save model; share/OG render; tests.

#### E13 · Client presentation boards _(Designer · M)_ — depends E18

Benefit: lets designers _deliver_, not just assemble — a branded, client-ready
artifact, closing the workflow loop. **Re-scoped for no-backend:** a polished
read-only board shared via E18's Project link (or an exported PDF); the original
live comments/approval workflow is **dropped** (it needs server-side multi-user
state). Async feedback stays out-of-band (the client replies by email/PDF markup).

**Feature: Branded read-only board**

- **US13.1** As a designer, I want to present a project as a branded, read-only board
  from a shareable link so I can show clients. _(M)_
  - AC: board renders colors + notes/room + roles (E11) read-only; light branding
    (title/logo); loads from an E18 Project link (or imported file) — no stored
    server state; client-side `noindex`; OG card from the share data.
  - Tasks: board view + branding; decode from the E18 share/import path; OG; tests.

#### E14 · Embeddable widget _(Marketer/partners · M)_

Benefit: extends reach beyond our domain — partners/bloggers embed live swatches
or palettes; compounds with editorial (E12). A static, read-only embed served from
our existing host — no backend.

**Feature: Embeddable swatch/palette**

- **US14.1** As a partner, I want to embed a swatch or palette via iframe/script so I
  can show live SW colors on my site. _(M)_
  - AC: read-only, themable embed rendered from share data / `colors.json` (no auth,
    no backend write); responsive; accessible; cache-friendly.
  - Tasks: standalone embed entry/route + minimal bundle; data load from share URL;
    a11y + size budget.

**Feature: Embed builder**

- **US14.2** As a marketer, I want a builder to configure an embed and copy the
  snippet so it's self-serve. _(S–M)_
  - AC: pick swatch/palette + theme/size → copyable iframe/script snippet with live
    preview; embed-back links carry UTM params (so partners' _own_ analytics can
    attribute) — we run no analytics of our own.
  - Tasks: builder UI; UTM-tagged embed/back URLs; a11y + size budget; tests.

### Later — epics (one-liners)

Client-side AR photo recolor + lighting · cross-brand matching (build-time) ·
static public data program (`colors.json` + contract). _Dropped as
backend-dependent: AI color assistant, dynamic public API, teams + e-commerce
checkout._

### Definition of Ready / Done

- **Ready:** persona + benefit + acceptance criteria + estimate + known dependencies.
- **Done:** AC met; unit/integration tests added; `tsc`/ESLint/Prettier clean;
  `vitest` green; axe 0 serious/critical; e2e passing; SPEC/docs updated; no Core
  Web Vitals regression.
