import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "./harness.js";
import { encodeProjectParam } from "../../utils/projectShare.js";
import type { PaletteProject } from "../../domain/paletteData.js";

const project: PaletteProject = {
  id: "p1",
  name: "Maple St. Remodel",
  entries: [
    { id: "tricorn", note: "Front door", room: "Entry", role: "Accent" },
    { id: "repose", note: "Main walls", room: "Living room" },
  ],
};

describe("Client presentation board — /board (E13)", () => {
  it("renders a branded, read-only board from an E18 project link (US13.1)", async () => {
    const param = await encodeProjectParam(project);
    renderApp(`/board?project=${param}`);

    // Title from the decoded project; no app nav (standalone, chrome-less).
    expect(
      await screen.findByRole("heading", { name: "Maple St. Remodel" }),
    ).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();

    // Colors render with their notes/room + a 60-30-10 role badge.
    const list = screen.getByRole("list");
    const first = within(list).getAllByRole("listitem")[0];
    expect(within(first).getByText("Tricorn Black")).toBeTruthy();
    expect(within(first).getByText("Front door")).toBeTruthy();
    expect(within(first).getByText("Entry")).toBeTruthy();
    expect(within(list).getByText(/Accent · \d+%/)).toBeTruthy();

    // It's a private, link-shared view — keep it out of the index.
    expect(
      document.head.querySelector('meta[name="robots"][content="noindex"]'),
    ).toBeTruthy();
  });

  it("honors a ?title= branding override", async () => {
    const param = await encodeProjectParam(project);
    renderApp(`/board?project=${param}&title=Smith%20Residence`);
    expect(
      await screen.findByRole("heading", { name: "Smith Residence" }),
    ).toBeTruthy();
  });

  it("shows a friendly message for an empty or invalid link", async () => {
    renderApp("/board");
    expect(await screen.findByText(/empty or invalid/i)).toBeTruthy();

    renderApp("/board?project=not-a-valid-param");
    expect(
      (await screen.findAllByText(/empty or invalid/i)).length,
    ).toBeGreaterThan(0);
  });
});
