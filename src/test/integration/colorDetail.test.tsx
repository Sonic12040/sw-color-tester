import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "./harness.js";

describe("Color detail", () => {
  it("opens a canonical color page from a slug", () => {
    renderApp("/colors/sw-6258-tricorn-black");
    expect(screen.getByRole("heading", { name: "Tricorn Black" })).toBeTruthy();
    expect(screen.getByText(/SW 6258/)).toBeTruthy();
  });

  it("leads with a plain-language summary and tucks specs under a disclosure", () => {
    renderApp("/colors/sw-6258-tricorn-black");
    expect(screen.getByText(/is a deep neutral shade/)).toBeTruthy();
    expect(screen.getByText("Technical details")).toBeTruthy();
  });

  it("offers a 'Get this color' panel with store code, links, and a calculator", () => {
    renderApp("/colors/sw-6258-tricorn-black");
    expect(
      screen.getByRole("heading", { name: "Get this color" }),
    ).toBeTruthy();
    expect(screen.getByText("194-C1")).toBeTruthy(); // in-store rack code
    expect(
      screen.getByRole("link", { name: /Find a Sherwin-Williams store/ }),
    ).toBeTruthy();
    expect(screen.getByText("Paint calculator")).toBeTruthy();
    expect(screen.getByText(/buy/)).toBeTruthy();
    expect(screen.getByLabelText("Length")).toBeTruthy();
  });

  it("shows a not-found page for an unknown slug", () => {
    renderApp("/colors/sw-9999-nope");
    expect(screen.getByRole("heading", { name: /not found/i })).toBeTruthy();
  });

  it("marks the not-found page noindex (soft-404 mitigation)", () => {
    renderApp("/colors/sw-9999-nope");
    const meta = document.head.querySelector('meta[name="robots"]');
    expect(meta?.getAttribute("content")).toBe("noindex");
  });

  it("copies the hex code and store location with feedback", async () => {
    const { user } = renderApp("/colors/sw-6258-tricorn-black");
    await user.click(screen.getByRole("button", { name: "Copy Code" }));
    expect(await screen.findByText("Copied #2F2F30")).toBeTruthy();
    // user-event provides a working clipboard stub in jsdom.
    expect(await navigator.clipboard.readText()).toBe("#2F2F30");
    await user.click(
      screen.getByRole("button", { name: /Copy store location/ }),
    );
    expect(
      await screen.findByText("Copied store location 194-C1"),
    ).toBeTruthy();
  });
});

describe("Color schemes (E11)", () => {
  it("generates a scheme from a colorful color and adds it to the palette", async () => {
    const { user } = renderApp("/colors/sw-6864-cherry-tomato");
    expect(screen.getByRole("heading", { name: "Color schemes" })).toBeTruthy();
    // Real catalog tiles render for a saturated base.
    expect(
      screen.getAllByRole("button", { name: /^View / }).length,
    ).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: "Add all to palette" }),
    );
    expect(await screen.findByText(/Added \d+ to palette/)).toBeTruthy();
  });

  it("explains that hue schemes don't apply to a near-neutral base", () => {
    renderApp("/colors/sw-6258-tricorn-black");
    expect(screen.getByRole("heading", { name: "Color schemes" })).toBeTruthy();
    expect(screen.getByText(/hue-based schemes don.t apply/)).toBeTruthy();
  });
});
