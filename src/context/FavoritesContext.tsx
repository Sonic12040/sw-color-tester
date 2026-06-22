import { createSetContext } from "./createSetContext.js";
import { STORAGE_KEYS } from "../utils/storage.js";

const { Provider, useStore } = createSetContext(
  "useFavorites",
  "FavoritesProvider",
  STORAGE_KEYS.favorites,
);

export const FavoritesProvider = Provider;

/** Favorite color ids + a toggle. */
export function useFavorites() {
  const { set, toggle } = useStore();
  return { favorites: set, toggleFavorite: toggle };
}
