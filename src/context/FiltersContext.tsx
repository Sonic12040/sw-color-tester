import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

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

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [lrvMin, setLrvMin] = useState(0);
  const [lrvMax, setLrvMax] = useState(100);

  const setLrvRange = useCallback((min: number, max: number) => {
    setLrvMin(clamp(min));
    setLrvMax(clamp(max));
  }, []);

  const resetLrv = useCallback(() => {
    setLrvMin(0);
    setLrvMax(100);
  }, []);

  const value = useMemo<FiltersContextValue>(
    () => ({
      lrvMin,
      lrvMax,
      lrvRange: { min: lrvMin, max: lrvMax },
      isLrvActive: lrvMin > 0 || lrvMax < 100,
      setLrvRange,
      resetLrv,
    }),
    [lrvMin, lrvMax, setLrvRange, resetLrv],
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}
