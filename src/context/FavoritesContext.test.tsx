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
});
