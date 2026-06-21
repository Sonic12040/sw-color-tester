import { vi } from "vitest";
vi.mock("../../data/palette.js", async () => ({
  colorData: (await import("../fixtures.js")).TEST_COLORS,
}));

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "./harness.js";

describe("Compare", () => {
  const addTwoAndOpen = async (user: ReturnType<typeof renderApp>["user"]) => {
    await user.click(
      screen.getByRole("button", { name: "Add Cherry Tomato to comparison" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Add Naval to comparison" }),
    );
    await user.click(screen.getByRole("link", { name: /^Compare/ }));
  };

  it("adds colors and lists them on the compare page", async () => {
    const { user } = renderApp();
    await addTwoAndOpen(user);
    expect(
      screen.getByRole("heading", { name: "Compare colors" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cherry Tomato" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Naval" })).toBeTruthy();
  });

  it("shows a pairwise contrast matrix for 2+ colors", async () => {
    const { user } = renderApp();
    await addTwoAndOpen(user);
    expect(
      screen.getByRole("heading", { name: "Contrast pairings" }),
    ).toBeTruthy();
    expect(screen.getAllByText(/:1$/).length).toBeGreaterThan(0);
  });
});
