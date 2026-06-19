import { defineConfig } from "vite";
import type { Connect } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const BASE = "/sw-color-tester/";
const BASE_NO_SLASH = BASE.replace(/\/$/, "");

/**
 * Redirect the base path without its trailing slash (e.g. `/sw-color-tester`)
 * to the canonical `/sw-color-tester/` in the dev + preview servers. Without
 * this, Vite's static server answers the no-slash URL with a 404 instead of the
 * app. (On GitHub Pages this redirect is automatic; the generated 404.html in
 * the build is the fallback for other static hosts.)
 */
function baseTrailingSlashRedirect() {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? "";
    if (url === BASE_NO_SLASH || url.startsWith(`${BASE_NO_SLASH}?`)) {
      res.statusCode = 301;
      res.setHeader("Location", BASE + url.slice(BASE_NO_SLASH.length));
      res.end();
      return;
    }
    next();
  };
  return {
    name: "base-trailing-slash-redirect",
    configureServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  base: BASE,
  // Ensure CSS-module imports are transformed in the SSR (prerender) build.
  ssr: {
    noExternal: ["react-router"],
  },
  plugins: [
    baseTrailingSlashRedirect(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // supplied via public/manifest.json
      workbox: {
        // Precache the shell only — NOT the ~2,000 prerendered color pages
        // (which are generated after this step and runtime-cached instead).
        globPatterns: ["**/*.{js,css,svg,png,ico,woff,woff2}"],
        globIgnores: ["**/colors/**/*.html"],
        navigateFallback: null,
        // Visited color pages become available offline after first view.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/sw-color-tester/colors/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "color-pages",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
