import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePersistentState } from "./usePersistentState.js";

const KEY = "test:state";

describe("usePersistentState", () => {
  it("uses the initial value when nothing is stored", () => {
    const { result } = renderHook(() => usePersistentState(KEY, { n: 1 }));
    expect(result.current[0]).toEqual({ n: 1 });
  });

  it("loads and persists values", () => {
    const { result } = renderHook(() => usePersistentState(KEY, 0));

    act(() => result.current[1](42));
    expect(result.current[0]).toBe(42);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toBe(42);
  });

  it("falls back to initial when the validator rejects stored data", () => {
    localStorage.setItem(KEY, JSON.stringify({ bogus: true }));
    const validate = (raw: unknown) => (typeof raw === "number" ? raw : null);

    const { result } = renderHook(() => usePersistentState(KEY, 7, validate));
    expect(result.current[0]).toBe(7);
  });

  it("accepts stored data the validator approves", () => {
    localStorage.setItem(KEY, JSON.stringify(5));
    const validate = (raw: unknown) => (typeof raw === "number" ? raw : null);

    const { result } = renderHook(() => usePersistentState(KEY, 7, validate));
    expect(result.current[0]).toBe(5);
  });
});
