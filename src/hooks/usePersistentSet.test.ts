import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePersistentSet } from "./usePersistentSet.js";

const KEY = "test:set";

describe("usePersistentSet", () => {
  it("starts empty when nothing is stored", () => {
    const { result } = renderHook(() => usePersistentSet(KEY));
    expect(result.current[0].size).toBe(0);
  });

  it("initializes from previously stored ids", () => {
    localStorage.setItem(KEY, JSON.stringify(["a", "b"]));
    const { result } = renderHook(() => usePersistentSet(KEY));
    expect([...result.current[0]].sort()).toEqual(["a", "b"]);
  });

  it("persists changes to localStorage", () => {
    const { result } = renderHook(() => usePersistentSet(KEY));

    act(() => result.current[1].add("x"));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["x"]);

    act(() => result.current[1].toggle("x")); // remove
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([]);
  });

  it("survives a remount (reload) by reloading from storage", () => {
    const first = renderHook(() => usePersistentSet(KEY));
    act(() => first.result.current[1].add("kept"));
    first.unmount();

    const second = renderHook(() => usePersistentSet(KEY));
    expect(second.result.current[0].has("kept")).toBe(true);
  });

  it("ignores corrupt stored data", () => {
    localStorage.setItem(KEY, "{not valid json");
    const { result } = renderHook(() => usePersistentSet(KEY));
    expect(result.current[0].size).toBe(0);
  });

  it("ignores non-array / non-string stored data", () => {
    localStorage.setItem(KEY, JSON.stringify({ nope: true }));
    const { result } = renderHook(() => usePersistentSet(KEY));
    expect(result.current[0].size).toBe(0);
  });
});
