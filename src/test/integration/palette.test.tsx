import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "./harness.js";

describe("Palette", () => {
  it("adds a color from its tile and lists it on the palette page", async () => {
    const { user } = renderApp();
    await user.click(
      screen.getByRole("button", { name: "Add Naval to palette" }),
    );
    await user.click(screen.getByRole("link", { name: /^Palette/ }));
    expect(screen.getByRole("heading", { name: "My palette" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Naval" })).toBeTruthy();
  });

  it("loads a shared palette from the URL and reorders it", async () => {
    const { user } = renderApp(
      "/palette?c=sw-6258-tricorn-black,sw-7015-repose-gray",
    );
    await user.click(
      screen.getByRole("button", { name: /Load shared palette/ }),
    );

    const list = screen.getByRole("list");
    let rows = within(list).getAllByRole("listitem");
    expect(within(rows[0]).getByText("Tricorn Black")).toBeTruthy();
    expect(within(rows[1]).getByText("Repose Gray")).toBeTruthy();
    // Each non-first row shows its hue relationship to the previous color.
    expect(within(rows[1]).getByText(/from previous/)).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Move Tricorn Black down" }),
    );
    rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(within(rows[0]).getByText("Repose Gray")).toBeTruthy();
  });

  it("supports multiple named palette projects", async () => {
    const { user } = renderApp("/palette?c=sw-6258-tricorn-black");
    await user.click(
      screen.getByRole("button", { name: /Load shared palette/ }),
    );
    expect(screen.getByText("Tricorn Black")).toBeTruthy();

    // Create a second, empty project — it becomes active.
    await user.click(screen.getByRole("button", { name: "New palette" }));
    expect(screen.getByText("This palette is empty.")).toBeTruthy();
    const select = screen.getByLabelText("Select palette") as HTMLSelectElement;
    expect(within(select).getAllByRole("option")).toHaveLength(2);

    // Switching back to the first project shows its colors again.
    await user.selectOptions(select, select.options[0].value);
    expect(screen.getByText("Tricorn Black")).toBeTruthy();
  });

  it("captures a per-color note and preserves it across reorder", async () => {
    const { user } = renderApp(
      "/palette?c=sw-6258-tricorn-black,sw-7015-repose-gray",
    );
    await user.click(
      screen.getByRole("button", { name: /Load shared palette/ }),
    );
    const note = screen.getByLabelText("Note for Tricorn Black");
    await user.type(note, "Front door");
    expect((note as HTMLInputElement).value).toBe("Front door");

    // Reordering reconciles by id, so the note survives.
    await user.click(
      screen.getByRole("button", { name: "Move Tricorn Black down" }),
    );
    expect(
      (screen.getByLabelText("Note for Tricorn Black") as HTMLInputElement)
        .value,
    ).toBe("Front door");
  });
});

describe("Palette intelligence — roles (E11)", () => {
  const loadPalette = async () => {
    const handle = renderApp(
      "/palette?c=sw-7015-repose-gray,sw-6864-cherry-tomato,sw-6218-tradewind",
    );
    await handle.user.click(
      screen.getByRole("button", { name: /Load shared palette/ }),
    );
    return handle;
  };

  it("assigns 60-30-10 role badges across the palette", async () => {
    await loadPalette();
    // The calm neutral becomes Dominant; the colorful one becomes the Accent.
    expect(screen.getByText(/Dominant · \d+%/)).toBeTruthy();
    expect(screen.getByText(/Accent · \d+%/)).toBeTruthy();
  });

  it("lets a user override a color's role", async () => {
    const { user } = await loadPalette();
    const row = screen
      .getByRole("link", { name: "Repose Gray" })
      .closest("li") as HTMLElement;
    expect(within(row).getByText(/Dominant · /)).toBeTruthy();
    await user.selectOptions(
      within(row).getByLabelText("Role for Repose Gray"),
      "Accent",
    );
    expect(within(row).getByText(/Accent · /)).toBeTruthy();
  });

  it("no longer offers a JSON export (PDF/PNG remain)", async () => {
    await loadPalette();
    expect(screen.queryByRole("button", { name: "Export JSON" })).toBeNull();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export PNG" })).toBeTruthy();
  });
});

describe("Palette intelligence — companions (E11)", () => {
  it("suggests companions on demand and adds one to the palette", async () => {
    const { user } = renderApp(
      "/palette?c=sw-7015-repose-gray,sw-6864-cherry-tomato",
    );
    await user.click(
      screen.getByRole("button", { name: /Load shared palette/ }),
    );

    await user.click(
      screen.getByRole("button", { name: "Suggest companions" }),
    );
    const addButtons = screen.getAllByRole("button", {
      name: /^Add .+ to palette$/,
    });
    expect(addButtons.length).toBeGreaterThan(0);

    await user.click(addButtons[0]);
    expect(await screen.findByText(/Added .+ to palette/)).toBeTruthy();
  });
});
