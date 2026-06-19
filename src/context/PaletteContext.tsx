import { createContext, useContext, useMemo } from "react";
import { usePersistentState } from "../hooks/usePersistentState.js";
import { STORAGE_KEYS } from "../utils/storage.js";

export interface PaletteContextValue {
  /** Color ids saved to the working palette (order preserved). */
  palette: string[];
  inPalette: (id: string) => boolean;
  togglePalette: (id: string) => void;
  removeFromPalette: (id: string) => void;
  clearPalette: () => void;
  /** Replace the whole palette (used when loading a shared palette from the URL). */
  setPalette: (ids: string[]) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used inside <PaletteProvider>");
  return ctx;
}

function parseIds(raw: unknown): string[] | null {
  return Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string")
    : null;
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = usePersistentState<string[]>(
    STORAGE_KEYS.palette,
    [],
    parseIds,
  );

  const actions = useMemo(
    () => ({
      togglePalette: (id: string) =>
        setPalette((prev) =>
          prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
        ),
      removeFromPalette: (id: string) =>
        setPalette((prev) => prev.filter((p) => p !== id)),
      clearPalette: () => setPalette([]),
      setPalette,
    }),
    [setPalette],
  );

  const value = useMemo<PaletteContextValue>(
    () => ({
      palette,
      inPalette: (id: string) => palette.includes(id),
      ...actions,
    }),
    [palette, actions],
  );

  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  );
}
