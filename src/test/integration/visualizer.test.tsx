import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "./harness.js";

describe("Room Visualizer (E9)", () => {
  it("renders the default scene with a default wall color", () => {
    renderApp("/visualizer");
    expect(
      screen.getByRole("heading", { name: "Room Visualizer" }),
    ).toBeTruthy();
    // Default color is Repose Gray (SW 7015) in the living-room scene.
    expect(
      screen.getByRole("img", {
        name: /Living room with the walls painted Repose Gray/,
      }),
    ).toBeTruthy();
  });

  it("switches the scene (US9.1)", async () => {
    const { user } = renderApp("/visualizer");
    await user.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(
      screen.getByRole("img", { name: /Bedroom with the walls painted/ }),
    ).toBeTruthy();
  });

  it("recolors the walls from an SW-number search (US9.2/9.3)", async () => {
    const { user } = renderApp("/visualizer");
    await user.type(
      screen.getByLabelText("Look up a color by SW number"),
      "6258",
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(
      screen.getByRole("img", { name: /painted Tricorn Black \(SW 6258\)/ }),
    ).toBeTruthy();
    // The applied color shows up under "Recent".
    expect(
      screen.getByRole("button", { name: /Paint the walls Tricorn Black/ }),
    ).toBeTruthy();
  });

  it("warns on an unknown SW number (US9.3)", async () => {
    const { user } = renderApp("/visualizer");
    await user.type(
      screen.getByLabelText("Look up a color by SW number"),
      "0000",
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText(/No color found for SW 0000/)).toBeTruthy();
  });

  it("restores a full look from a deep link (US9.3/9.5)", () => {
    renderApp("/visualizer?scene=bedroom&color=6258&lighting=warm");
    expect(
      screen.getByRole("img", {
        name: /Bedroom with the walls painted Tricorn Black/,
      }),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", { name: "Warm" }) as HTMLButtonElement
      ).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("applies a lighting preset (US9.4)", async () => {
    const { user } = renderApp("/visualizer");
    await user.click(screen.getByRole("button", { name: "Cool" }));
    expect(
      screen.getByRole("button", { name: "Cool" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("saves the current look to the palette (US9.5)", async () => {
    const { user } = renderApp("/visualizer?color=6258");
    await user.click(screen.getByRole("button", { name: "Save to palette" }));
    expect(
      await screen.findByText(/Saved Tricorn Black to your palette/),
    ).toBeTruthy();
  });
});
