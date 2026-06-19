import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { CompareProvider, useCompare, MAX_COMPARE } from "./CompareContext.js";
import { STORAGE_KEYS } from "../utils/storage.js";

const setup = () =>
  renderHook(() => useCompare(), { wrapper: CompareProvider });

describe("CompareContext", () => {
  it("starts empty", () => {
    const { result } = setup();
    expect(result.current.compare).toEqual([]);
    expect(result.current.isFull).toBe(false);
  });

  it("toggles a color in and out", () => {
    const { result } = setup();
    act(() => result.current.toggleCompare("a"));
    expect(result.current.isComparing("a")).toBe(true);
    act(() => result.current.toggleCompare("a"));
    expect(result.current.isComparing("a")).toBe(false);
  });

  it("caps the selection at MAX_COMPARE", () => {
    const { result } = setup();
    act(() => {
      for (let i = 0; i < MAX_COMPARE + 2; i++)
        result.current.toggleCompare(`c${i}`);
    });
    expect(result.current.compare).toHaveLength(MAX_COMPARE);
    expect(result.current.isFull).toBe(true);
  });

  it("removes and clears", () => {
    const { result } = setup();
    act(() => {
      result.current.toggleCompare("a");
      result.current.toggleCompare("b");
    });
    act(() => result.current.removeCompare("a"));
    expect(result.current.compare).toEqual(["b"]);
    act(() => result.current.clearCompare());
    expect(result.current.compare).toEqual([]);
  });

  it("persists to localStorage", () => {
    const { result } = setup();
    act(() => result.current.toggleCompare("a"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.compare)!)).toEqual([
      "a",
    ]);
  });
});
