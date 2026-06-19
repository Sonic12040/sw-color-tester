import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { FavoritesProvider, useFavorites } from "./FavoritesContext.js";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FavoritesProvider>{children}</FavoritesProvider>
);

function setup() {
  return renderHook(() => useFavorites(), { wrapper });
}

describe("FavoritesContext", () => {
  it("throws when used outside the provider", () => {
    expect(() => renderHook(() => useFavorites())).toThrow(
      /must be used inside <FavoritesProvider>/,
    );
  });

  it("toggles a single favorite on and off", () => {
    const { result } = setup();

    expect(result.current.favorites.has("a")).toBe(false);
    act(() => result.current.toggleFavorite("a"));
    expect(result.current.favorites.has("a")).toBe(true);
    act(() => result.current.toggleFavorite("a"));
    expect(result.current.favorites.has("a")).toBe(false);
  });

  it("clears all favorites", () => {
    const { result } = setup();

    act(() => result.current.toggleFavorite("a"));
    act(() => result.current.toggleFavorite("b"));
    expect(result.current.favorites.size).toBe(2);

    act(() => result.current.clearFavorites());
    expect(result.current.favorites.size).toBe(0);
  });

  describe("toggleBulkFavorite (Favorite All)", () => {
    it("favorites the whole group when not all are favorited", () => {
      const { result } = setup();
      act(() => result.current.toggleFavorite("a")); // only one favorited

      act(() => result.current.toggleBulkFavorite(["a", "b", "c"]));
      expect([...result.current.favorites].sort()).toEqual(["a", "b", "c"]);
    });

    it("unfavorites the whole group when every member is already favorited", () => {
      const { result } = setup();
      act(() => result.current.toggleBulkFavorite(["a", "b", "c"])); // all on

      act(() => result.current.toggleBulkFavorite(["a", "b", "c"])); // all off
      expect(result.current.favorites.size).toBe(0);
    });

    it("treats an empty group as a no-op (does not flip to 'all favorited')", () => {
      const { result } = setup();
      const before = result.current.favorites;
      act(() => result.current.toggleBulkFavorite([]));
      expect(result.current.favorites).toBe(before);
    });

    it("supports the undo path via explicit inverse actions", () => {
      const { result } = setup();
      const ids = ["a", "b", "c"];

      // Favorite All
      act(() => result.current.toggleBulkFavorite(ids));
      expect(result.current.favorites.size).toBe(3);

      // Undo (ColorExplorer calls actions.removeMultiple for the inverse)
      act(() => result.current.actions.removeMultiple(ids));
      expect(result.current.favorites.size).toBe(0);
    });
  });
});
