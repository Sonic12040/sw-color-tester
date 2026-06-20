import { useEffect } from "react";
import { Outlet } from "react-router";
import { AppContext, type AppContextValue } from "../context/AppContext.js";
import { AppProviders } from "../context/AppProviders.js";
import { colorModel } from "../appModel.js";
import { Header } from "./Header/Header.js";
import { CompareTray } from "./Workspace/CompareTray.js";

// Stable AppContext value — colorModel is a singleton, so this never changes.
const ctxValue: AppContextValue = { colorModel };

/**
 * Root route element: wires up the global state providers + AppContext and
 * renders the persistent chrome (sticky header, compare tray) around the page.
 *
 * Publishes the header's live height to `--header-h` so the sticky search/sort
 * toolbar and the filter rail can offset beneath it without magic numbers —
 * staying correct when the header wraps (small screens / zoom).
 */
export function RootLayout() {
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header || typeof ResizeObserver === "undefined") return;
    const update = () =>
      document.documentElement.style.setProperty(
        "--header-h",
        `${header.offsetHeight}px`,
      );
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  return (
    <AppProviders>
      <AppContext.Provider value={ctxValue}>
        <a className="skip-link" href="#main-content">
          Skip to colors
        </a>
        <Header />
        <main id="main-content">
          <Outlet />
        </main>
        <CompareTray />
      </AppContext.Provider>
    </AppProviders>
  );
}
