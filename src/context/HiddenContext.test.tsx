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
});
