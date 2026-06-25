import type { RouteObject } from "react-router";
import { RootLayout } from "./components/RootLayout.js";
import { GalleryPage } from "./pages/GalleryPage.js";
import { ColorDetailPage } from "./pages/ColorDetailPage.js";
import { ComparePage } from "./pages/ComparePage.js";
import { PalettePage } from "./pages/PalettePage.js";
import { CollectionsIndexPage } from "./pages/CollectionsIndexPage.js";
import { CollectionPage } from "./pages/CollectionPage.js";
import { VisualizerPage } from "./pages/VisualizerPage.js";
import { EmbedBuilderPage } from "./pages/EmbedBuilderPage.js";
import { EmbedPage } from "./pages/EmbedPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";

/** Single route tree shared by the browser router and the SSG static handler. */
export const routes: RouteObject[] = [
  // Standalone embed (E14) — rendered WITHOUT the app chrome so it sits cleanly
  // inside a partner's iframe.
  { path: "/embed", element: <EmbedPage /> },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <GalleryPage /> },
      { path: "colors/:slug", element: <ColorDetailPage /> },
      { path: "compare", element: <ComparePage /> },
      { path: "palette", element: <PalettePage /> },
      { path: "collections", element: <CollectionsIndexPage /> },
      { path: "collections/:slug", element: <CollectionPage /> },
      { path: "visualizer", element: <VisualizerPage /> },
      { path: "embed-builder", element: <EmbedBuilderPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
