import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FavoritesProvider, useFavorites } from "./FavoritesContext.js";
import { HiddenProvider, useHidden } from "./HiddenContext.js";
import { AppProviders } from "./AppProviders.js";
import { useToast } from "../components/Toast/Toast.js";
import { useConfirmDialog } from "../components/ConfirmDialog/ConfirmDialog.js";

// These tests validate the architectural decision to keep state in SEPARATE
// contexts rather than one combined context: a change to one slice must not
// re-render consumers of another slice.

let favRenders = 0;
let hiddenRenders = 0;

function FavConsumer() {
  favRenders++;
  const { favorites, toggleFavorite } = useFavorites();
  return (
    <button onClick={() => toggleFavorite("c1")}>fav:{favorites.size}</button>
  );
}

function HiddenConsumer() {
  hiddenRenders++;
  const { hidden, toggleHidden } = useHidden();
  return (
    <button onClick={() => toggleHidden("c1")}>hidden:{hidden.size}</button>
  );
}

// `children` is created once by the test render, so its element references are
// stable — exactly the condition under which React can bail out of re-rendering
// a non-subscribed sibling. This mirrors how AppProviders wraps the real tree.
function Tree() {
  return (
    <FavoritesProvider>
      <HiddenProvider>
        <FavConsumer />
        <HiddenConsumer />
      </HiddenProvider>
    </FavoritesProvider>
  );
}

beforeEach(() => {
  favRenders = 0;
  hiddenRenders = 0;
});

describe("context isolation", () => {
  it("renders each consumer once on mount", () => {
    render(<Tree />);
    expect(favRenders).toBe(1);
    expect(hiddenRenders).toBe(1);
  });

  it("a hidden change re-renders ONLY the hidden consumer", () => {
    render(<Tree />);

    fireEvent.click(screen.getByText(/^hidden:/));

    expect(hiddenRenders).toBe(2); // updated
    expect(favRenders).toBe(1); // untouched — proves the split pays off
    expect(screen.getByText("hidden:1")).toBeTruthy();
  });

  it("a favorites change re-renders ONLY the favorites consumer", () => {
    render(<Tree />);

    fireEvent.click(screen.getByText(/^fav:/));

    expect(favRenders).toBe(2); // updated
    expect(hiddenRenders).toBe(1); // untouched
    expect(screen.getByText("fav:1")).toBeTruthy();
  });
});

describe("AppProviders", () => {
  it("makes every context available to descendants", () => {
    function AllConsumers() {
      // Throws if any provider is missing — the assertion is "does not throw".
      useFavorites();
      useHidden();
      useToast();
      useConfirmDialog();
      return <div>ok</div>;
    }

    render(
      <AppProviders>
        <AllConsumers />
      </AppProviders>,
    );

    expect(screen.getByText("ok")).toBeTruthy();
  });
});
