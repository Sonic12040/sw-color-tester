import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "./harness.js";

/** The empty-state card (role=status) that contains the given headline. */
const emptyCard = (headline: string) => {
  const card = screen.getByText(headline).closest('[role="status"]');
  expect(card).not.toBeNull();
  return card as HTMLElement;
};

describe("Empty states", () => {
  it("gallery: shows the shared empty card (as a status region) when nothing matches", async () => {
    const { user } = renderApp();
    await user.type(screen.getByLabelText("Search colors"), "zzzzzzz");
    const card = emptyCard("No colors match your filters");
    // Headline reads as a heading, not body copy.
    expect(within(card).getByRole("heading", { level: 2 })).toBeTruthy();
    expect(
      within(card).getByRole("button", { name: "Clear all filters" }),
    ).toBeTruthy();
  });

  it("compare: shows an accessible empty card with a browse CTA", () => {
    renderApp("/compare");
    const card = emptyCard("No colors selected to compare yet.");
    expect(within(card).getByRole("heading", { level: 2 })).toBeTruthy();
    expect(
      within(card).getByRole("link", { name: "Browse colors" }),
    ).toBeTruthy();
  });

  it("palette: hides export/clear actions while empty but keeps the projects toolbar", () => {
    renderApp("/palette");
    const card = emptyCard("This palette is empty.");
    expect(within(card).getByRole("heading", { level: 2 })).toBeTruthy();
    // Dead chrome (export/share/clear) is hidden, not shown disabled...
    expect(screen.queryByRole("button", { name: "Export PDF" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    // ...but the projects controls still work on an empty palette.
    expect(screen.getByLabelText("Select palette")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New palette" })).toBeTruthy();
  });
});
