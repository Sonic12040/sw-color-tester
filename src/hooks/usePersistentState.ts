import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { loadJSON, saveJSON } from "../utils/storage.js";

/**
 * Like `useState`, but initialized from localStorage and persisted on change.
 *
 * `validate` narrows the unknown stored value to `T`; returning `null` (e.g. for
 * corrupt or outdated data) falls back to `initial`. Without it, stored data is
 * trusted as-is.
 *
 * Two-phase init: the first render uses `initial` so that server-prerendered
 * markup and the first client render agree (no hydration mismatch — localStorage
 * is client-only). Stored data is then loaded in an effect on mount. The persist
 * effect skips the first render so it never clobbers stored data with `initial`
 * before the load runs.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  validate?: (raw: unknown) => T | null,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const skipSave = useRef(true);

  useEffect(() => {
    const raw = loadJSON(key);
    if (raw === undefined) return;
    const next = validate ? validate(raw) : (raw as T);
    if (next !== null) setValue(next as T);
    // `validate` is expected to be stable; keying on `key` matches load semantics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
