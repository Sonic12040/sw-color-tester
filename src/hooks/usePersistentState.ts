import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { loadJSON, saveJSON } from "../utils/storage.js";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect.js";

/**
 * Like `useState`, but initialized from localStorage and persisted on change.
 *
 * `validate` narrows the unknown stored value to `T`; returning `null` (e.g. for
 * corrupt or outdated data) falls back to `initial`. Without it, stored data is
 * trusted as-is.
 *
 * Two-phase init: the first render uses `initial` so that server-prerendered
 * markup and the first client render agree (no hydration mismatch — localStorage
 * is client-only). Stored data is then loaded in a **layout** effect on mount —
 * before the browser paints — so a persisted value shows in the first *React*
 * frame instead of flashing the default first. The persist effect skips the
 * first render so it never clobbers stored data with `initial` before the load
 * runs.
 *
 * Caveat for prerendered routes: the static HTML is painted (with `initial`)
 * before the JS bundle loads, so the layout effect can't prevent a flash of that
 * markup. Where the prerendered DOM depends on a persisted value (e.g. the
 * gallery grid's sort order), an inline pre-paint script in index.html hides the
 * affected markup until React re-renders with the stored value — see the
 * `data-presort` handling there and in AtlasLayout.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  validate?: (raw: unknown) => T | null,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const skipSave = useRef(true);

  // `validate` is expected to be stable; keying on `key` matches load semantics.
  useIsomorphicLayoutEffect(() => {
    const raw = loadJSON(key);
    if (raw === undefined) return;
    const next = validate ? validate(raw) : (raw as T);
    if (next !== null) setValue(next as T);
  }, [key]);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    saveJSON(key, value);
  }, [key, value]);

  return [value, setValue];
}
