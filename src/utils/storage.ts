// Safe localStorage helpers. All access is guarded so the app keeps working when
// storage is unavailable (private mode, disabled cookies, SSR) or corrupt.

export const STORAGE_KEYS = {
  favorites: "sw-color-tester:favorites",
  hidden: "sw-color-tester:hidden",
  lrv: "sw-color-tester:lrv",
  sort: "sw-color-tester:sort",
  compare: "sw-color-tester:compare",
  palette: "sw-color-tester:palette",
} as const;

/** Read and JSON-parse a value; returns `undefined` if missing or unreadable. */
export function loadJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** JSON-stringify and persist a value; silently ignores quota/availability errors. */
export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — non-fatal; in-memory state still works.
  }
}
