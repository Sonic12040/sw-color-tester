import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { TIMING } from "./utils/config.js";

// ── Deterministic palette ────────────────────────────────────────────────────
const { COLORS } = vi.hoisted(() => {
  const make = (over: {
    id: string;
    name: string;
    colorNumber: string;
    lrv: number;
    family: string;
    hue?: number;
    saturation?: number;
  }) => ({
    id: over.id,
    name: over.name,
    colorNumber: over.colorNumber,
    brandKey: "SW",
    hex: "#888888",
    red: 136,
    green: 136,
    blue: 136,
    hue: over.hue ?? 0,
    saturation: over.saturation ?? 0,
    lightness: 0.5,
    lrv: over.lrv,
    isDark: false,
    isInterior: true,
    isExterior: false,
    colorFamilyNames: [over.family],
    brandedCollectionNames: [],
    similarColors: [],
    description: [],
  });

  const COLORS = [
    make({
      id: "r1",
      name: "Crimson",
      colorNumber: "1001",
      lrv: 10,
      family: "Red",
      hue: 0.0,
      saturation: 0.8,
    }),
    make({
      id: "r2",
      name: "Scarlet",
      colorNumber: "1002",
      lrv: 50,
      family: "Red",
      hue: 0.02,
      saturation: 0.8,
    }),
    make({
      id: "r3",
      name: "Ruby",
      colorNumber: "1003",
      lrv: 90,
      family: "Red",
      hue: 0.99,
      saturation: 0.8,
    }),
    make({
      id: "b1",
      name: "Azure",
      colorNumber: "2001",
      lrv: 20,
      family: "Blue",
      hue: 0.6,
      saturation: 0.8,
    }),
    make({
      id: "b2",
      name: "Cobalt",
      colorNumber: "2002",
      lrv: 55,
      family: "Blue",
      hue: 0.62,
      saturation: 0.8,
    }),
    make({
      id: "b3",
      name: "Navy",
      colorNumber: "2003",
      lrv: 85,
      family: "Blue",
      hue: 0.64,
      saturation: 0.8,
    }),
  ];
  return { COLORS };
});

vi.mock("./data/palette.js", () => ({ colorData: COLORS }));

// Imported after the mock is registered (vi.mock is hoisted).
import { routes } from "./routes.js";

function renderApp(initialPath = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const cardNames = () =>
  screen
    .getAllByText(/^(Crimson|Scarlet|Ruby|Azure|Cobalt|Navy)$/)
    .map((el) => el.textContent);

describe("Atlas browse", () => {
  it("renders every color in one grid with a live count", () => {
    renderApp();
    expect(screen.getByText("6 of 6")).toBeTruthy();
    expect(cardNames().sort()).toEqual([
      "Azure",
      "Cobalt",
      "Crimson",
      "Navy",
      "Ruby",
      "Scarlet",
    ]);
  });

  it("filters by search query", () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Search colors"), {
      target: { value: "crim" },
    });
    expect(screen.getByText("1 of 6")).toBeTruthy();
    expect(screen.getByText("Crimson")).toBeTruthy();
    expect(screen.queryByText("Azure")).toBeNull();
  });

  it("filters by color-family facet", () => {
    renderApp();
    fireEvent.click(screen.getByRole("checkbox", { name: "Blue" }));
    expect(screen.getByText("3 of 6")).toBeTruthy();
    expect(screen.getByText("Azure")).toBeTruthy();
    expect(screen.queryByText("Crimson")).toBeNull();
  });

  it("narrows results with the LRV minimum slider", () => {
    renderApp();
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("Minimum LRV value"), {
      target: { value: "30" },
    });
    act(() => vi.advanceTimersByTime(TIMING.LRV_DEBOUNCE_MS));
    vi.useRealTimers();
    // Crimson (10) and Azure (20) drop out.
    expect(screen.getByText("4 of 6")).toBeTruthy();
    expect(screen.queryByText("Crimson")).toBeNull();
  });
});

describe("Favorites view", () => {
  it("favorites a color and shows it under the Favorites view", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Favorite Crimson" }));
    fireEvent.click(screen.getByRole("button", { name: "Favorites" }));
    expect(screen.getByText("1 of 6")).toBeTruthy();
    expect(screen.getByText("Crimson")).toBeTruthy();
    expect(screen.queryByText("Azure")).toBeNull();
  });
});

describe("Color detail navigation", () => {
  it("opens a canonical color page from a card link", () => {
    renderApp("/colors/sw-1001-crimson");
    expect(screen.getByRole("heading", { name: "Crimson" })).toBeTruthy();
    expect(screen.getByText(/SW 1001/)).toBeTruthy();
  });

  it("shows a not-found page for an unknown color", () => {
    renderApp("/colors/sw-9999-nope");
    expect(screen.getByRole("heading", { name: /not found/i })).toBeTruthy();
  });
});

describe("Compare", () => {
  it("adds colors to comparison and lists them on the compare page", () => {
    renderApp();
    fireEvent.click(
      screen.getByRole("button", { name: "Add Crimson to comparison" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add Azure to comparison" }),
    );
    // Toolbar compare link reflects the count.
    fireEvent.click(screen.getByRole("link", { name: /Open comparison/ }));
    expect(
      screen.getByRole("heading", { name: "Compare colors" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Crimson" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Azure" })).toBeTruthy();
  });
});
