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
 * renders the persistent chrome (header, compare tray) around the routed page.
 */
export function RootLayout() {
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
