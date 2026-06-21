import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "./harness.js";

describe("Accessibility landmarks", () => {
  it("exposes an h1, a skip link to #main-content, and a single main", () => {
    renderApp();
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /skip to colors/i })
        .getAttribute("href"),
    ).toBe("#main-content");
    const mains = document.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    expect(mains[0].id).toBe("main-content");
  });
});

describe("Route announcer", () => {
  it("announces the new page title after navigation", async () => {
    const { user } = renderApp();
    await user.click(
      screen.getAllByRole("link", { name: /See color details/ })[0],
    );
    expect(await screen.findByText(/^Navigated to .+/)).toBeTruthy();
  });
});

describe("Header icons match the color-tile icons", () => {
  // Distinctive sub-paths from the shared glyphs (icons/Icons). If the header
  // and tile ever stop sharing a component, one of these lookups breaks.
  const SCALES_BASE = "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2";
  const PALETTE_BODY =
    "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3 0 5.5-2.5 5.5-5.5C21.5 6 17.5 2 12 2z";

  const hasPath = (el: Element | null, d: string) =>
    el?.querySelector(`path[d="${d}"]`) != null;

  it("renders the scales Compare glyph in both the nav and on tiles", () => {
    renderApp();
    const navLink = screen.getByRole("link", { name: /^Compare/ });
    const tileBtn = screen.getAllByRole("button", {
      name: /to comparison$/,
    })[0];
    expect(hasPath(navLink, SCALES_BASE)).toBe(true);
    expect(hasPath(tileBtn, SCALES_BASE)).toBe(true);
  });

  it("renders the same Palette glyph in both the nav and on tiles", () => {
    renderApp();
    const navLink = screen.getByRole("link", { name: /^Palette/ });
    const tileBtn = screen.getAllByRole("button", {
      name: /to palette$/,
    })[0];
    expect(hasPath(navLink, PALETTE_BODY)).toBe(true);
    expect(hasPath(tileBtn, PALETTE_BODY)).toBe(true);
  });
});
