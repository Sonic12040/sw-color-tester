import { vi } from "vitest";
// Realistic shared palette (true rgb/hsl/lab) — see src/test/fixtures.ts.
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { STORAGE_KEYS } from "../../utils/storage.js";
import { renderApp, cardOrder } from "./harness.js";

describe("Atlas browse", () => {
  it("renders every active color in one grid with a live count", () => {
    renderApp();
    expect(screen.getByText("8 of 8")).toBeTruthy();
    expect(screen.getByText("Tricorn Black")).toBeTruthy();
    expect(screen.getByText("Cherry Tomato")).toBeTruthy();
    expect(screen.queryByText("Archived One")).toBeNull();
  });

  it("filters by search query", async () => {
    const { user } = renderApp();
    await user.type(screen.getByLabelText("Search colors"), "naval");
    expect(screen.getByText("1 of 8")).toBeTruthy();
    expect(screen.getByText("Naval")).toBeTruthy();
  });

  it("filters by color-family facet", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("checkbox", { name: "Blue" }));
    expect(screen.getByText("2 of 8")).toBeTruthy();
    expect(screen.getByText("Naval")).toBeTruthy();
    expect(screen.queryByText("Cherry Tomato")).toBeNull();
  });

  it("filters by lightness band", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("checkbox", { name: /Light/ }));
    expect(screen.getByText("1 of 8")).toBeTruthy();
    expect(screen.getByText("Forsythia")).toBeTruthy();
  });

  it("filters by undertone facet", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("checkbox", { name: "Cool" }));
    expect(screen.getByText("3 of 8")).toBeTruthy();
    expect(screen.getByText("Naval")).toBeTruthy();
    expect(screen.queryByText("Cherry Tomato")).toBeNull();
  });

  it("reorders results when the sort changes", async () => {
    const { user } = renderApp();
    await user.selectOptions(screen.getByLabelText("Sort colors"), "name");
    expect(cardOrder()[0]).toBe("Accessible Beige");
  });
});

describe("Anti-flash for the prerendered sort order", () => {
  // The gallery is prerendered with the DEFAULT sort; an inline script in
  // index.html hides that grid (via `html[data-presort] [data-color-grid]`) when
  // a non-default sort is persisted, and AtlasLayout reveals it after re-sorting.
  // jsdom can't reproduce the pre-JS static paint, so we test the observable
  // contract here; the inline script's presence is asserted in indexShell.test.ts.
  const grid = () => document.querySelector("[data-color-grid]");

  it("marks the grid with the data-color-grid hook the inline CSS targets", () => {
    renderApp();
    expect(grid()).not.toBeNull();
  });

  it("applies the persisted sort and clears the hide flag (reveals the grid)", () => {
    // Simulate what the index.html inline script does before paint.
    localStorage.setItem(STORAGE_KEYS.sort, JSON.stringify("name"));
    document.documentElement.dataset.presort = "name";

    renderApp();

    // The stored sort is applied (not the default "family")...
    expect(cardOrder()[0]).toBe("Accessible Beige");
    // ...and the flag is cleared so the grid is no longer hidden.
    expect(document.documentElement.dataset.presort).toBeUndefined();
  });

  it("leaves a default-sort load untouched (no hide flag, no flash)", () => {
    renderApp();
    expect(document.documentElement.dataset.presort).toBeUndefined();
    expect(grid()).not.toBeNull();
  });
});

describe("Neutrality", () => {
  it("filters by neutrality band", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("checkbox", { name: /High/ }));
    expect(screen.getByText("3 of 8")).toBeTruthy(); // the 3 neutrals
    expect(screen.getByText("Tricorn Black")).toBeTruthy();
    expect(screen.queryByText("Cherry Tomato")).toBeNull();
  });

  it("sorts most neutral / most colorful first", async () => {
    const { user } = renderApp();
    const sort = screen.getByLabelText("Sort colors");
    await user.selectOptions(sort, "neutral-high");
    expect(cardOrder()[0]).toBe("Tricorn Black");
    await user.selectOptions(sort, "neutral-low");
    expect(cardOrder()[0]).toBe("Forsythia");
  });
});

describe("Hidden + favorites views", () => {
  it("hides a color from the default view and surfaces it under Hidden", async () => {
    const { user } = renderApp();
    await user.click(
      screen.getByRole("button", { name: "Hide Cherry Tomato" }),
    );
    expect(screen.getByText("7 of 8")).toBeTruthy();
    expect(screen.queryByText("Cherry Tomato")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Hidden" }));
    expect(screen.getByText("1 of 8")).toBeTruthy();
    expect(screen.getByText("Cherry Tomato")).toBeTruthy();
  });

  it("favorites a color and shows it under the Favorites view", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Favorite Naval" }));
    await user.click(screen.getByRole("button", { name: "Favorites" }));
    expect(screen.getByText("1 of 8")).toBeTruthy();
    expect(screen.getByText("Naval")).toBeTruthy();
  });
});
