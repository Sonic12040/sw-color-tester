import { useEffect, useState } from "react";
import { loadJSON, saveJSON } from "../utils/storage.js";

/**
 * Like `useState`, but initialized from localStorage and persisted on change.
 *
 * `validate` narrows the unknown stored value to `T`; returning `null` (e.g. for
 * corrupt or outdated data) falls back to `initial`. Without it, stored data is
 * trusted as-is.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  validate?: (raw: unknown) => T | null,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const raw = loadJSON(key);
    if (raw === undefined) return initial;
    if (!validate) return raw as T;
    const parsed = validate(raw);
    return parsed === null ? initial : parsed;
  });

  useEffect(() => {
    saveJSON(key, value);
  }, [key, value]);

  return [value, setValue];
}
