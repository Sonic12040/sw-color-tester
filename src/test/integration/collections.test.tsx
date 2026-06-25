import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "./harness.js";

// Collections are derived from the fixtures' brandedCollectionNames:
//   "Coastal Cool"  → Naval, Tradewind
//   "Timeless Color" → Repose Gray, Accessible Beige
//   "Designer Color Collection - Pottery" → excluded (designer collection)

describe("Editorial collections (E12) — from dataset branded names", () => {
  it("lists branded collections on the index, excluding designer ones (US12.3)", () => {
    renderApp("/collections");
    expect(
      screen.getByRole("heading", { name: "Color collections" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Coastal Cool/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Timeless Color/ })).toBeTruthy();
    // Designer collections are surfaced separately ("Designer Pick"), not here.
    expect(screen.queryByText(/Designer Color Collection/)).toBeNull();
  });

  it("renders a collection landing page with its colors as links (US12.1)", () => {
    renderApp("/collections/timeless-color");
    expect(
      screen.getByRole("heading", { name: "Timeless Color" }),
    ).toBeTruthy();
    // Blurb is generated from the grouped colors.
    expect(
      screen.getByText(/2 Sherwin-Williams paint colors in the Timeless Color/),
    ).toBeTruthy();
    const repose = screen.getByRole("link", { name: /Repose Gray/ });
    expect(repose.getAttribute("href")).toMatch(
      /\/colors\/sw-7015-repose-gray$/,
    );
    expect(screen.getByRole("link", { name: /Accessible Beige/ })).toBeTruthy();
  });

  it("emits ItemList JSON-LD for a collection (US12.1)", () => {
    const { container } = renderApp("/collections/coastal-cool");
    const ld = container.querySelector(
      'script[type="application/ld+json"]',
    ) as HTMLScriptElement;
    const data = JSON.parse(ld.textContent ?? "{}");
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.mainEntity["@type"]).toBe("ItemList");
    expect(data.mainEntity.numberOfItems).toBe(2);
  });

  it("404s an unknown collection slug", () => {
    renderApp("/collections/nope");
    expect(screen.getByText(/not found/i)).toBeTruthy();
  });

  it("cross-links a color page back to the collections it's in (US12.3)", () => {
    renderApp("/colors/sw-7015-repose-gray");
    const featured = screen
      .getByRole("heading", { name: "Featured in" })
      .closest("section") as HTMLElement;
    const link = within(featured).getByRole("link", { name: "Timeless Color" });
    expect(link.getAttribute("href")).toMatch(/\/collections\/timeless-color$/);
  });

  it("offers a Collections entry in the primary nav", () => {
    renderApp("/");
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: /Collections/ })).toBeTruthy();
  });
});
