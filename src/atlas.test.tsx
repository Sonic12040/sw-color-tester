import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

// Realistic shared palette (true rgb/hsl/lab) — see src/test/fixtures.ts.
vi.mock("./data/palette.js", async () => ({
  colorData: (await import("./test/fixtures.js")).TEST_COLORS,
}));

// Imported after the mock is registered (vi.mock is hoisted).
import { routes } from "./routes.js";

function renderApp(initialPath = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return render(<RouterProvider router={router} />);
}

/** Names of the cards in DOM order (via each tile's detail link). */
const cardOrder = () =>
  screen
    .getAllByRole("link", { name: /See color details/ })
    .map((el) =>
      el
        .getAttribute("aria-label")
        ?.replace(/^See color details and pairings for /, ""),
    );

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Atlas browse", () => {
  it("renders every active color in one grid with a live count", () => {
    renderApp();
    expect(screen.getByText("8 of 8")).toBeTruthy();
    expect(screen.getByText("Tricorn Black")).toBeTruthy();
    expect(screen.getByText("Cherry Tomato")).toBeTruthy();
    expect(screen.queryByText("Archived One")).toBeNull();
  });

  it("filters by search query", () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Search colors"), {
      target: { value: "naval" },
    });
    expect(screen.getByText("1 of 8")).toBeTruthy();
    expect(screen.getByText("Naval")).toBeTruthy();
  });

  it("filters by color-family facet", () => {
    renderApp();
    fireEvent.click(screen.getByRole("checkbox", { name: "Blue" }));
    expect(screen.getByText("2 of 8")).toBeTruthy();
    expect(screen.getByText("Naval")).toBeTruthy();
    expect(screen.queryByText("Cherry Tomato")).toBeNull();
  });

  it("filters by lightness band", () => {
    renderApp();
    fireEvent.click(screen.getByRole("checkbox", { name: /Light/ }));
    expect(screen.getByText("1 of 8")).toBeTruthy();
    expect(screen.getByText("Forsythia")).toBeTruthy();
  });

  it("filters by undertone facet", () => {
    renderApp();
    fireEvent.click(screen.getByRole("checkbox", { name: "Cool" }));
    expect(screen.getByText("3 of 8")).toBeTruthy();
    expect(screen.getByText("Naval")).toBeTruthy();
    expect(screen.queryByText("Cherry Tomato")).toBeNull();
  });

  it("reorders results when the sort changes", () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Sort colors"), {
      target: { value: "name" },
    });
    expect(cardOrder()[0]).toBe("Accessible Beige");
  });
});

describe("Neutrality", () => {
  it("filters by neutrality band", () => {
    renderApp();
    fireEvent.click(screen.getByRole("checkbox", { name: /High/ }));
    expect(screen.getByText("3 of 8")).toBeTruthy(); // the 3 neutrals
    expect(screen.getByText("Tricorn Black")).toBeTruthy();
    expect(screen.queryByText("Cherry Tomato")).toBeNull();
  });

  it("sorts most neutral / most colorful first", () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Sort colors"), {
      target: { value: "neutral-high" },
    });
    expect(cardOrder()[0]).toBe("Tricorn Black");
    fireEvent.change(screen.getByLabelText("Sort colors"), {
      target: { value: "neutral-low" },
    });
    expect(cardOrder()[0]).toBe("Forsythia");
  });
});

describe("Hidden + favorites views", () => {
  it("hides a color from the default view and surfaces it under Hidden", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Hide Cherry Tomato" }));
    expect(screen.getByText("7 of 8")).toBeTruthy();
    expect(screen.queryByText("Cherry Tomato")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Hidden" }));
    expect(screen.getByText("1 of 8")).toBeTruthy();
    expect(screen.getByText("Cherry Tomato")).toBeTruthy();
  });

  it("favorites a color and shows it under the Favorites view", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Favorite Naval" }));
    fireEvent.click(screen.getByRole("button", { name: "Favorites" }));
    expect(screen.getByText("1 of 8")).toBeTruthy();
    expect(screen.getByText("Naval")).toBeTruthy();
  });
});

describe("Accessibility landmarks", () => {
  it("exposes an h1, a skip link to #main-content, and a single main", () => {
    renderApp();
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /skip to colors/i })
        .getAttribute("href"),
    ).toBe("#main-content");
    const mains = document.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    expect(mains[0].id).toBe("main-content");
  });
});

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
    // Calculator computes a default estimate.
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
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderApp("/colors/sw-6258-tricorn-black");
    fireEvent.click(screen.getByRole("button", { name: "Copy Code" }));
    expect(await screen.findByText("Copied #2F2F30")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith("#2F2F30");
    fireEvent.click(
      screen.getByRole("button", { name: /Copy store location/ }),
    );
    expect(
      await screen.findByText("Copied store location 194-C1"),
    ).toBeTruthy();
  });
});

describe("Route announcer", () => {
  it("announces the new page title after navigation", async () => {
    renderApp();
    fireEvent.click(
      screen.getAllByRole("link", { name: /See color details/ })[0],
    );
    expect(await screen.findByText(/^Navigated to .+/)).toBeTruthy();
  });
});

describe("Compare", () => {
  it("adds colors and lists them on the compare page", () => {
    renderApp();
    fireEvent.click(
      screen.getByRole("button", { name: "Add Cherry Tomato to comparison" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add Naval to comparison" }),
    );
    fireEvent.click(screen.getByRole("link", { name: /^Compare/ }));
    expect(
      screen.getByRole("heading", { name: "Compare colors" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cherry Tomato" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Naval" })).toBeTruthy();
  });

  it("shows a pairwise contrast matrix for 2+ colors", () => {
    renderApp();
    fireEvent.click(
      screen.getByRole("button", { name: "Add Cherry Tomato to comparison" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add Naval to comparison" }),
    );
    fireEvent.click(screen.getByRole("link", { name: /^Compare/ }));
    expect(
      screen.getByRole("heading", { name: "Contrast pairings" }),
    ).toBeTruthy();
    expect(screen.getAllByText(/:1$/).length).toBeGreaterThan(0);
  });
});

describe("Palette", () => {
  it("adds a color from its tile and lists it on the palette page", () => {
    renderApp();
    fireEvent.click(
      screen.getByRole("button", { name: "Add Naval to palette" }),
    );
    fireEvent.click(screen.getByRole("link", { name: /^Palette/ }));
    expect(screen.getByRole("heading", { name: "My palette" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Naval" })).toBeTruthy();
  });

  it("loads a shared palette from the URL and reorders it", () => {
    renderApp("/palette?c=sw-6258-tricorn-black,sw-7015-repose-gray");
    fireEvent.click(
      screen.getByRole("button", { name: /Load shared palette/ }),
    );

    const list = screen.getByRole("list");
    let rows = within(list).getAllByRole("listitem");
    expect(within(rows[0]).getByText("Tricorn Black")).toBeTruthy();
    expect(within(rows[1]).getByText("Repose Gray")).toBeTruthy();
    // Each non-first row shows its hue relationship to the previous color.
    expect(within(rows[1]).getByText(/from previous/)).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Move Tricorn Black down" }),
    );
    rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(within(rows[0]).getByText("Repose Gray")).toBeTruthy();
  });

  it("supports multiple named palette projects", () => {
    renderApp("/palette?c=sw-6258-tricorn-black");
    fireEvent.click(
      screen.getByRole("button", { name: /Load shared palette/ }),
    );
    expect(screen.getByText("Tricorn Black")).toBeTruthy();

    // Create a second, empty project — it becomes active.
    fireEvent.click(screen.getByRole("button", { name: "New palette" }));
    expect(screen.getByText("This palette is empty.")).toBeTruthy();
    const select = screen.getByLabelText("Select palette") as HTMLSelectElement;
    expect(within(select).getAllByRole("option")).toHaveLength(2);

    // Switching back to the first project shows its colors again.
    fireEvent.change(select, { target: { value: select.options[0].value } });
    expect(screen.getByText("Tricorn Black")).toBeTruthy();
  });

  it("captures a per-color note and preserves it across reorder", () => {
    renderApp("/palette?c=sw-6258-tricorn-black,sw-7015-repose-gray");
    fireEvent.click(
      screen.getByRole("button", { name: /Load shared palette/ }),
    );
    const note = screen.getByLabelText(
      "Note for Tricorn Black",
    ) as HTMLInputElement;
    fireEvent.change(note, { target: { value: "Front door" } });
    expect(
      (screen.getByLabelText("Note for Tricorn Black") as HTMLInputElement)
        .value,
    ).toBe("Front door");

    // Reordering reconciles by id, so the note survives.
    fireEvent.click(
      screen.getByRole("button", { name: "Move Tricorn Black down" }),
    );
    expect(
      (screen.getByLabelText("Note for Tricorn Black") as HTMLInputElement)
        .value,
    ).toBe("Front door");
  });
});
