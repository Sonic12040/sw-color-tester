import { useEffect, useRef } from "react";
import { useSet, type SetActions } from "./useSet.js";
import { loadJSON, saveJSON } from "../utils/storage.js";

/**
 * A {@link useSet} of strings that initializes from localStorage and persists on
 * every change. Malformed stored data is ignored (falls back to empty).
 *
 * Two-phase init (see usePersistentState): renders empty first so server and
 * first client render agree, then loads stored ids on mount. The persist effect
 * skips the first render so it never clobbers stored data before the load.
 */
export function usePersistentSet(
  key: string,
): [Set<string>, SetActions<string>] {
  const [set, actions] = useSet<string>();
  const skipSave = useRef(true);

  useEffect(() => {
    const raw = loadJSON(key);
    if (!Array.isArray(raw)) return;
    const items = raw.filter(
      (item): item is string => typeof item === "string",
    );
    if (items.length > 0) actions.set(new Set(items));
  }, [key, actions]);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    saveJSON(key, [...set]);
  }, [key, set]);

  return [set, actions];
}
