import { useEffect } from "react";
import { useSet, type SetActions } from "./useSet.js";
import { loadJSON, saveJSON } from "../utils/storage.js";

/**
 * A {@link useSet} of strings that initializes from localStorage and persists on
 * every change. Malformed stored data is ignored (falls back to empty).
 */
export function usePersistentSet(
  key: string,
): [Set<string>, SetActions<string>] {
  const [set, actions] = useSet<string>(() => {
    const raw = loadJSON(key);
    return Array.isArray(raw)
      ? raw.filter((item): item is string => typeof item === "string")
      : [];
  });

  useEffect(() => {
    saveJSON(key, [...set]);
  }, [key, set]);

  return [set, actions];
}
