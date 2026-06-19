import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSet } from "./useSet.js";

describe("useSet", () => {
  it("starts empty by default", () => {
    const { result } = renderHook(() => useSet<string>());
    expect(result.current[0].size).toBe(0);
  });

  it("accepts an initial array", () => {
    const { result } = renderHook(() => useSet(["a", "b"]));
    expect([...result.current[0]]).toEqual(["a", "b"]);
  });

  it("toggles a value on and off", () => {
    const { result } = renderHook(() => useSet<string>());

    act(() => result.current[1].toggle("a"));
    expect(result.current[0].has("a")).toBe(true);

    act(() => result.current[1].toggle("a"));
    expect(result.current[0].has("a")).toBe(false);
  });

  it("returns a NEW Set reference on every real change (reactivity guarantee)", () => {
    const { result } = renderHook(() => useSet<string>());
    const before = result.current[0];

    act(() => result.current[1].add("a"));

    // The bug that broke hiding was in-place mutation keeping the same reference.
    expect(result.current[0]).not.toBe(before);
    expect(result.current[0].has("a")).toBe(true);
  });

  it("returns the SAME reference for no-op add/remove", () => {
    const { result } = renderHook(() => useSet(["a"]));

    const afterRedundantAdd = (() => {
      const before = result.current[0];
      act(() => result.current[1].add("a")); // already present
      return { before, after: result.current[0] };
    })();
    expect(afterRedundantAdd.after).toBe(afterRedundantAdd.before);

    const afterRedundantRemove = (() => {
      const before = result.current[0];
      act(() => result.current[1].remove("missing")); // not present
      return { before, after: result.current[0] };
    })();
    expect(afterRedundantRemove.after).toBe(afterRedundantRemove.before);
  });

  it("addMultiple adds only missing items and skips the update when nothing changes", () => {
    const { result } = renderHook(() => useSet(["a"]));

    act(() => result.current[1].addMultiple(["a", "b", "c"]));
    expect([...result.current[0]].sort()).toEqual(["a", "b", "c"]);

    const before = result.current[0];
    act(() => result.current[1].addMultiple(["a", "b"])); // all present already
    expect(result.current[0]).toBe(before);
  });

  it("removeMultiple removes present items and skips the update when nothing changes", () => {
    const { result } = renderHook(() => useSet(["a", "b", "c"]));

    act(() => result.current[1].removeMultiple(["a", "b"]));
    expect([...result.current[0]]).toEqual(["c"]);

    const before = result.current[0];
    act(() => result.current[1].removeMultiple(["x", "y"])); // none present
    expect(result.current[0]).toBe(before);
  });

  it("clear empties the set", () => {
    const { result } = renderHook(() => useSet(["a", "b"]));
    act(() => result.current[1].clear());
    expect(result.current[0].size).toBe(0);
  });
});
