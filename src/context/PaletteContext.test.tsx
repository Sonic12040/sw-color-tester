import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { PaletteProvider, usePalette } from "./PaletteContext.js";
import { STORAGE_KEYS } from "../utils/storage.js";

const setup = () =>
  renderHook(() => usePalette(), { wrapper: PaletteProvider });

describe("PaletteContext", () => {
  it("toggles colors, preserving insertion order (no cap)", () => {
    const { result } = setup();
    act(() => {
      result.current.togglePalette("a");
      result.current.togglePalette("b");
      result.current.togglePalette("c");
    });
    expect(result.current.palette).toEqual(["a", "b", "c"]);
    expect(result.current.inPalette("b")).toBe(true);
    act(() => result.current.togglePalette("b"));
    expect(result.current.palette).toEqual(["a", "c"]);
  });

  it("replaces the whole palette (loading a shared one)", () => {
    const { result } = setup();
    act(() => result.current.setPalette(["x", "y", "z"]));
    expect(result.current.palette).toEqual(["x", "y", "z"]);
  });

  it("removes and clears", () => {
    const { result } = setup();
    act(() => result.current.setPalette(["a", "b"]));
    act(() => result.current.removeFromPalette("a"));
    expect(result.current.palette).toEqual(["b"]);
    act(() => result.current.clearPalette());
    expect(result.current.palette).toEqual([]);
  });

  it("persists to localStorage", () => {
    const { result } = setup();
    act(() => result.current.togglePalette("a"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.palette)!)).toEqual([
      "a",
    ]);
  });
});
