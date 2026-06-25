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
   a printable PDF. The Work Order also has an on-site **Field mode** (E17): a
   high-contrast, large-type, offline-first read view with big check-off targets
   and a jump-to-SW-number lookup.

## Source layout

```text
src/
├── main.tsx              # client entry: createBrowserRouter + hydrate/createRoot
├── entry-server.tsx      # SSG render(path) + buildHead() + sitemap/colors helpers
├── routes.tsx            # shared route tree (RootLayout → pages)
├── appModel.ts           # singletons: colorModel, exportService
├── data/                 # palette.ts (generated, ~1.7k active; code-split into its own client chunk) + types.ts;
│                         #   collections.ts (editorial content model — E12), scenes.ts (visualizer scenes — E9)
├── models/ColorModel.ts  # index (id/slug/number/family/collection/designer) + query (filter/sort) + editorial collections
├── context/              # Favorites, Hidden, Filters, Compare, Palette, Toast, App
├── hooks/                # useSet, usePersistent{Set,State}, useFocusTrap, useDocumentMeta
├── pages/                # GalleryPage, ColorDetailPage, ComparePage, PalettePage,
│                         #   CollectionsIndexPage, CollectionPage, VisualizerPage,
│                         #   EmbedPage (chrome-less) + EmbedBuilderPage (E14),
│                         #   BoardPage (chrome-less client board — E13), NotFoundPage
├── components/
│   ├── RootLayout.tsx    # skip link + sticky Header + <main> + CompareTray; AppProviders
│   ├── Header/           # sticky brand + primary nav
│   ├── Atlas/            # AtlasLayout (rail/drawer shell), AtlasToolbar, FilterPanel,
│   │                     #   ActiveFilters, ColorGrid, ColorCard (memoized)
│   ├── ColorDetailView/  # ColorDetail, DetailActions, GetColorPanel, PaintCalculator,
│   │                     #   ColorGridSection, MiniTile, HslBreakdown
│   ├── Collections/      # CollectionColorGrid (crawlable swatch links) — E12
│   ├── Visualizer/       # RoomScene (SVG scene recolor) — E9
│   ├── Embed/            # EmbedWidget (themable, self-contained read-only swatch/palette) — E14
│   ├── Workspace/        # CompareTray, ContrastMatrix, WorkOrderView (Painter lens), FieldModeView (E17)
│   ├── Toast/, ErrorBoundary/, seo/JsonLd
├── domain/               # types.ts (shared facet/sort vocabulary), project.ts (Rooms → Surfaces model),
│                         #   paletteData.ts (persisted shape + pure parse/normalize/migrate — E18),
│                         #   collection.ts (editorial — E12), scene.ts (visualizer scene — E9)
├── utils/                # base.ts, config.ts, storage.ts, slug.ts, seo.ts, breakpoints.ts, clipboard.ts, colorMath.ts,
│                         #   colorCopy.ts, paint.ts, workOrder.ts, swLinks.ts, ogTemplate.ts, ExportService.ts, paletteExport.ts (lazy),
│                         #   projectFile.ts + projectShare.ts (E18), collections.ts (E12), sceneRender.ts (E9),
│                         #   embed.ts (embed URL/snippet builders — E14)
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
structured Project** (`domain/project.ts`: `rooms[] → surfaces[]`). The persisted
shape and all parse/normalize/migrate logic live in the pure, framework-free
`domain/paletteData.ts` (`parsePaletteData` / `normalizeProject`), so the legacy
flat-list format still loads and the **same validation guards every entry point**:
`localStorage`, an imported project file, and a shared project link (E18). Rooms/
surfaces and per-surface progress persist through the same `usePersistentState` /
`storage` seam as everything else; this seam is also what makes Project **file
export/import** portability (E18) cheap — the product stays local-first with no
server. Paint quantities, the shopping list, and progress are pure functions over
the project (`utils/paint.ts`, `utils/workOrder.ts`).

**Project portability (E18).** A Project exports to a **versioned JSON file**
(`utils/projectFile.ts`: `serializeProject` / `parseProjectFile`) and imports back
as a **new** project (no silent overwrite), round-tripping losslessly. It can also
be carried whole in a **shareable link** — `utils/projectShare.ts` gzip-compresses
(`CompressionStream`) the file envelope to a base64url `?project=` param, with a
size guard that falls back to "export a file instead" above
`MAX_SHARE_PARAM_LENGTH`. Both paths decode through `normalizeProject`, so an
imported file or a decoded link is validated exactly like stored data — and the
whole handoff (Designer → Painter → Client) needs **no backend**.

**Field mode (E17).** The Work Order has an on-site lens (`Workspace/FieldModeView`)
toggled from the lens header (preference persisted via `usePersistentState`, so it
survives a reload on the job). It's a deliberately non-dark, high-contrast,
large-type read view with oversized (≥56px) check-off targets for gloved hands in
bright light, plus a jump-to-SW-number lookup (`ColorModel.getColorByNumber`) to
confirm a color at the counter. It's offline-first: the `/palette` route is in the
precached PWA shell and the active project lives in `localStorage`, so progress
check-offs work with no network and persist immediately.

**Room Visualizer (E9).** `/visualizer` lets a shopper preview a color in context.
v1 is **curated + fully client-side** — no photography, no backend. Scenes
(`data/scenes.ts`) are procedural SVG: each declares recolorable wall rectangles
(the "mask") plus a static foreground (floor, window, furniture). `RoomScene` fills
the walls with the chosen color, **multiplies** a radial shading gradient over the
wall region to preserve depth, then overlays a **lighting** tint (warm/cool/
daylight via CSS blend modes; `utils/sceneRender.ts`). The whole look — scene,
color, lighting — lives in the URL (`?scene=&color=&lighting=`), so it's instant to
switch and deep-linkable/shareable; colors are chosen by SW-number search, the
active palette, or a persisted "recent" list, and "save a look" adds the color to
the palette. (A look-specific OG image can't be statically prerendered for infinite
combinations, so shared looks use the brand-default OG card — see Known follow-ups.)

**Embeddable widget (E14).** Partners drop a live swatch/palette onto their own
site via an `<iframe>` pointing at `/embed?c=slug,slug&theme=light|dark`. `/embed`
is the one route rendered **outside `RootLayout`** (no header/nav/tray) so it sits
cleanly in a frame; being provider-less, it reads the `colorModel` singleton
directly. The widget (`components/Embed/EmbedWidget`) is self-contained (its own
light/dark literals, not app tokens, so it renders identically off-domain) and
read-only; back-links open the canonical color pages with **UTM** params so the
host's analytics can attribute (we run none of our own). `/embed` is prerendered +
`noindex` (a fragment, not a page). The self-serve **builder** (`/embed-builder`,
indexed) picks swatch/palette + theme + width, shows a live preview, and copies a
ready-to-paste snippet (`utils/embed.ts` builds the URL + iframe). No backend.

**Client presentation board (E13).** `/board?project=<compressed>` decodes an E18
share link into a clean, **branded, read-only** artifact a designer hands to a
client — colors with notes/room + 60-30-10 roles (E11), a light-on-white look
distinct from the app's working chrome. Like `/embed` it renders **outside
`RootLayout`** (no nav), reads the `colorModel` singleton, and is `noindex` (a
private, link-shared view — no stored server state). A `?title=` param overrides the
heading for branding. "Client board" on the palette page copies the link (reusing
the E18 encoder). Live comments/approval are intentionally dropped — they'd need a
backend; async feedback stays out-of-band (the shared link + an exported PDF).

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
which renders `/`, `/compare`, `/palette`, `/visualizer`, `/collections`, every
`/collections/<slug>`, and every `/colors/<slug>` to static HTML (authoritative
`<head>` injected by `buildHead`), plus `sitemap.xml`, `robots.txt`, `colors.json`,
and a `404.html` SPA fallback. It also rasterizes a 1200×630 Open Graph PNG per
color (+ a brand default + one per collection) into `/og/` with `resvg` (SVG from
`utils/ogTemplate.ts`, Roboto WOFF embedded), referenced via
`og:image`/`twitter:image` in `buildHead`. The PWA precaches the shell only and
runtime-caches color pages (OG PNGs are written after the client build, so they
never enter the precache manifest).

**Editorial collections (E12).** Curated "trend / story" groupings get their own
prerendered, indexable landing pages — the cheapest reach lever, reusing the same
SSG / JSON-LD / OG pipeline. The build-time content model (`data/collections.ts`)
is a flat authoring file: each collection references colors by **SW number**, with
a `published` flag and an optional `heroNumber` — new collections need no component
changes, and `collections.integrity.test.ts` guards that every number resolves.
`ColorModel` resolves the published collections (and builds the reverse
color→collections map for cross-linking) via the pure `utils/collections.ts`. The
index (`/collections`) and per-collection pages (`/collections/<slug>`) carry
authoritative heads, `CollectionPage` + `ItemList` JSON-LD, and a per-collection OG
card; color pages link back to the collections they appear in ("Featured in").

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
  `colorQuery`, `ColorModel`, `paletteIntelligence`, `paletteExport`, `projectFile`,
  `projectShare`, `collections`, `sceneRender`, `embed`, `slug`, `seo`, `contrast`,
  dataset + collections + scenes integrity (`palette.integrity`,
  `collections.integrity`, `scenes.integrity`), and the index-shell check.
- **integration** (jsdom + RTL + `@testing-library/user-event`): component/hook/flow
  specs — each context, the hooks, `ColorCard`, `Toast`, and the routed-app suites in
  `src/test/integration/` (gallery, colorDetail, compare, palette, collections,
  visualizer, embed, board, emptyStates, appShell) sharing `integration/harness.tsx`.
  `ExportService.test.ts` lives here too (it touches `document`/`URL`).
  `src/test/setup.ts` clears storage.
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
- Visualizer "save a look" shares via a deep link, but a **look-specific** OG image
  can't be prerendered (infinite scene × color × lighting combinations on a static
  host), so shared looks fall back to the brand-default OG card.

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
| **Shopper** (DIY)                        | Find a color that works in _my_ room and buy with confidence                                                         | Browse/filter, similar + coordinating, plain-language summary, "Get this color" (sample/store/buy + paint calculator), Room Visualizer v1 (curated scenes, recolor, lighting)                                                                 | No upload-your-own-photo / AR recolor yet (Later)                                                                                                     |
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

**The entire Next horizon has shipped** — every epic is in the architecture
sections above. **E11** (palette intelligence), **E15** (Project model), **E16**
(Work Order + shopping list), **E18** (Project portability), **E12** (Editorial /
trend pages), **E17** (Field mode), **E9** (Room Visualizer v1), **E14** (Embeddable
widget), and **E13** (Client presentation boards) are all delivered. **E10 (Accounts
& cloud sync) is removed** — see the **no backend, no accounts** stance in
Assumptions. The Next horizon is therefore **complete**; the next groomed work comes
from the **Later** bets below.

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

**Sequencing:** the whole Next horizon is **shipped** — the Painter line (E15 → E16
→ E17), the reach + portability + distribution wins (E12 editorial, E18 project
portability, E14 embeddable widget), the heavy client-side shopper bet (E9 Room
Visualizer), and the re-scoped **E13** client board (a branded, read-only shared
board built on E18's share primitive; its former live comments/approval dropped as
it would require a backend). The roadmap now advances to the **Later** bets.
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

**The Next backlog is empty — every groomed epic has shipped** (E11, E15, E16, E18,
E12, E17, E9, E14, E13). Each is documented in the architecture sections above and
verified per the Definition of Done; **E10 (Accounts & cloud sync) was removed** as
backend-dependent. New groomed work is promoted from the **Later** bets below as
they reach the top.

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
