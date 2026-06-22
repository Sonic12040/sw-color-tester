import { createContext, useMemo } from "react";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";
import { useRequiredContext } from "./useRequiredContext.js";

/** Max colors that can be compared side-by-side at once. */
export const MAX_COMPARE = 4;

export interface CompareContextValue {
  /** Color ids selected for comparison (order preserved). */
  compare: string[];
  isComparing: (id: string) => boolean;
  toggleCompare: (id: string) => void;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function useCompare(): CompareContextValue {
  return useRequiredContext(CompareContext, "useCompare", "CompareProvider");
}

function parseIds(raw: unknown): string[] | null {
  return Array.isArray(raw)
    ? raw
        .filter((x): x is string => typeof x === "string")
        .slice(0, MAX_COMPARE)
    : null;
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compare, setCompare] = usePersistentState<string[]>(
    STORAGE_KEYS.compare,
    [],
    parseIds,
  );

  // Stable callbacks (functional updates) so memoized cards don't re-render when
  // the compare list changes — only cards whose `isComparing` flips re-render.
  const actions = useMemo(
    () => ({
      toggleCompare: (id: string) =>
        setCompare((prev) =>
          prev.includes(id)
            ? prev.filter((c) => c !== id)
            : prev.length >= MAX_COMPARE
              ? prev
              : [...prev, id],
        ),
      removeCompare: (id: string) =>
        setCompare((prev) => prev.filter((c) => c !== id)),
      clearCompare: () => setCompare([]),
    }),
    [setCompare],
  );

  const value = useMemo<CompareContextValue>(
    () => ({
      compare,
      isComparing: (id: string) => compare.includes(id),
      isFull: compare.length >= MAX_COMPARE,
      ...actions,
    }),
    [compare, actions],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}
