import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { TIMING } from "./utils/config.js";

// ── Deterministic palette ─────────────────────────────────────────────────────
// A tiny, fully-controlled color set so journeys assert on known names/LRVs
// instead of the real 1k+ color dataset.
const { COLORS } = vi.hoisted(() => {
  const make = (over: {
    id: string;
    name: string;
    colorNumber: string;
    lrv: number;
    family: string;
  }) => ({
    id: over.id,
    name: over.name,
    colorNumber: over.colorNumber,
    brandKey: "SW",
    hex: "#888888",
    red: 136,
    green: 136,
    blue: 136,
    hue: 0,
    saturation: 0,
    lightness: 0.5,
    lrv: over.lrv,
    isDark: false,
    isInterior: false,
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
    }),
    make({
      id: "r2",
      name: "Scarlet",
      colorNumber: "1002",
      lrv: 50,
      family: "Red",
    }),
    make({
      id: "r3",
      name: "Ruby",
      colorNumber: "1003",
      lrv: 90,
      family: "Red",
    }),
    make({
      id: "b1",
      name: "Azure",
      colorNumber: "2001",
      lrv: 20,
      family: "Blue",
    }),
    make({
      id: "b2",
      name: "Cobalt",
      colorNumber: "2002",
      lrv: 55,
      family: "Blue",
    }),
    make({
      id: "b3",
      name: "Navy",
      colorNumber: "2003",
      lrv: 85,
      family: "Blue",
    }),
  ];
  return { COLORS };
});

vi.mock("./data/palette.js", () => ({ colorData: COLORS }));

// App is imported after the mock is registered (vi.mock is hoisted above imports).
import { App } from "./App.js";

// ── Helpers — interact the way a user would ──────────────────────────────────
const RED = /^Red \(/;
const BLUE = /^Blue \(/;
const FAVORITES = /^Favorites/;
const HIDDEN = /^Hidden Colors/;

/** Expand an accordion / open the toolbar by clicking its header button. */
function clickButton(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

/** Get the open accordion region by its (header) name. */
function region(name: RegExp) {
  return screen.getByRole("region", { name });
}

/** Confirm the open ConfirmDialog and let its close animation resolve. */
async function confirmDialog(confirmName: string) {
  const dialog = screen.getByRole("dialog");
  vi.useFakeTimers();
  fireEvent.click(within(dialog).getByRole("button", { name: confirmName }));
  // ConfirmDialog resolves its promise after a short close animation.
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
  vi.useRealTimers();
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Single-color journeys ────────────────────────────────────────────────────

describe("Favoriting and unfavoriting a color", () => {
  it("favorites a color, moving it into the auto-opened Favorites section", () => {
    render(<App />);
    clickButton(RED); // expand the Red family

    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Favorite Crimson" }),
    );

    // Crimson left its family and now lives under Favorites.
    expect(within(region(RED)).queryByText("Crimson")).toBeNull();
    expect(within(region(FAVORITES)).getByText("Crimson")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Red \(2\)/ })).toBeTruthy();
  });

  it("unfavorites a color, returning it to its family", () => {
    render(<App />);
    clickButton(RED);
    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Favorite Crimson" }),
    );

    // Now undo it from the Favorites section.
    fireEvent.click(
      within(region(FAVORITES)).getByRole("button", {
        name: "Unfavorite Crimson",
      }),
    );

    expect(within(region(FAVORITES)).queryByText("Crimson")).toBeNull();
    expect(within(region(RED)).getByText("Crimson")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Red \(3\)/ })).toBeTruthy();
  });
});

describe("Hiding and unhiding a color", () => {
  it("hides a color, removing it from its family", () => {
    render(<App />);
    clickButton(RED);

    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Hide Crimson" }),
    );

    expect(within(region(RED)).queryByText("Crimson")).toBeNull();
    expect(screen.getByRole("button", { name: /^Red \(2\)/ })).toBeTruthy();
  });

  it("unhides a color from the Hidden section", () => {
    render(<App />);
    clickButton(RED);
    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Hide Crimson" }),
    );

    // Open the Hidden section and toggle Crimson back to visible.
    clickButton(HIDDEN);
    fireEvent.click(
      within(region(HIDDEN)).getByRole("button", { name: "Hide Crimson" }),
    );

    expect(within(region(HIDDEN)).queryByText("Crimson")).toBeNull();
    expect(within(region(RED)).getByText("Crimson")).toBeTruthy();
  });
});

// ── Bulk journeys ────────────────────────────────────────────────────────────

describe("Bulk actions", () => {
  it("favorites all colors in a family", () => {
    render(<App />);
    clickButton(RED);

    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Favorite All" }),
    );

    // The whole Red family moved to Favorites; the family section is gone.
    expect(screen.queryByRole("button", { name: RED })).toBeNull();
    const favs = region(FAVORITES);
    for (const name of ["Crimson", "Scarlet", "Ruby"]) {
      expect(within(favs).getByText(name)).toBeTruthy();
    }
    expect(screen.getByText("Favorited 3 Red colors")).toBeTruthy();
  });

  it("hides all colors in a family", () => {
    render(<App />);
    clickButton(BLUE);

    fireEvent.click(
      within(region(BLUE)).getByRole("button", { name: "Hide All" }),
    );

    expect(screen.queryByRole("button", { name: BLUE })).toBeNull();
    expect(screen.getByText("Hid 3 Blue colors")).toBeTruthy();
  });
});

// ── Toast undo journeys ──────────────────────────────────────────────────────

describe("Undo via the toast action", () => {
  it("undoes a bulk favorite", () => {
    render(<App />);
    clickButton(RED);
    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Favorite All" }),
    );
    expect(screen.queryByRole("button", { name: RED })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    // The Red family is restored and Favorites is empty again.
    expect(screen.getByRole("button", { name: /^Red \(3\)/ })).toBeTruthy();
    expect(within(region(FAVORITES)).queryByText("Crimson")).toBeNull();
  });

  it("undoes a bulk hide", () => {
    render(<App />);
    clickButton(BLUE);
    fireEvent.click(
      within(region(BLUE)).getByRole("button", { name: "Hide All" }),
    );
    expect(screen.queryByRole("button", { name: BLUE })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByRole("button", { name: /^Blue \(3\)/ })).toBeTruthy();
  });
});

// ── Toast lifetime ───────────────────────────────────────────────────────────

describe("Toast lifetime", () => {
  it("auto-dismisses after its duration elapses", () => {
    render(<App />);
    clickButton(RED);

    vi.useFakeTimers();
    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Favorite All" }),
    );
    expect(screen.getByText("Favorited 3 Red colors")).toBeTruthy();

    // Visible duration, then the 300ms exit animation before removal.
    act(() => vi.advanceTimersByTime(TIMING.TOAST_DURATION_MS));
    act(() => vi.advanceTimersByTime(TIMING.CLOSE_ANIMATION_MS));

    expect(screen.queryByText("Favorited 3 Red colors")).toBeNull();
  });
});

// ── Toolbar "Clear all" actions ──────────────────────────────────────────────

describe("Clearing all from the toolbar", () => {
  it("disables both clear buttons when nothing is favorited or hidden", () => {
    render(<App />);
    clickButton(/Toggle menu/);

    expect(
      (
        screen.getByRole("button", {
          name: "Clear All Favorites",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Clear All Hidden Colors",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("enables Clear All Hidden once a color is hidden", () => {
    render(<App />);
    clickButton(RED);
    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Hide Crimson" }),
    );

    clickButton(/Toggle menu/);
    expect(
      (
        screen.getByRole("button", {
          name: "Clear All Hidden Colors",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("clears all favorites after confirmation, returning colors to their families", async () => {
    render(<App />);
    clickButton(RED);
    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Favorite Crimson" }),
    );
    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Favorite Scarlet" }),
    );
    expect(within(region(FAVORITES)).getByText("Crimson")).toBeTruthy();

    clickButton(/Toggle menu/);
    fireEvent.click(
      screen.getByRole("button", { name: "Clear All Favorites" }),
    );

    // A confirmation dialog gates the destructive action.
    await confirmDialog("Clear favorites");

    expect(within(region(FAVORITES)).queryByText("Crimson")).toBeNull();
    expect(within(region(FAVORITES)).queryByText("Scarlet")).toBeNull();
    expect(screen.getByRole("button", { name: /^Red \(3\)/ })).toBeTruthy();
  });

  it("keeps favorites when the confirmation is cancelled", async () => {
    render(<App />);
    clickButton(RED);
    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Favorite Crimson" }),
    );

    clickButton(/Toggle menu/);
    fireEvent.click(
      screen.getByRole("button", { name: "Clear All Favorites" }),
    );
    await confirmDialog("Cancel");

    expect(within(region(FAVORITES)).getByText("Crimson")).toBeTruthy();
  });

  it("clears all hidden colors after confirmation, returning colors to their families", async () => {
    render(<App />);
    clickButton(RED);
    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Hide Crimson" }),
    );
    fireEvent.click(
      within(region(RED)).getByRole("button", { name: "Hide Scarlet" }),
    );
    // Two of three Red colors are now hidden.
    expect(screen.getByRole("button", { name: /^Red \(1\)/ })).toBeTruthy();

    clickButton(/Toggle menu/);
    fireEvent.click(
      screen.getByRole("button", { name: "Clear All Hidden Colors" }),
    );
    await confirmDialog("Clear hidden");

    expect(screen.getByRole("button", { name: /^Red \(3\)/ })).toBeTruthy();
  });
});

// ── LRV filter ───────────────────────────────────────────────────────────────
// LRV now lives in React state (FiltersContext), so it resets with each fresh
// render — no cross-test cleanup needed.

describe("LRV filter", () => {
  function setSlider(name: string, value: number) {
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole("slider", { name }), {
      target: { value: String(value) },
    });
    act(() => vi.advanceTimersByTime(TIMING.LRV_DEBOUNCE_MS));
    vi.useRealTimers();
  }

  it("increasing the minimum hides colors below it", () => {
    render(<App />);
    clickButton(/Toggle menu/);
    clickButton(RED);
    expect(within(region(RED)).getByText("Crimson")).toBeTruthy(); // lrv 10

    setSlider("Minimum LRV value", 30);

    // Crimson (10) and Azure (20) drop out; 4 of 6 remain.
    expect(screen.getByText(/Showing 4 of 6 colors/)).toBeTruthy();
    expect(within(region(RED)).queryByText("Crimson")).toBeNull();
    expect(within(region(RED)).getByText("Scarlet")).toBeTruthy(); // lrv 50
  });

  it("decreasing the maximum hides colors above it", () => {
    render(<App />);
    clickButton(/Toggle menu/);
    clickButton(RED);
    expect(within(region(RED)).getByText("Ruby")).toBeTruthy(); // lrv 90

    setSlider("Maximum LRV value", 70);

    // Ruby (90) and Navy (85) drop out; 4 of 6 remain.
    expect(screen.getByText(/Showing 4 of 6 colors/)).toBeTruthy();
    expect(within(region(RED)).queryByText("Ruby")).toBeNull();
    expect(within(region(RED)).getByText("Scarlet")).toBeTruthy(); // lrv 50
  });
});
