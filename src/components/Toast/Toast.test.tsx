import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { TIMING } from "../../utils/config.js";
import { ToastProvider, useToast } from "./Toast.js";

function Harness({ onAction }: { onAction?: () => void }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast("Saved!", onAction ? { actionText: "Undo", onAction } : undefined)
      }
    >
      fire
    </button>
  );
}

const renderToasts = (onAction?: () => void) =>
  render(
    <ToastProvider>
      <Harness onAction={onAction} />
    </ToastProvider>,
  );

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Toast", () => {
  it("shows a toast message on demand", () => {
    renderToasts();
    fireEvent.click(screen.getByRole("button", { name: "fire" }));
    expect(screen.getByText("Saved!")).toBeTruthy();
  });

  it("runs the action and dismisses when the action button is clicked", () => {
    const onAction = vi.fn();
    renderToasts(onAction);
    fireEvent.click(screen.getByRole("button", { name: "fire" }));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onAction).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(TIMING.CLOSE_ANIMATION_MS));
    expect(screen.queryByText("Saved!")).toBeNull();
  });

  it("auto-dismisses after its lifetime + exit animation", () => {
    renderToasts();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "fire" }));
    expect(screen.getByText("Saved!")).toBeTruthy();
    act(() => vi.advanceTimersByTime(TIMING.TOAST_DURATION_MS));
    act(() => vi.advanceTimersByTime(TIMING.CLOSE_ANIMATION_MS));
    expect(screen.queryByText("Saved!")).toBeNull();
  });
});
