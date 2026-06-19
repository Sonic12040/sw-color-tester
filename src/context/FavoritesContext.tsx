import { createContext, useCallback, useContext, useMemo } from "react";
import { type SetActions } from "../hooks/useSet.js";
import { usePersistentSet } from "../hooks/usePersistentSet.js";
import { STORAGE_KEYS } from "../utils/storage.js";

export interface FavoritesContextValue {
  favorites: Set<string>;
  actions: SetActions<string>;
  toggleFavorite: (id: string) => void;
  clearFavorites: () => void;
  toggleBulkFavorite: (colorIds: string[]) => void;
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(
  null,
);

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used inside <FavoritesProvider>");
  }
  return ctx;
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, actions] = usePersistentSet(STORAGE_KEYS.favorites);

  const toggleBulkFavorite = useCallback(
    (colorIds: string[]) => {
      const allFavorited =
        colorIds.length > 0 && colorIds.every((id) => favorites.has(id));
      if (allFavorited) {
        actions.removeMultiple(colorIds);
      } else {
        actions.addMultiple(colorIds);
      }
    },
    [favorites, actions],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      actions,
      toggleFavorite: actions.toggle,
      clearFavorites: actions.clear,
      toggleBulkFavorite,
    }),
    [favorites, actions, toggleBulkFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}
