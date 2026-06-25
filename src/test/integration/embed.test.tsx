import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "./harness.js";

describe("Embeddable widget — /embed (E14)", () => {
  it("renders a read-only palette with UTM-tagged back-links, no app chrome", () => {
    renderApp("/embed?c=sw-6258-tricorn-black,sw-7015-repose-gray");
    // No site header/nav inside the embed (it lives outside RootLayout).
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();

    const link = screen.getByRole("link", { name: /Tricorn Black/ });
    expect(link.getAttribute("href")).toContain(
      "/colors/sw-6258-tricorn-black/",
    );
    expect(link.getAttribute("href")).toContain("utm_source=embed");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("link", { name: /Repose Gray/ })).toBeTruthy();
  });

  it("is noindexed and themable", () => {
    renderApp("/embed?c=sw-6258-tricorn-black&theme=dark");
    expect(
      document.head.querySelector('meta[name="robots"][content="noindex"]'),
    ).toBeTruthy();
    // The widget root carries the dark theme.
    const widget = screen
      .getByRole("link", { name: /Tricorn Black/ })
      .closest("[data-theme]") as HTMLElement;
    expect(widget.getAttribute("data-theme")).toBe("dark");
  });
});

describe("Embed builder — /embed-builder (E14)", () => {
  it("previews the preset colors and copies an iframe snippet (US14.2)", async () => {
    const { user } = renderApp(
      "/embed-builder?c=sw-6258-tricorn-black,sw-7015-repose-gray",
    );
    const preview = screen
      .getByRole("region", { name: "Live preview" })
      .closest("section") as HTMLElement;
    expect(within(preview).getByText("Tricorn Black")).toBeTruthy();
    expect(within(preview).getByText("Repose Gray")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Copy snippet" }));
    expect(await screen.findByText(/Embed snippet copied/)).toBeTruthy();
    const copied = await navigator.clipboard.readText();
    expect(copied).toMatch(/<iframe /);
    expect(copied).toContain("/embed?c=");
  });

  it("switches to a single swatch (US14.1)", async () => {
    const { user } = renderApp(
      "/embed-builder?c=sw-6258-tricorn-black,sw-7015-repose-gray",
    );
    await user.click(screen.getByRole("button", { name: "Single swatch" }));
    const preview = screen
      .getByRole("region", { name: "Live preview" })
      .closest("section") as HTMLElement;
    expect(within(preview).getByText("Tricorn Black")).toBeTruthy();
    expect(within(preview).queryByText("Repose Gray")).toBeNull();
  });

  it("prompts when there are no colors to embed", () => {
    renderApp("/embed-builder");
    expect(screen.getByText("No colors to embed yet.")).toBeTruthy();
  });
});
