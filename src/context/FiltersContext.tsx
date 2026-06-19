import { createContext, useCallback, useContext, useMemo } from "react";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";

export interface LrvRange {
  min: number;
  max: number;
}

export interface FiltersContextValue {
  lrvMin: number;
  lrvMax: number;
  lrvRange: LrvRange;
  isLrvActive: boolean;
  setLrvRange: (min: number, max: number) => void;
  resetLrv: () => void;
}

export const FiltersContext = createContext<FiltersContextValue | null>(null);

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFilters must be used inside <FiltersProvider>");
  }
  return ctx;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const DEFAULT_RANGE: LrvRange = { min: 0, max: 100 };

/** Narrow stored data to a valid LrvRange (clamped), or null to fall back. */
function parseLrvRange(raw: unknown): LrvRange | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.min !== "number" || typeof r.max !== "number") return null;
  return { min: clamp(r.min), max: clamp(r.max) };
}

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = usePersistentState<LrvRange>(
    STORAGE_KEYS.lrv,
    DEFAULT_RANGE,
    parseLrvRange,
  );
  const { min: lrvMin, max: lrvMax } = range;

  const setLrvRange = useCallback(
    (min: number, max: number) =>
      setRange({ min: clamp(min), max: clamp(max) }),
    [setRange],
  );

  const resetLrv = useCallback(() => setRange(DEFAULT_RANGE), [setRange]);

  const value = useMemo<FiltersContextValue>(
    () => ({
      lrvMin,
      lrvMax,
      lrvRange: range,
      isLrvActive: lrvMin > 0 || lrvMax < 100,
      setLrvRange,
      resetLrv,
    }),
    [lrvMin, lrvMax, range, setLrvRange, resetLrv],
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}
