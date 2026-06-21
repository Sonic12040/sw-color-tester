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

Listed in **delivery order** (see the groomed feature/story backlog below for the
WSJF-lite scoring and dependencies).

| #   | Item                                                                     | Epic | Persona           | Effort |
| --- | ------------------------------------------------------------------------ | ---- | ----------------- | ------ |
| 1   | Palette intelligence: scheme-from-color, auto-coordinate, 60-30-10 roles | E11  | Designer/Shopper  | M      |
| 2   | Editorial / trend collection landing pages + light curation              | E12  | Marketer          | M–L    |
| 3   | Accounts & cloud sync (unlocks saves / projects / dashboards)            | E10  | All               | L      |
| 4   | Room Visualizer v1 (curated scenes, recolor walls, lighting presets)     | E9   | Shopper           | L      |
| 5   | Client presentation boards (branded, read-only, comments/approval)       | E13  | Designer          | M      |
| 6   | Embeddable swatch/palette widget                                         | E14  | Marketer/partners | M      |

### Later — ambitious bets (3+ quarters)

| Item                                                                      | Persona            | Effort |
| ------------------------------------------------------------------------- | ------------------ | ------ |
| Upload-your-room photo recolor + lighting simulation (AR)                 | Shopper            | L      |
| AI color assistant (natural-language over the color data + scheme engine) | Shopper/Designer   | L      |
| Cross-brand color matching (data-licensing dependent)                     | Designer           | L      |
| Public API / partner data program                                         | Marketer/ecosystem | L      |
| Teams + e-commerce checkout (sample/paint ordering, firm seats)           | Designer/Shopper   | L      |

**Sequencing:** the compounding + cheap wins have shipped; **analytics (F3)** is
the remaining Now item and the measurement enabler for the bets below. In Next,
lead with the **independent** wins — **E11 palette intelligence** (pure
`colorMath`) and **E12 editorial pages** (leans on our SSG/SEO strength) — then
stand up the **E10 accounts** foundation before piling more state on localStorage
and before the work that needs it (E9's saved looks, E13 entirely); curated
Visualizer v1 (E9) earns the AR/upload v2, and the **E14 widget** trails until
editorial + analytics make embeds worth distributing.

### Success metrics

- **Shopper:** detail → "Get this color" CTR; visualizer engagement; saves that lead to a sample/buy.
- **Designer:** projects created; exports & shared boards opened; multi-color palette rate; 4-week retention.
- **Marketer:** organic traffic; share rate; OG-card impressions; widget embeds; trend-page traffic.
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
hard dependencies and the "accounts before more localStorage state · earn heavy
features" principles. Effort: S=1, M=2, M–L=2.5, L=3 (value/enable on 1–5).
Epic **IDs are stable**; the table is in **delivery order**.

| Rank | Epic                                 | Persona           | V   | Enable | Eff | WSJF | Why here                                                           |
| ---- | ------------------------------------ | ----------------- | --- | ------ | --- | ---- | ------------------------------------------------------------------ |
| 1    | **E11 · Palette intelligence**       | Designer/Shopper  | 4   | 2      | 2   | 3.0  | Cheapest real differentiator; pure `colorMath`, no new infra/deps. |
| 2    | **E12 · Editorial / trend pages**    | Marketer          | 4   | 3      | 2.5 | 2.8  | Leverages our SSG/SEO/OG strength for reach at low marginal cost.  |
| 3    | **E10 · Accounts & cloud sync**      | All               | 4   | 5      | 3   | 3.0  | Foundation: do it _before_ boards and before more state piles up.  |
| 4    | **E9 · Room Visualizer v1**          | Shopper           | 5   | 3      | 3   | 2.7  | Biggest shopper gap ("see it in context"); earns the AR v2 bet.    |
| 5    | **E13 · Client presentation boards** | Designer          | 3   | 2      | 2   | 2.5  | High designer delight, but **blocked on E10**, so it follows it.   |
| 6    | **E14 · Embeddable widget**          | Marketer/partners | 3   | 3      | 2   | 3.0  | Distribution play; worth most _after_ editorial + analytics exist. |

Sequencing rationale: lead with the two **independent** wins (E11, E12) that ship
value while the foundation is planned; stand up **E10** before the work that
leans on it (E9's "save look," E13 entirely); then the heavy **E9**; then the
E10-gated **E13**; **E14** trails because its payoff depends on having editorial
surfaces and share analytics worth embedding. (Pull E10 forward if cross-device
sync demand spikes; pull E14 forward if a concrete partner appears.)

---

#### E11 · Palette intelligence _(Designer/Shopper · M)_

Benefit: turn the catalog into _guidance_ — generate harmonious schemes and assign
usage proportions so users move from "I like this" to "here's a plan." Builds on
`utils/colorMath.ts` (`hueRelation`, `contrastRatio`, HSL/LAB); no backend.

**Feature: Scheme-from-a-color (harmony generator)**

- **US11.1** As a shopper/designer, I want to generate a scheme from any color
  (complementary, analogous, triadic, split-complementary, monochromatic) so I get
  coordinated options instantly. _(M)_
  - AC: from a detail page or palette, pick a scheme type → 3–5 suggested SW colors
    snapped to the nearest real dataset colors (never off-catalog); each shows its
    relationship; empty/degenerate cases handled.
  - Tasks: add `schemeFromColor(color, type)` to `colorMath` (pure, unit-tested);
    nearest-catalog snap via existing LAB distance; UI affordance + result strip.
- **US11.2** As a user, I want to send a generated scheme straight to compare or a
  palette project so I can act on it. _(S)_
  - AC: "Add all to palette" / "Compare these" from the result; respects the 4-color
    compare cap; reuses existing palette reconciliation.
  - Tasks: wire to `usePalette`/`useCompare`; toast feedback; test.

**Feature: Auto-coordinate companions**

- **US11.3** As a designer, I want suggested companion colors for a base color or an
  in-progress palette so I can fill gaps. _(M)_
  - AC: given 1–n palette colors, suggest companions that balance hue/contrast/
    neutrality; exclude near-duplicates of what's already in the palette.
  - Tasks: scoring fn over `colorMath` (chroma/contrast/hue spread); "Suggest
    companions" affordance on the palette page; unit-test the ranking.

**Feature: 60-30-10 role assignment**

- **US11.4** As a designer/shopper, I want my palette auto-assigned dominant/
  secondary/accent (60-30-10) roles with proportions so it reads as a usable scheme.
  _(M)_
  - AC: roles inferred from LRV/chroma/neutrality (neutral-light dominant, mid
    secondary, high-chroma accent); user can override a role; proportions shown.
  - Tasks: `assignRoles(colors)` (pure); palette UI badges + a proportion bar;
    persist overrides in the palette entry; surface roles in PNG/PDF export.
- **US11.5** As a user, I want a one-line "why these work together" explanation so I
  trust the suggestion. _(S)_
  - AC: plain-language rationale per scheme/role using existing `colorCopy` voice
    (e.g. "analogous — neighbors on the wheel; low risk").
  - Tasks: extend `colorCopy` with scheme/role phrasing; render under results; test.

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
and the data spine for designer boards (E13) and marketer dashboards. Privacy-first
(honor the F3 stance; explicit export/delete).

**Feature: Authentication**

- **US10.1** As any user, I want to sign in (passwordless email or OAuth) so my work
  follows me across devices. _(M)_
  - AC: sign-up/in/out; SSR-safe (no auth flicker on prerendered shell); works
    offline read-only; no PII beyond email.
  - Tasks: pick provider (managed auth vs. serverless); session handling guarded for
    SSG/SSR; auth UI; e2e happy-path.

**Feature: Cloud persistence & sync**

- **US10.2** As a signed-in user, I want favorites/hidden synced so they match on
  every device. _(M)_
- **US10.3** As a signed-in user, I want palette projects (colors, order, notes,
  room tags) synced so my work is safe and portable. _(M–L)_
  - AC (10.2–10.3): writes persist to the backend and rehydrate on load; offline
    edits queue and reconcile; last-write-wins with a visible "synced/offline"
    state; existing context APIs unchanged for consumers.
  - Tasks: storage adapter behind the current `usePersistent*` seam; sync
    queue + reconciliation; conflict policy; tests for offline→online merge.

**Feature: Migration & account hygiene**

- **US10.4** As a returning user, I want my existing localStorage data adopted into
  my account on first sign-in so I lose nothing. _(M)_
  - AC: one-time, idempotent merge (no dupes); clear before/after; reversible export.
- **US10.5** As a user, I want to export and delete my account/data so I stay in
  control. _(S–M)_
  - AC: full JSON export; hard delete; honors privacy stance.
  - Tasks (10.4–10.5): migration routine + guard flag; settings screen; delete flow;
    tests.

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
