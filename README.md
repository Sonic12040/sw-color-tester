# Sherwin-Williams Color Atlas

A Progressive Web App for browsing, comparing, collecting, and **planning paint
jobs** around Sherwin-Williams colors. Built with **Vite + React 19 + TypeScript
(strict)** and **statically pre-rendered** (one HTML page per color) for SEO and AI
discoverability.

> Architecture, state model, and product roadmap live in [SPEC.md](./SPEC.md); the
> visual language lives in [design-system.md](./design-system.md). This README is
> the quick start.

## Three-tier product

1. **Browse** (`/`) — a faceted gallery: one virtualized grid of every color with a
   search/sort toolbar and a filter rail (family, undertone, neutrality, lightness,
   use, collection, favorites/hidden view).
2. **Color detail** (`/colors/:slug`) — a canonical, pre-rendered page per color: a
   plain-language summary, a "Get this color" panel (sample / store / buy links + a
   paint calculator), coordinating & similar colors, JSON-LD, and HSL/LAB + raw
   specs under a "Technical details" disclosure.
3. **Workspace**
   - **Compare** (`/compare`) — up to 4 colors side by side with a pairwise WCAG
     contrast matrix.
   - **Palette** (`/palette`) — multiple named projects: collect, reorder, per-color
     notes + room tags, 60-30-10 role suggestions, scheme/companion suggestions,
     PNG board + PDF spec-sheet export, and a shareable `?c=` URL. A project can
     optionally become a **structured Project** (Rooms → Surfaces, each assigned a
     color + finish + coats + measured area) viewed through two lenses:
     - **Board** (Designer) — the palette view.
     - **Work Order** (Painter) — a rooms × surfaces spec with per-room/per-color
       paint quantities, a consolidated shopping list (SW number, rack locator,
       total cans), per-surface progress check-off, and a printable PDF.

## Features

- **Color intelligence** — plain-language summaries, LRV/undertone/neutrality
  classification, coordinating + similar suggestions, 60-30-10 palette roles.
- **Paint planning** — per-room and per-color gallon/can estimates (area × coats ÷
  coverage), a consolidated shopping list, and progress tracking, all reusing the
  paint calculator's area math.
- **Shareable & discoverable** — pre-rendered pages, JSON-LD, per-color Open Graph
  social images, sitemap, and `?c=` share URLs.
- **Project portability** — export a Project to a versioned JSON file and import it
  on another device (or from a teammate), or hand off a whole structured Project in
  a compressed `?project=` link — all client-side, no account needed.
- **Local-first** — favorites, hidden colors, sort, compare, and palette projects
  persist in `localStorage` behind a single storage seam (no account required).
- **PWA** — installable, offline-capable via a generated service worker, with
  update notifications.
- **Accessible** — keyboard navigation, AAA-grade contrast (guarded by tests),
  ≥44px targets, ARIA labels, color never the sole signal, announced SPA routes.

## Getting started

### Prerequisites

- **Node.js 20+** and npm.

### Install & run

```bash
git clone https://github.com/Sonic12040/sw-color-tester.git
cd sw-color-tester
npm install
npm run dev      # Vite dev server → http://localhost:5173
```

### Build & preview

```bash
npm run build    # typecheck → client + SSR build → prerender static HTML/sitemap/OG
npm run preview  # serve the production build locally
```

`npm run build` runs `tsc`, builds the client and SSR bundles, then `prerender.mjs`
writes `dist/` — static HTML for `/`, `/compare`, `/palette`, and every
`/colors/<slug>`, plus `sitemap.xml`, `robots.txt`, `colors.json`, a `404.html` SPA
fallback, and a 1200×630 Open Graph PNG per color.

## Scripts

| Script                     | What it does                                             |
| -------------------------- | -------------------------------------------------------- |
| `npm run dev`              | Vite dev server with HMR.                                |
| `npm run build`            | Typecheck, build client + SSR, and prerender to `dist/`. |
| `npm run preview`          | Preview the built site.                                  |
| `npm test`                 | Run the unit + integration Vitest projects.              |
| `npm run test:unit`        | Pure-logic unit tests only.                              |
| `npm run test:integration` | Component/hook/flow tests (jsdom + Testing Library).     |
| `npm run test:e2e`         | Playwright + axe-core cross-device / a11y e2e.           |
| `npm run typecheck`        | `tsc --noEmit`.                                          |
| `npm run lint`             | ESLint (flat config).                                    |
| `npm run format`           | Prettier write (`format:check` to verify).               |

## Tech stack

- **Vite 8** (dev/build; `vite-plugin-pwa` for the service worker)
- **React 19** + **React Router 7** (data router)
- **TypeScript** (strict; `.js` extensions on relative imports)
- **Vitest + Testing Library (jsdom)** for unit + integration tests
- **Playwright + axe-core** for cross-device + accessibility e2e
- **ESLint (flat) + Prettier**, enforced in CI
- **pdf-lib** for client-side PDF export

## Project structure

A high-level map (see [SPEC.md](./SPEC.md) for the full breakdown):

```text
src/
├── main.tsx / entry-server.tsx   # client hydrate + SSG render
├── routes.tsx                    # shared route tree
├── data/                         # generated color dataset + types
├── models/                       # ColorModel repository + pure query/sort
├── context/                      # Favorites, Hidden, Filters, Compare, Palette, Toast, App
├── domain/                       # shared facet/sort vocabulary + project (rooms → surfaces) model
├── utils/                        # color math/copy, paint quantities, work order, export, SEO
├── components/                   # Atlas (gallery), ColorDetailView, Workspace (Compare, WorkOrder), …
└── styles/                       # design tokens + global CSS
prerender.mjs                     # post-build static HTML / sitemap / OG generation
```

## Testing

- **Unit** — colocated `*.test.ts` over pure logic (color math/copy, query, paint
  estimates, work order, SEO, dataset integrity).
- **Integration** — jsdom + React Testing Library specs for contexts, hooks, and the
  routed flows (gallery, detail, compare, palette/work order).
- **Build-output** — asserts the prerendered `dist/` (SEO markup, JSON-LD, summaries,
  OG images); runs after a build.
- **E2E** — Playwright across a 6-profile device matrix plus axe accessibility scans.

CI runs lint → format:check → typecheck → test → build → e2e, then deploys to GitHub
Pages.

## License

For educational and demonstration purposes.

## Acknowledgments

Color data sourced from Sherwin-Williams.
