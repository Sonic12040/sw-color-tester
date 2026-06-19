import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { Color } from "../../data/types.js";
import { ColorCard, type ColorCardProps } from "./ColorCard.js";

function make(over: Partial<Color>): Color {
  return {
    id: "x",
    name: "Tricorn Black",
    colorNumber: "6258",
    brandKey: "SW",
    hex: "#2f2f30",
    red: 47,
    green: 47,
    blue: 48,
    hue: 0,
    saturation: 0.8,
    lightness: 0.5,
    lrv: 50,
    isDark: false,
    isInterior: false,
    isExterior: false,
    colorFamilyNames: ["Red"],
    brandedCollectionNames: [],
    similarColors: [],
    description: [],
    ...over,
  };
}

const noop = () => {};

function renderCard(over: Partial<ColorCardProps> = {}) {
  const props: ColorCardProps = {
    color: make({}),
    isFavorite: false,
    isHidden: false,
    isComparing: false,
    inPalette: false,
    isDesignerPick: false,
    compareDisabled: false,
    onToggleFavorite: noop,
    onToggleHidden: noop,
    onToggleCompare: noop,
    onTogglePalette: noop,
    ...over,
  };
  return render(
    <MemoryRouter>
      <ColorCard {...props} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("ColorCard badges", () => {
  it("shows the Designer Pick badge only for designer picks", () => {
    renderCard({ isDesignerPick: true });
    expect(screen.getByText("Designer Pick")).toBeTruthy();
  });

  it("shows Interior Only when interior-only", () => {
    renderCard({ color: make({ isInterior: true, isExterior: false }) });
    expect(screen.getByText("Interior Only")).toBeTruthy();
    expect(screen.queryByText("Exterior Only")).toBeNull();
  });

  it("shows Exterior Only when exterior-only", () => {
    renderCard({ color: make({ isInterior: false, isExterior: true }) });
    expect(screen.getByText("Exterior Only")).toBeTruthy();
    expect(screen.queryByText("Interior Only")).toBeNull();
  });

  it("shows no use badge when both interior and exterior", () => {
    renderCard({ color: make({ isInterior: true, isExterior: true }) });
    expect(screen.queryByText("Interior Only")).toBeNull();
    expect(screen.queryByText("Exterior Only")).toBeNull();
  });
});

describe("ColorCard content", () => {
  it("shows the lightness band + undertone chips, without the SW number", () => {
    renderCard({ color: make({ lrv: 50, hue: 0, saturation: 0.8 }) });
    expect(screen.getByText("Medium")).toBeTruthy(); // LRV band
    expect(screen.getByText("Warm")).toBeTruthy(); // undertone
    expect(screen.queryByText(/SW\s*6258/)).toBeNull(); // number removed from tile
  });

  it("links the tile to the canonical color page", () => {
    renderCard();
    const link = screen.getByRole("link", { name: /See color details/ });
    expect(link.getAttribute("href")).toBe("/colors/sw-6258-tricorn-black");
  });
});

describe("ColorCard action states", () => {
  it("reflects active toggles via aria-pressed + action labels", () => {
    renderCard({
      isFavorite: true,
      inPalette: true,
      isComparing: true,
      isHidden: true,
    });
    expect(
      screen
        .getByRole("button", { name: /Unfavorite/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /Remove .* from palette/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /Remove .* from comparison/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: /Unhide/ })).toBeTruthy();
  });

  it("disables compare when the tray is full and this color isn't selected", () => {
    renderCard({ compareDisabled: true, isComparing: false });
    expect(
      (
        screen.getByRole("button", {
          name: /Add .* to comparison/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
