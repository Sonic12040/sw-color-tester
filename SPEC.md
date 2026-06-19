# Architecture — sw-color-tester

A Progressive Web App for exploring, organizing, and sharing Sherwin‑Williams
paint colors. Built with **Vite + React 19 + TypeScript (strict)**.

> This document describes the architecture as it currently stands. (An earlier
> revision described a planned migration from a vanilla‑JS Command/CommandBus
> design; that design was superseded by the idiomatic‑React structure below.)

---

## Tech stack

- **Vite 8** — dev server + build; `vite-plugin-pwa` generates the service worker.
- **React 19** — function components, hooks, context.
- **TypeScript** — strict; bundler module resolution; `.js` extensions on relative
  imports (Vite/TS resolve them to `.ts(x)`).
- **Vitest + Testing Library (jsdom)** — unit + user‑centric integration tests.
- **ESLint (flat config) + Prettier** — enforced in CI.

## Source layout

```text
src/
├── main.tsx                 # React root (StrictMode)
├── App.tsx                  # AppInner: wiring, derived data, top-level handlers
├── data/
│   ├── palette.ts           # generated color dataset (~2k records)
│   └── types.ts             # Color interface
├── models/
│   └── ColorModel.ts        # domain logic: indexing, filtering, grouping, sorting
├── context/
│   ├── AppProviders.tsx     # composes all state providers
│   ├── AppContext.tsx       # { colorModel, openModal } — stable services/UI hook
│   ├── FavoritesContext.tsx # favorites set + actions (useSet)
│   ├── HiddenContext.tsx    # hidden set + actions (useSet)
│   └── FiltersContext.tsx   # LRV range (useState)
├── hooks/
│   ├── useSet.ts            # immutable Set state primitive
│   ├── usePersistentSet.ts  # useSet backed by localStorage
│   └── usePersistentState.ts# useState backed by localStorage
├── components/
│   ├── Header/              # title + collapsible toolbar (LrvFilter, clear/export)
│   ├── LrvFilter/           # debounced dual-range LRV slider
│   ├── ColorExplorer/       # accordion of Favorites / Hidden / family sections
│   │   ├── ColorAccordion/  #   collapsible section
│   │   ├── ColorTile/       #   single color card (+ HiddenFamilyTile)
│   │   └── BulkActionsPanel/#   "Favorite All" / "Hide All"
│   ├── Modal/               # color-detail dialog (focus-trapped, portal)
│   ├── Toast/               # transient notifications + undo action
│   └── ConfirmDialog/       # promise-based confirm for destructive actions
├── utils/
│   ├── config.ts            # thresholds, family order, timings
│   ├── storage.ts           # safe localStorage helpers + keys
│   └── ExportService.ts     # favorites → downloaded JSON
└── styles/                  # global tokens + base CSS
```

## State management

All shared state lives in **separate, focused React contexts** — never one
combined context. React propagates context by value identity, so a single merged
value would re-render every consumer on any change; splitting keeps a `hidden`
change from re-rendering `favorites`-only consumers. (`AppProviders` composes the
providers; `context/context-isolation.test.tsx` validates the isolation.)

| Concern         | Source of truth                         | Hook                        |
| --------------- | --------------------------------------- | --------------------------- |
| Favorites       | `FavoritesContext` (`usePersistentSet`) | `useFavorites()`            |
| Hidden colors   | `HiddenContext` (`usePersistentSet`)    | `useHidden()`               |
| LRV filter      | `FiltersContext` (`usePersistentState`) | `useFilters()`              |
| Modal open id   | `useState` in `AppInner`                | `useAppContext().openModal` |
| Toasts          | `ToastContext`                          | `useToast()`                |
| Confirm dialogs | `ConfirmContext`                        | `useConfirmDialog()`        |

`useSet` guarantees a **new `Set` reference on every real change** (and the same
reference on a no-op) — the contract React's reactivity depends on.

**Persistence.** Favorites, hidden colors, and the LRV filter persist to
`localStorage` (keys in `utils/storage.ts`) via `usePersistentSet` /
`usePersistentState`, so they survive reloads. Reads/writes are guarded and
validated; corrupt or unavailable storage falls back to defaults without throwing.

`ColorModel` is constructed once from the static dataset and holds no UI state; it
is pure-ish domain logic (filtering/grouping/sorting take state Sets as arguments
and return new arrays). Context values are memoized so identities stay stable.

## Data flow

```text
User action → context action (setState) → context re-renders consumers
ColorExplorer derives visible/grouped colors via ColorModel (memoized)
```

Destructive actions (Clear All Favorites/Hidden) go through `useConfirmDialog()`
before mutating. Bulk actions surface an **Undo** toast that applies the inverse
set action.

## Conventions

- **Named exports only** for components; **interfaces** for object shapes.
- **CSS Modules** per component; class names via `styles.foo`.
- **No `any`**; relative imports with `.js` extension.
- Context + provider + hook are **colocated** in one file per concern.
- Components are queried in tests by **role/text/accessible name**, not classes.

## Testing

- **Unit**: `useSet`, each context (`*.test.tsx`), context isolation.
- **Integration (user‑centric)**: `App.test.tsx` drives the real app through the
  DOM (favoriting, hiding, bulk actions, LRV filtering, undo, confirm dialogs);
  `Modal.test.tsx` covers open / focus-trap / focus-return / navigation + a data
  snapshot.
- CSS Modules use non‑scoped class names in tests (`vitest.config.ts`) so DOM
  snapshots stay readable and stable.

## CI/CD (`.github/workflows/deploy.yml`)

`verify` (lint → format:check → typecheck → test) gates `build`, which gates
`deploy` to GitHub Pages.

## Known follow-ups

- Persistence is `localStorage`-only; **URL-encoded shareable state** (deep links
  to a curated set) would build on the same context seam.
- Toast/ConfirmDialog define their contexts inside component files; moving them to
  `context/` would match the rest of the codebase.
