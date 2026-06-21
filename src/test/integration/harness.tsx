import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../../routes.js";

/**
 * Render the full routed app at a path, returning a `user` (user-event) handle
 * alongside the usual render result. Each integration spec mocks
 * `../../data/palette.js` with the shared fixtures (vi.mock is per-file/hoisted),
 * so this stays mock-agnostic.
 */
export function renderApp(initialPath = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return {
    user: userEvent.setup(),
    ...render(<RouterProvider router={router} />),
  };
}

/** Names of the cards in DOM order (via each tile's detail link). */
export const cardOrder = (): (string | undefined)[] =>
  screen
    .getAllByRole("link", { name: /See color details/ })
    .map((el) =>
      el
        .getAttribute("aria-label")
        ?.replace(/^See color details and pairings for /, ""),
    );
