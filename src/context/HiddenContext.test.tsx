import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { HiddenProvider, useHidden } from "./HiddenContext.js";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <HiddenProvider>{children}</HiddenProvider>
);

function setup() {
  return renderHook(() => useHidden(), { wrapper });
}

describe("HiddenContext", () => {
  it("throws when used outside the provider", () => {
    expect(() => renderHook(() => useHidden())).toThrow(
      /must be used inside <HiddenProvider>/,
    );
  });

  it("toggles a single color's hidden state on and off", () => {
    const { result } = setup();

    expect(result.current.hidden.has("a")).toBe(false);
    act(() => result.current.toggleHidden("a"));
    expect(result.current.hidden.has("a")).toBe(true);
    act(() => result.current.toggleHidden("a"));
    expect(result.current.hidden.has("a")).toBe(false);
  });

  it("produces a new Set reference when hiding (the regression that broke the UI)", () => {
    const { result } = setup();
    const before = result.current.hidden;

    act(() => result.current.toggleHidden("a"));

    expect(result.current.hidden).not.toBe(before);
  });

  it("clears all hidden colors", () => {
    const { result } = setup();

    act(() => result.current.toggleBulkHidden(["a", "b"]));
    expect(result.current.hidden.size).toBe(2);

    act(() => result.current.clearHidden());
    expect(result.current.hidden.size).toBe(0);
  });

  describe("toggleBulkHidden (Hide All)", () => {
    it("hides the whole family when not all are hidden", () => {
      const { result } = setup();
      act(() => result.current.toggleHidden("a")); // only one hidden

      act(() => result.current.toggleBulkHidden(["a", "b", "c"]));
      expect([...result.current.hidden].sort()).toEqual(["a", "b", "c"]);
    });

    it("unhides the whole family when every member is already hidden", () => {
      const { result } = setup();
      act(() => result.current.toggleBulkHidden(["a", "b", "c"])); // all hidden

      act(() => result.current.toggleBulkHidden(["a", "b", "c"])); // all shown
      expect(result.current.hidden.size).toBe(0);
    });

    it("treats an empty family as a no-op", () => {
      const { result } = setup();
      const before = result.current.hidden;
      act(() => result.current.toggleBulkHidden([]));
      expect(result.current.hidden).toBe(before);
    });

    it("supports unhide-family / undo via explicit inverse actions", () => {
      const { result } = setup();
      const ids = ["a", "b", "c"];

      // Hide All
      act(() => result.current.toggleBulkHidden(ids));
      expect(result.current.hidden.size).toBe(3);

      // Unhide family / Undo (ColorExplorer calls actions.removeMultiple)
      act(() => result.current.actions.removeMultiple(ids));
      expect(result.current.hidden.size).toBe(0);
    });
  });
});
