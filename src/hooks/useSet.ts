import { useState, useMemo } from "react";

export interface SetActions<T> {
  add: (item: T) => void;
  remove: (item: T) => void;
  toggle: (item: T) => void;
  clear: () => void;
  addMultiple: (items: T[]) => void;
  removeMultiple: (items: T[]) => void;
  set: (newSet: Set<T>) => void;
}

type SetInitializer<T> = T[] | Set<T> | (() => T[] | Set<T>);

export function useSet<T>(
  initialValue: SetInitializer<T> = new Set(),
): [Set<T>, SetActions<T>] {
  const [set, setSet] = useState<Set<T>>(() => {
    const value =
      typeof initialValue === "function" ? initialValue() : initialValue;
    return value instanceof Set ? value : new Set(value);
  });

  const actions = useMemo<SetActions<T>>(
    () => ({
      add: (item) =>
        setSet((prev) => {
          if (prev.has(item)) return prev;
          const next = new Set(prev);
          next.add(item);
          return next;
        }),
      remove: (item) =>
        setSet((prev) => {
          if (!prev.has(item)) return prev;
          const next = new Set(prev);
          next.delete(item);
          return next;
        }),
      toggle: (item) =>
        setSet((prev) => {
          const next = new Set(prev);
          if (next.has(item)) next.delete(item);
          else next.add(item);
          return next;
        }),
      clear: () => setSet(new Set()),
      addMultiple: (items) =>
        setSet((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const item of items) {
            if (!next.has(item)) {
              next.add(item);
              changed = true;
            }
          }
          return changed ? next : prev;
        }),
      removeMultiple: (items) =>
        setSet((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const item of items) {
            if (next.has(item)) {
              next.delete(item);
              changed = true;
            }
          }
          return changed ? next : prev;
        }),
      set: (newSet) => setSet(newSet),
    }),
    [],
  );

  return [set, actions];
}
