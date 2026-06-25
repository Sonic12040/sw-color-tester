import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));
vi.mock("../../data/collections.js", () => ({
  CURATED_COLLECTIONS: [
    {
      slug: "test-neutrals",
      title: "Test Neutrals",
      blurb: "Calm test neutrals that flatter any room and never feel dated.",
      heroNumber: "7015",
      colorNumbers: ["7015", "7036"],
      published: true,
    },
    {
      slug: "test-darks",
      title: "Test Darks",
      blurb: "Deep, dramatic test darks for accent walls and front doors.",
      colorNumbers: ["6258", "6244"],
      published: true,
    },
    {
      slug: "draft-one",
      title: "Draft Collection",
      blurb: "An unpublished draft that should never appear anywhere.",
      colorNumbers: ["6864"],
      published: false,
    },
  ],
}));

import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "./harness.js";

describe("Editorial collections (E12)", () => {
  it("lists published collections on the index, hiding drafts (US12.3)", () => {
    renderApp("/collections");
    expect(
      screen.getByRole("heading", { name: "Color collections" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Test Neutrals/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Test Darks/ })).toBeTruthy();
    expect(screen.queryByText(/Draft Collection/)).toBeNull();
  });

  it("renders a collection landing page with its colors as links (US12.1)", () => {
    renderApp("/collections/test-neutrals");
    expect(screen.getByRole("heading", { name: "Test Neutrals" })).toBeTruthy();
    expect(screen.getByText(/Calm test neutrals/)).toBeTruthy();
    // The featured colors are real crawlable links to their detail pages.
    const repose = screen.getByRole("link", { name: /Repose Gray/ });
    expect(repose.getAttribute("href")).toMatch(
      /\/colors\/sw-7015-repose-gray$/,
    );
    expect(screen.getByRole("link", { name: /Accessible Beige/ })).toBeTruthy();
  });

  it("emits ItemList JSON-LD for a collection (US12.1)", () => {
    const { container } = renderApp("/collections/test-neutrals");
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
    const link = within(featured).getByRole("link", { name: "Test Neutrals" });
    expect(link.getAttribute("href")).toMatch(/\/collections\/test-neutrals$/);
  });

  it("offers a Collections entry in the primary nav", () => {
    renderApp("/");
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: /Collections/ })).toBeTruthy();
  });
});
