import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./styles/global.css";
import { routes } from "./routes.js";
import { BASENAME } from "./utils/base.js";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary.js";

const router = createBrowserRouter(routes, { basename: BASENAME });

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

const app = (
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>
);

// Prerendered color pages ship server-rendered markup → hydrate it.
// Non-prerendered routes (and `vite dev`) ship an empty #root → mount fresh.
if (root.childElementCount > 0) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
