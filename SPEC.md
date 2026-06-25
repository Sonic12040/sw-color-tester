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
│                         #   scenes.ts (visualizer scenes — E9)
├── models/ColorModel.ts  # index (id/slug/number/family/collection/designer) + query (filter/sort);
│                         #   derives editorial collections from branded names (E12)
├── context/              # Favorites, Hidden, Filters, Compare, Palette, Toast, App
├── hooks/                # useSet, usePersistent{Set,State}, useFocusTrap, useDocumentMeta
├── pages/                # GalleryPage, ColorDetailPage, ComparePage, PalettePage,
│                         #   CollectionsIndexPage, CollectionPage,
│                         #   VisualizerPage + PhotoVisualizerPage (upload recolor — v2),
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
│   ├── Visualizer/       # RoomScene (SVG scene recolor — E9); PhotoVisualizer.module.css (upload v2)
│   ├── Embed/            # EmbedWidget (themable, self-contained read-only swatch/palette) — E14
│   ├── Workspace/        # CompareTray, ContrastMatrix, WorkOrderView (Painter lens), FieldModeView (E17)
│   ├── Toast/, ErrorBoundary/, seo/JsonLd
├── domain/               # types.ts (shared facet/sort vocabulary), project.ts (Rooms → Surfaces model),
│                         #   paletteData.ts (persisted shape + pure parse/normalize/migrate — E18),
│                         #   collection.ts (resolved-collection types — E12), scene.ts (visualizer scene — E9)
├── utils/                # base.ts, config.ts, storage.ts, slug.ts, seo.ts, breakpoints.ts, clipboard.ts, colorMath.ts,
│                         #   colorCopy.ts, paint.ts, workOrder.ts, swLinks.ts, ogTemplate.ts, ExportService.ts, paletteExport.ts (lazy),
│                         #   projectFile.ts + projectShare.ts (E18), collections.ts (group/derive — E12),
│                         #   sceneRender.ts (E9) + photoMask.ts/photoGL.ts (upload recolor — v2),
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

**Upload-your-room (Visualizer v2).** `/visualizer/upload` previews a color on a
photo of the user's **own** room — processed entirely in the browser (the photo is
never uploaded; no backend). The image is downscaled on load (≤1400px) to a 2D
canvas for pixel reads; the user **magic-wands** a wall — a contiguous flood fill
within a color tolerance (`utils/photoMask.floodFillMask`) accumulated across
clicks into a coverage mask. Masked pixels are recolored to the target paint
**preserving the original luminance** (shadows/edges read through), then a lighting
tint is blended. The live render runs on the GPU via **WebGL** (`utils/photoGL.ts`:
a fragment shader that recolors + blends), falling back to the pure CPU compositor
(`photoMask.compositeRgba`, also the unit-test target) when WebGL is unavailable.
The recolored canvas exports to a PNG download; the photo is inherently
non-shareable (local-only), so there's no deep link.

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

**Editorial collections (E12).** Branded "trend / story" groupings get their own
prerendered, indexable landing pages — the cheapest reach lever, reusing the same
SSG / JSON-LD / OG pipeline. Collections are **derived from the dataset itself**:
every color carries its `brandedCollectionNames` (e.g. "Timeless Color Wall",
"Top 50 Interior Colors"), so a collection is just the set of colors that share a
name. `ColorModel` groups the active colors into collections via the pure
`utils/collections.ts` (`buildCollections`) — excluding **designer collections**
(the `DESIGNER_COLLECTION_PREFIX` ones, surfaced separately as "Designer Pick"),
sorting by size then name, deriving a slug + a generated blurb (count + dominant
families) + a hero, and building the reverse color→collections map for
cross-linking. The index (`/collections`) and per-collection pages
(`/collections/<slug>`) carry authoritative heads, `CollectionPage` + `ItemList`
JSON-LD, and a per-collection OG card; color pages link back to the collections
they appear in ("Featured in").

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
  `projectShare`, `collections`, `sceneRender`, `photoMask` (upload recolor),
  `embed`, `slug`, `seo`, `contrast`, dataset + scenes integrity
  (`palette.integrity`, `scenes.integrity`), and the index-shell check.
- **integration** (jsdom + RTL + `@testing-library/user-event`): component/hook/flow
  specs — each context, the hooks, `ColorCard`, `Toast`, and the routed-app suites in
  `src/test/integration/` (gallery, colorDetail, compare, palette, collections,
  visualizer, photoVisualizer, embed, board, emptyStates, appShell) sharing
  `integration/harness.tsx`.
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

North star: move users from _"I like this color"_ → _"I'm confident using it"_ →
_"I acted on it,"_ and make every color and palette worth sharing.

**Deliberate constraint — no backend, no accounts.** The product stays **fully
static (SSG) + local-first (localStorage)**: no auth, database, or server sync.
Portability and the Designer → Painter → Client handoff are served by **shareable
URLs + local file export/import**, never a server. This rules out anything that
structurally needs a backend (cross-device auto-sync, server-side analytics, live
multi-user comments/approval, a dynamic API, e-commerce checkout) — and by the same
logic there are **no first-party product analytics**; reach is read directionally
from host/CDN logs, search-console impressions, and UTM on share links.

**Principles:** confidence over catalog · plain language first, data on demand · a
color is a first-class shareable object · local-first & portable · earn heavy
features (curated/build-time before live/AI) · accessible + fast as table stakes.

The **Now** and **Next** horizons have fully shipped — every epic (E9, E11–E18) is
documented in the architecture sections above; **E10 (Accounts & cloud sync) was
dropped** as backend-dependent. Remaining work lives in the **Later** bets.

### Later — ambitious bets

All must hold the **no-backend** line. (Upload-your-room photo recolor + lighting
has **shipped** — see _Upload-your-room (Visualizer v2)_ above.)

| Item                                                                  | Persona              | Effort |
| --------------------------------------------------------------------- | -------------------- | ------ |
| Cross-brand color matching (build-time, data-licensing dependent)     | Designer             | L      |
| Static public data program (`colors.json` + documented contract/bulk) | Integrator/ecosystem | M–L    |

_Dropped as backend-dependent:_ an AI color assistant (LLM proxy/server), a dynamic
public API (superseded by the static data program above), and teams + e-commerce
checkout. Revisit only if the no-backend stance is revised.

_Enabler:_ a build-time **product-line / sheen / coverage** dataset would unlock
accurate per-product quantities in the Work Order (today a documented default
coverage) — build-time, no server, compatible.

## Definition of Done

AC met · unit/integration tests added · `tsc` / ESLint / Prettier clean · `vitest`
green · axe 0 serious/critical · e2e passing · SPEC/docs updated · no Core Web
Vitals regression.
