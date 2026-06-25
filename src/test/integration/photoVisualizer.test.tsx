import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "./harness.js";

// jsdom has no canvas/WebGL, so this covers the UI shell + cross-links; the
// recolor pipeline itself is unit-tested (photoMask) and e2e-tested (real GL).
describe("Upload-your-room visualizer (Room Visualizer v2)", () => {
  it("shows an upload prompt with the no-upload privacy note", () => {
    renderApp("/visualizer/upload");
    expect(
      screen.getByRole("heading", { name: "Upload your room" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Choose a room photo" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Upload a room photo")).toBeTruthy();
    expect(screen.getByText(/never uploaded to a server/i)).toBeTruthy();
    // The editing controls only appear once a photo is loaded.
    expect(screen.queryByLabelText("Match tolerance")).toBeNull();
  });

  it("links back to the curated scene visualizer", () => {
    renderApp("/visualizer/upload");
    expect(
      screen.getByRole("link", { name: /Use a curated scene instead/ }),
    ).toBeTruthy();
  });

  it("is reachable from the curated visualizer", () => {
    renderApp("/visualizer");
    expect(
      screen.getByRole("link", { name: /Use your own room photo/ }),
    ).toBeTruthy();
  });
});
