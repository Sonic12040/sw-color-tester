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

describe("Project lenses — Board ↔ Work Order (US15.3)", () => {
  const loadTwo = async () => {
    const handle = renderApp(
      "/palette?c=sw-6258-tricorn-black,sw-7015-repose-gray",
    );
    await handle.user.click(
      screen.getByRole("button", { name: /Load shared palette/ }),
    );
    return handle;
  };

  it("switches the same project to the Work Order lens", async () => {
    const { user } = await loadTwo();
    // Board lens shows the 60-30-10 role controls…
    expect(screen.getByLabelText("Role for Tricorn Black")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Work Order" }));

    // …the Work Order lens drops the designer controls for the painter's job
    // structure: a fresh project has no rooms, so it prompts to add one and the
    // PDF export is disabled until there's something to spec.
    expect(screen.queryByLabelText("Role for Tricorn Black")).toBeNull();
    expect(screen.getByRole("button", { name: "Add room" })).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Export work order PDF",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("persists the lens preference across navigation", async () => {
    const { user } = await loadTwo();
    await user.click(screen.getByRole("button", { name: "Work Order" }));

    // Leave the palette and come back — the Work Order lens is still active.
    await user.click(screen.getByRole("link", { name: /^Browse/ }));
    await user.click(screen.getByRole("link", { name: /^Palette/ }));
    expect(
      (
        screen.getByRole("button", { name: "Work Order" }) as HTMLButtonElement
      ).getAttribute("aria-pressed"),
    ).toBe("true");
  });
});

describe("Work Order — rooms × surfaces (US16.1)", () => {
  const openWorkOrder = async () => {
    const handle = renderApp(
      "/palette?c=sw-6258-tricorn-black,sw-7015-repose-gray",
    );
    await handle.user.click(
      screen.getByRole("button", { name: /Load shared palette/ }),
    );
    await handle.user.click(screen.getByRole("button", { name: "Work Order" }));
    return handle;
  };

  it("adds a room with a surface assigned a color, finish, and area", async () => {
    const { user } = await openWorkOrder();
    await user.click(screen.getByRole("button", { name: "Add room" }));
    await user.click(screen.getByRole("button", { name: "Add surface" }));

    // Assign one of the palette's colors, a finish, and a measured area.
    await user.selectOptions(
      screen.getByLabelText(/^Color for/),
      screen.getByRole("option", { name: /Tricorn Black/ }),
    );
    await user.selectOptions(screen.getByLabelText(/^Finish for/), "Satin");
    await user.type(screen.getByLabelText(/^Area for/), "200");

    // The assigned color links out, the room totals its area + paint estimate,
    // and the PDF export is now enabled.
    expect(
      screen.getByRole("link", { name: /View Tricorn Black/ }),
    ).toBeTruthy();
    // 200 sq ft × 2 coats / 350 = 1.1 gal → 2 cans.
    expect(
      screen.getByText(/1 surface · 200 sq ft · ≈ 1\.1 gal · 2 cans/),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Export work order PDF",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("summarizes paint quantities per color across rooms (US16.2)", async () => {
    const { user } = await openWorkOrder();
    await user.click(screen.getByRole("button", { name: "Add room" }));
    await user.click(screen.getByRole("button", { name: "Add surface" }));
    await user.selectOptions(
      screen.getByLabelText(/^Color for/),
      screen.getByRole("option", { name: /Tricorn Black/ }),
    );
    await user.type(screen.getByLabelText(/^Area for/), "700");

    // 700 sq ft × 2 coats / 350 = 4 gal → 4 cans, surfaced in the by-color panel.
    const summary = screen
      .getByRole("region", { name: "Paint by color" })
      .closest("section") as HTMLElement;
    expect(within(summary).getByText(/Tricorn Black/)).toBeTruthy();
    expect(within(summary).getByText(/≈ 4 gal · 4 cans/)).toBeTruthy();
  });

  it("computes a surface's area from L×W×H dimensions", async () => {
    const { user } = await openWorkOrder();
    await user.click(screen.getByRole("button", { name: "Add room" }));
    await user.click(screen.getByRole("button", { name: "Add surface" }));

    await user.click(screen.getByText("Measure by L×W×H"));
    await user.type(screen.getByLabelText(/^Length for/), "10");
    await user.type(screen.getByLabelText(/^Width for/), "10");
    await user.type(screen.getByLabelText(/^Height for/), "8");

    // 2×(10+10)×8 = 320 sq ft, and the manual area input reflects it (disabled).
    const area = screen.getByLabelText(/^Area for/) as HTMLInputElement;
    expect(area.value).toBe("320");
    expect(area.disabled).toBe(true);
    expect(screen.getByText(/1 surface · 320 sq ft/)).toBeTruthy();
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
