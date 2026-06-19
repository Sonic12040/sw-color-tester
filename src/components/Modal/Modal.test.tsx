import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { TIMING } from "../../utils/config.js";

// ── Deterministic palette with coordinating + similar relationships ───────────
const { COLORS } = vi.hoisted(() => {
  const make = (over: {
    id: string;
    name: string;
    colorNumber: string;
    family: string;
    hue: number;
    saturation: number;
    lightness: number;
    lrv: number;
    hex: string;
    red: number;
    green: number;
    blue: number;
    isInterior?: boolean;
    isExterior?: boolean;
    description?: string[];
    brandedCollectionNames?: string[];
    coordinatingColors?: {
      coord1ColorId?: string;
      coord2ColorId?: string;
      whiteColorId?: string;
    };
    similarColors?: string[];
  }) => ({
    id: over.id,
    name: over.name,
    colorNumber: over.colorNumber,
    brandKey: "SW",
    hex: over.hex,
    red: over.red,
    green: over.green,
    blue: over.blue,
    hue: over.hue,
    saturation: over.saturation,
    lightness: over.lightness,
    lrv: over.lrv,
    isDark: over.lightness < 0.4,
    isInterior: over.isInterior ?? false,
    isExterior: over.isExterior ?? false,
    colorFamilyNames: [over.family],
    brandedCollectionNames: over.brandedCollectionNames ?? [],
    similarColors: over.similarColors ?? [],
    description: over.description ?? [],
    coordinatingColors: over.coordinatingColors,
  });

  const COLORS = [
    make({
      id: "r1",
      name: "Crimson",
      colorNumber: "1001",
      family: "Red",
      hue: 0.99,
      saturation: 0.8,
      lightness: 0.4,
      lrv: 10,
      hex: "#dc143c",
      red: 220,
      green: 20,
      blue: 60,
      isInterior: true,
      description: ["Bold", "Dramatic"],
      brandedCollectionNames: ["Designer Color Collection - Classic"],
      coordinatingColors: { coord1ColorId: "b1", coord2ColorId: "b2" },
      similarColors: ["r2", "r3"],
    }),
    make({
      id: "r2",
      name: "Scarlet",
      colorNumber: "1002",
      family: "Red",
      hue: 0.02,
      saturation: 0.85,
      lightness: 0.5,
      lrv: 50,
      hex: "#ff2400",
      red: 255,
      green: 36,
      blue: 0,
    }),
    make({
      id: "r3",
      name: "Ruby",
      colorNumber: "1003",
      family: "Red",
      hue: 0.97,
      saturation: 0.7,
      lightness: 0.3,
      lrv: 25,
      hex: "#9b111e",
      red: 155,
      green: 17,
      blue: 30,
    }),
    make({
      id: "b1",
      name: "Azure",
      colorNumber: "2001",
      family: "Blue",
      hue: 0.55,
      saturation: 0.9,
      lightness: 0.6,
      lrv: 45,
      hex: "#007fff",
      red: 0,
      green: 127,
      blue: 255,
    }),
    make({
      id: "b2",
      name: "Cobalt",
      colorNumber: "2002",
      family: "Blue",
      hue: 0.6,
      saturation: 0.8,
      lightness: 0.4,
      lrv: 30,
      hex: "#0047ab",
      red: 0,
      green: 71,
      blue: 171,
    }),
    make({
      id: "b3",
      name: "Navy",
      colorNumber: "2003",
      family: "Blue",
      hue: 0.62,
      saturation: 0.7,
      lightness: 0.2,
      lrv: 12,
      hex: "#000080",
      red: 0,
      green: 0,
      blue: 128,
    }),
  ];
  return { COLORS };
});

vi.mock("../../data/palette.js", () => ({ colorData: COLORS }));

import { App } from "../../App.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const RED = /^Red \(/;

/** Expand the Red family and return the "View Details" button for a color. */
function viewButtonFor(name: string) {
  fireEvent.click(screen.getByRole("button", { name: RED }));
  return within(screen.getByRole("region", { name: RED })).getByRole("button", {
    name: new RegExp(`See color details.*${name}`),
  });
}

function openModalFor(name: string) {
  const trigger = viewButtonFor(name);
  fireEvent.click(trigger);
  return trigger;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Modal", () => {
  it("opens when a color's details are viewed", () => {
    render(<App />);
    expect(screen.queryByRole("dialog")).toBeNull();

    openModalFor("Crimson");

    // The dialog is labelled by the color name and shows its pairings.
    const dialog = screen.getByRole("dialog", { name: "Crimson" });
    expect(within(dialog).getByText("Coordinating Colors")).toBeTruthy();
    expect(within(dialog).getByText("Similar Colors")).toBeTruthy();
  });

  it("returns focus to the element that opened it when closed", () => {
    render(<App />);
    const trigger = viewButtonFor("Crimson");
    trigger.focus(); // user tabbed to it before activating
    fireEvent.click(trigger);

    // Move focus into the modal, as a user navigating the dialog would.
    const closeBtn = screen.getByRole("button", { name: "Close modal" });
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    vi.useFakeTimers();
    fireEvent.click(closeBtn);
    act(() => vi.advanceTimersByTime(TIMING.CLOSE_ANIMATION_MS));
    vi.useRealTimers();

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("moves focus into the dialog when opened", () => {
    render(<App />);
    openModalFor("Crimson");

    const dialog = screen.getByRole("dialog", { name: "Crimson" });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("traps Tab focus within the dialog", () => {
    render(<App />);
    openModalFor("Crimson");

    const dialog = screen.getByRole("dialog", { name: "Crimson" });
    const buttons = within(dialog).getAllByRole("button");
    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    // Tab off the last focusable wraps back to the first.
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    // Shift+Tab off the first focusable wraps to the last.
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("navigates to a coordinating color when its tile is clicked", () => {
    render(<App />);
    openModalFor("Crimson");

    const dialog = screen.getByRole("dialog", { name: "Crimson" });
    // Azure is Crimson's first coordinating color.
    fireEvent.click(within(dialog).getByRole("button", { name: "View Azure" }));

    expect(screen.getByRole("dialog", { name: "Azure" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Crimson" })).toBeNull();
  });

  it("navigates to a similar color when its tile is clicked", () => {
    render(<App />);
    openModalFor("Crimson");

    const dialog = screen.getByRole("dialog", { name: "Crimson" });
    // Scarlet is one of Crimson's similar colors.
    fireEvent.click(
      within(dialog).getByRole("button", { name: "View Scarlet" }),
    );

    expect(screen.getByRole("dialog", { name: "Scarlet" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Crimson" })).toBeNull();
  });

  it("displays the expected data for a color", () => {
    render(<App />);
    openModalFor("Crimson");

    expect(screen.getByRole("dialog", { name: "Crimson" })).toMatchSnapshot();
  });
});
